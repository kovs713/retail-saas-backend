import { EvotorConfig, EvotorOptions } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import {
  EvotorAccountDto,
  EvotorAdminCloudTokenDto,
  EvotorAdminDashboard,
  EvotorAdminListQueryDto,
  EvotorAdminListResponse,
  EvotorAdminStoreSyncDto,
  EvotorAdminSyncDto,
  EvotorDeviceDto,
  EvotorInboxEventDto,
  EvotorProductDto,
  EvotorStoreDto,
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

interface BridgeListResponse<T> {
  items: T[];
  total: number;
  skip: number;
  take: number;
}

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
  | 'evotorUserId'
  | 'storeId'
  | 'skip'
  | 'take'
  | 'dateFrom'
  | 'dateTo'
  | 'eventType'
>;

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
            evotorUserId: evotorUserId ?? undefined,
          },
        ),
        { method: 'GET' },
        { evotorUserId, retry: true },
      );

      products.push(...response.data.items);
      cursor =
        (response.data.paging as { nextCursor?: string })?.nextCursor ??
        undefined;
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
    const [accounts, stores, devices, inboxEvents] = await Promise.all([
      this.listAdminAccounts({}),
      this.listAdminStores({}),
      this.listAdminDevices({}),
      this.listAdminInboxEvents({}),
    ]);

    return {
      accounts: accounts.items,
      inboxEvents: inboxEvents.items,
      stores: stores.items,
      devices: devices.items,
      products: [],
      documents: [],
    };
  }

  async listAdminAccounts(
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<EvotorAdminListResponse<EvotorAccountDto>> {
    return this.listAdminResource<EvotorAccountDto>('accounts', query);
  }

  async listAdminInboxEvents(
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<EvotorAdminListResponse<EvotorInboxEventDto>> {
    return this.listAdminResource<EvotorInboxEventDto>('inbox-events', query);
  }

  async listAdminStores(
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<EvotorAdminListResponse<EvotorStoreDto>> {
    return this.listAdminResource<EvotorStoreDto>('stores', query);
  }

  async listAdminDevices(
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<EvotorAdminListResponse<EvotorDeviceDto>> {
    return this.listAdminResource<EvotorDeviceDto>('devices', query);
  }

  async listAdminProducts(
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<EvotorAdminListResponse<EvotorProductDto>> {
    return this.listAdminResource<EvotorProductDto>('products', query);
  }

  async listAdminDocuments(
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<EvotorAdminListResponse<unknown>> {
    return this.listAdminResource<unknown>('documents', query);
  }

  async findRawBridgeAccount(
    evotorUserId: string,
  ): Promise<Record<string, unknown> | null> {
    const res = await this.listAdminResource('accounts', {
      evotorUserId,
      take: 1,
      skip: 0,
    });
    return (res.items[0] as Record<string, unknown>) ?? null;
  }

  async findRawBridgeStore(
    evotorUserId: string,
    storeId: string,
  ): Promise<Record<string, unknown> | null> {
    const res = await this.listAdminResource('stores', {
      evotorUserId,
      storeId,
      take: 1,
      skip: 0,
    });
    return (res.items[0] as Record<string, unknown>) ?? null;
  }

  async findRawBridgeDevice(
    evotorUserId: string,
    storeId: string,
    deviceId: string,
  ): Promise<Record<string, unknown> | null> {
    const res = await this.listAdminResource('devices', {
      evotorUserId,
      storeId,
    });
    const items = res.items as Record<string, unknown>[];
    return (
      items.find((d) =>
        ['uuid', 'deviceId', 'device_id', 'id'].some((k) => d[k] === deviceId),
      ) ?? null
    );
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

  // ── private helpers ──────────────────────────────────────

  private async listAdminResource<T>(
    resource: string,
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<EvotorAdminListResponse<T>> {
    const params: Record<string, string | undefined> = {};

    if (query.skip !== undefined) params.skip = String(query.skip);
    if (query.take !== undefined) params.take = String(query.take);
    if (query.evotorUserId) params.evotorUserId = query.evotorUserId;

    // Only pass resource-specific filters
    const storeResources = ['stores', 'devices', 'products', 'documents'];
    const inboxResources = ['inbox-events'];

    if (storeResources.includes(resource)) {
      if (query.storeId) params.storeId = query.storeId;
    }

    if (inboxResources.includes(resource)) {
      if (query.eventType) params.eventType = query.eventType;
      if (query.dateFrom) params.dateFrom = query.dateFrom;
      if (query.dateTo) params.dateTo = query.dateTo;
    }

    const response = await this.request<BridgeListResponse<T>>(
      this.buildPath(`/admin/evotor/${resource}`, params),
      { method: 'GET' },
      { evotorUserId: query.evotorUserId, retry: true },
    );

    return {
      items: Array.isArray(response.items) ? response.items : [],
      total: response.total ?? 0,
      skip: response.skip ?? query.skip ?? 0,
      take: response.take ?? query.take ?? 20,
    };
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
    query: Record<string, string | undefined> = {},
  ): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== '') {
        params.set(key, value);
      }
    }

    const search = params.toString();
    return search ? `${path}?${search}` : path;
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
