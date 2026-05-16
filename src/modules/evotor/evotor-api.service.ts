import { EvotorConfig, EvotorOptions } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import {
  EvotorAdminCloudTokenDto,
  EvotorAdminDashboard,
  EvotorAdminSyncDto,
  RemoteProduct,
  UpsertProduct,
} from './dto';

import {
  HttpException,
  Inject,
  Injectable,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

interface EvotorBridgeEnvelope<T> {
  data: T;
  paging?: {
    nextCursor?: string | null;
  };
  meta?: {
    evotorStatus?: number;
  };
}

type EvotorProductData = RemoteProduct[] | { items?: RemoteProduct[] };

interface RequestOptions {
  evotorUserId?: string | null;
  retry?: boolean;
  timeoutMs?: number;
}

type EvotorAdminResource =
  | 'accounts'
  | 'inbox-events'
  | 'stores'
  | 'devices'
  | 'products'
  | 'documents';

@Injectable()
export class EvotorApiService {
  private readonly logger = new LoggerService(EvotorApiService.name);

  constructor(
    @Inject(EvotorConfig)
    private readonly evotorConfig: EvotorOptions,
  ) {}

  async getProducts(
    storeId: string,
    evotorUserId?: string | null,
  ): Promise<RemoteProduct[]> {
    const products: RemoteProduct[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.request<
        EvotorBridgeEnvelope<EvotorProductData>
      >(
        this.buildPath(
          `/api/evotor/stores/${encodeURIComponent(storeId)}/products`,
          {
            cursor,
            evotorUserId,
          },
        ),
        { method: 'GET' },
        { evotorUserId, retry: true },
      );

      products.push(...this.extractProducts(response.data));
      cursor = response.paging?.nextCursor ?? undefined;
    } while (cursor);

    return products;
  }

  async upsertProducts(
    storeId: string,
    products: UpsertProduct[],
    evotorUserId?: string | null,
  ): Promise<void> {
    await this.request(
      this.buildPath(
        `/api/evotor/stores/${encodeURIComponent(storeId)}/products/bulk`,
        {
          evotorUserId,
        },
      ),
      {
        method: 'POST',
        body: JSON.stringify(products),
      },
      { evotorUserId, retry: true },
    );
  }

  async getAdminDashboard(): Promise<EvotorAdminDashboard> {
    const [accounts, inboxEvents, stores, devices, products, documents] =
      await Promise.all([
        this.listAdminAccounts(),
        this.listAdminInboxEvents(),
        this.listAdminStores(),
        this.listAdminDevices(),
        this.listAdminProducts(),
        this.listAdminDocuments(),
      ]);

    return {
      accounts,
      inboxEvents,
      stores,
      devices,
      products,
      documents,
    };
  }

  async listAdminAccounts(): Promise<unknown[]> {
    return this.listAdminResource('accounts');
  }

  async listAdminInboxEvents(): Promise<unknown[]> {
    return this.listAdminResource('inbox-events');
  }

  async listAdminStores(): Promise<unknown[]> {
    return this.listAdminResource('stores');
  }

  async listAdminDevices(): Promise<unknown[]> {
    return this.listAdminResource('devices');
  }

  async listAdminProducts(): Promise<unknown[]> {
    return this.listAdminResource('products');
  }

  async listAdminDocuments(): Promise<unknown[]> {
    return this.listAdminResource('documents');
  }

  async syncAdmin(payload: EvotorAdminSyncDto): Promise<unknown> {
    return this.request(
      '/admin/evotor/sync',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      {
        evotorUserId: payload.evotorUserId,
        timeoutMs: Math.max(this.evotorConfig.timeoutMs, 30000),
      },
    );
  }

  async setAdminCloudToken(
    payload: EvotorAdminCloudTokenDto,
  ): Promise<unknown> {
    return this.request(
      '/admin/evotor/cloud-token',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { evotorUserId: payload.evotorUserId },
    );
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    options: RequestOptions = {},
  ): Promise<T> {
    const attempts = options.retry ? 3 : 1;
    const method = init.method ?? 'GET';
    const requestId = randomUUID();
    const timeoutMs = options.timeoutMs ?? this.evotorConfig.timeoutMs;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(this.buildUrl(path), {
          ...init,
          signal: controller.signal,
          headers: this.buildHeaders(
            init.headers,
            requestId,
            Boolean(init.body),
          ),
        });

        this.logResponse(
          method,
          path,
          response.status,
          options.evotorUserId,
          requestId,
        );

        if (!response.ok) {
          if (this.shouldRetryStatus(response.status) && attempt < attempts) {
            await this.delay(attempt);
            continue;
          }

          throw this.buildError(response.status);
        }

        if (response.status === 204) {
          return undefined as T;
        }

        const text = await response.text();
        return (text ? JSON.parse(text) : undefined) as T;
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }

        if (attempt < attempts) {
          await this.delay(attempt);
          continue;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new RequestTimeoutException('Evotor bridge request timed out');
        }

        throw new ServiceUnavailableException('Evotor bridge request failed');
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new ServiceUnavailableException('Evotor bridge request failed');
  }

  private buildUrl(path: string): string {
    return `${this.evotorConfig.baseUrl.replace(/\/+$/, '')}${path}`;
  }

  private buildPath(
    path: string,
    query: Record<string, string | undefined | null> = {},
  ): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (value) {
        params.set(key, value);
      }
    }

    const search = params.toString();
    return search ? `${path}?${search}` : path;
  }

  private async listAdminResource(
    resource: EvotorAdminResource,
  ): Promise<unknown[]> {
    return this.request<unknown[]>(
      `/admin/evotor/${resource}`,
      { method: 'GET' },
      { retry: true },
    );
  }

  private buildHeaders(
    initHeaders: HeadersInit | undefined,
    requestId: string,
    hasBody: boolean,
  ): Headers {
    const headers = new Headers(initHeaders);

    headers.set('Accept', 'application/json');
    headers.set('Authorization', `Bearer ${this.evotorConfig.adminToken}`);
    headers.set('X-Request-Id', requestId);

    if (hasBody) {
      headers.set('Content-Type', 'application/json');
    }

    return headers;
  }

  private extractProducts(data: EvotorProductData): RemoteProduct[] {
    if (Array.isArray(data)) {
      return data;
    }

    return data.items ?? [];
  }

  private buildError(status: number): HttpException {
    if (status === 401) {
      return new UnauthorizedException('Evotor bridge request unauthorized');
    }

    return new HttpException(
      `Evotor bridge request failed with status ${status}`,
      status,
    );
  }

  private shouldRetryStatus(status: number): boolean {
    return status === 502 || status === 503 || status === 504;
  }

  private async delay(attempt: number): Promise<void> {
    const baseDelayMs = 500;
    const maxDelayMs = 5000;
    const jitterMs = Math.floor(Math.random() * 100);
    const delayMs = Math.min(
      baseDelayMs * 2 ** (attempt - 1) + jitterMs,
      maxDelayMs,
    );

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  private logResponse(
    method: string,
    path: string,
    status: number,
    evotorUserId: string | null | undefined,
    requestId: string,
  ): void {
    this.logger.debug(
      `Evotor bridge ${method} ${path} status=${status} evotorUserId=${evotorUserId ?? 'n/a'} requestId=${requestId}`,
    );
  }
}
