import { EvotorConfig, EvotorOptions } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import {
  EvotorAdminCloudTokenDto,
  EvotorAdminDashboard,
  EvotorAdminListQueryDto,
  EvotorAdminStoreSyncDto,
  EvotorAdminSyncDto,
  EvotorInboxEventDto,
  RemoteProduct,
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
  data: {
    items: T;
    paging?: Record<string, unknown>;
  };
  meta?: {
    evotorStatus?: number;
    rateLimit?: {
      limit?: string;
      remaining?: string;
      reset?: string;
    };
  };
}

export interface EvotorProxyResponse<T> {
  data: {
    items: T;
    paging?: Record<string, unknown>;
  };
  meta?: {
    evotorStatus?: number;
    rateLimit?: {
      limit?: string;
      remaining?: string;
      reset?: string;
    };
  };
}


interface RequestOptions {
  evotorUserId?: string | null;
  retry?: boolean;
  timeoutMs?: number;
}

type EvotorAdminListQuery = Pick<
  EvotorAdminListQueryDto,
  'evotorUserId' | 'storeId' | 'cursor' | 'dateFrom' | 'dateTo' | 'eventType'
>;

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
        EvotorBridgeEnvelope<RemoteProduct[]>
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

      products.push(...response.data.items);
      cursor = (response.data.paging as { nextCursor?: string })?.nextCursor ?? undefined;
    } while (cursor);

    return products;
  }

  async proxyRequest<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    evotorUserId: string,
    query?: Record<string, string | undefined>,
    body?: Record<string, unknown>,
  ): Promise<EvotorBridgeEnvelope<T>> {
    return this.request<EvotorBridgeEnvelope<T>>(
      this.buildPath(path, query ?? {}),
      {
        method,
        body: body ? JSON.stringify(body) : undefined,
      },
      { evotorUserId, retry: method === 'GET' },
    );
  }

  async syncStoreProducts(
    storeId: string,
    payload: EvotorAdminStoreSyncDto,
  ): Promise<unknown> {
    return this.request(
      `/api/evotor/sync/stores/${encodeURIComponent(storeId)}/products`,
      {
        method: 'POST',
        body: JSON.stringify({ evotorUserId: payload.evotorUserId }),
      },
      {
        evotorUserId: payload.evotorUserId,
        timeoutMs: Math.max(this.evotorConfig.timeoutMs, 30000),
      },
    );
  }

  async syncStoreDocuments(
    storeId: string,
    payload: EvotorAdminStoreSyncDto,
  ): Promise<unknown> {
    return this.request(
      `/api/evotor/sync/stores/${encodeURIComponent(storeId)}/documents`,
      {
        method: 'POST',
        body: JSON.stringify({
          evotorUserId: payload.evotorUserId,
          dateFrom: payload.dateFrom,
          dateTo: payload.dateTo,
        }),
      },
      {
        evotorUserId: payload.evotorUserId,
        timeoutMs: Math.max(this.evotorConfig.timeoutMs, 30000),
      },
    );
  }

  async syncStores(payload: EvotorAdminSyncDto): Promise<unknown> {
    return this.request(
      '/api/evotor/sync/stores',
      {
        method: 'POST',
        body: JSON.stringify({ evotorUserId: payload.evotorUserId }),
      },
      {
        evotorUserId: payload.evotorUserId,
        timeoutMs: Math.max(this.evotorConfig.timeoutMs, 30000),
      },
    );
  }

  async getAdminDashboard(): Promise<EvotorAdminDashboard> {
    const [stores, devices, inboxEvents] = await Promise.all([
      this.listAdminStores({}),
      this.listAdminDevices({}),
      this.listAdminInboxEvents({}),
    ]);

    return {
      accounts: [],
      inboxEvents: inboxEvents as EvotorInboxEventDto[],
      stores,
      devices,
      products: [],
      documents: [],
    };
  }

  async listAdminAccounts(
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<unknown[]> {
    return this.listAdminResource('accounts', query);
  }

  async listAdminInboxEvents(
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<unknown[]> {
    return this.listAdminResource('inbox-events', query);
  }

  async listAdminStores(
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<unknown[]> {
    return this.listAdminResource('stores', query);
  }

  async listAdminDevices(
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<unknown[]> {
    return this.listAdminResource('devices', query);
  }

  async listAdminProducts(
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<unknown[]> {
    if (!query.storeId) return [];

    const response = await this.request<EvotorBridgeEnvelope<unknown[]>>(
      this.buildPath(`/api/evotor/stores/${query.storeId}/products`, {
        cursor: query.cursor,
        evotorUserId: query.evotorUserId,
      }),
      { method: 'GET' },
      { evotorUserId: query.evotorUserId, retry: true },
    );

    return Array.isArray(response.data?.items) ? response.data.items : [];
  }

  async listAdminDocuments(
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<unknown[]> {
    if (!query.storeId) return [];

    const response = await this.request<EvotorBridgeEnvelope<unknown[]>>(
      this.buildPath(`/api/evotor/stores/${query.storeId}/documents`, {
        cursor: query.cursor,
        evotorUserId: query.evotorUserId,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      }),
      { method: 'GET' },
      { evotorUserId: query.evotorUserId, retry: true },
    );

    return Array.isArray(response.data?.items) ? response.data.items : [];
  }

  async syncAdmin(payload: EvotorAdminSyncDto): Promise<unknown> {
    return this.request(
      '/api/evotor/sync',
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
      '/api/evotor/cloud-token',
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
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<unknown[]> {
    const isAdminEndpoint = resource === 'inbox-events' || resource === 'stores';
    const path = isAdminEndpoint
      ? `/admin/evotor/${resource}`
      : `/api/evotor/${resource}`;

    if (isAdminEndpoint) {
      const response = await this.request<unknown[]>(
        this.buildPath(path, query as Record<string, string | undefined>),
        { method: 'GET' },
        { evotorUserId: query.evotorUserId, retry: true },
      );
      return Array.isArray(response) ? response : [];
    }

    const response = await this.request<EvotorBridgeEnvelope<unknown[]>>(
      this.buildPath(path, query as Record<string, string | undefined>),
      { method: 'GET' },
      { evotorUserId: query.evotorUserId, retry: true },
    );

    return Array.isArray(response.data?.items) ? response.data.items : [];
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

  private buildError(status: number): HttpException {
    if (status === 401) {
      return new UnauthorizedException('Evotor bridge request unauthorized');
    }

    if (status === 429) {
      return new HttpException('Evotor rate limit exceeded', 429);
    }

    return new HttpException(
      `Evotor bridge request failed with status ${status}`,
      status,
    );
  }

  private shouldRetryStatus(status: number): boolean {
    return status === 429 || status === 502 || status === 503 || status === 504;
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
