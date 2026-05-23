import { EvotorConfig, EvotorOptions } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import {
  EvotorAccountDto,
  EvotorAdminCloudTokenDto,
  EvotorAdminDashboard,
  EvotorAdminDeleteSyncDocumentsQueryDto,
  EvotorAdminDeleteSyncDocumentsResponseDto,
  EvotorAdminListQueryDto,
  EvotorAdminListResponse,
  EvotorAdminSelectorsDto,
  EvotorAdminProcessInboxEventsQueryDto,
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
  paging?: Record<string, unknown>;
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
  | 'storeUuid'
  | 'productId'
  | 'search'
  | 'name'
  | 'code'
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
      const response = await this.request<EvotorBridgeEnvelope<unknown[]>>(
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

      const items = Array.isArray(response.data.items)
        ? response.data.items
        : [];
      products.push(
        ...items
          .map((item) => this.normalizeRemoteProduct(item))
          .filter((item): item is RemoteProduct => item !== null),
      );
      cursor =
        (response.data.paging as { nextCursor?: string } | undefined)
          ?.nextCursor ??
        (response.paging as { nextCursor?: string } | undefined)?.nextCursor ??
        undefined;
    } while (cursor);

    return products;
  }

  async getAdminProducts(
    evotorUserId: string,
    storeId?: string,
  ): Promise<RemoteProduct[]> {
    const products: RemoteProduct[] = [];
    const take = 100;
    let skip = 0;
    let total = 0;

    do {
      const response = await this.listAdminProducts({
        evotorUserId,
        storeId,
        skip,
        take,
      });

      total = response.total;
      products.push(
        ...response.items
          .map((item) => this.normalizeRemoteProduct(item))
          .filter((item): item is RemoteProduct => item !== null),
      );
      skip += response.items.length;
    } while (skip < total && skip > 0);

    return products;
  }

  async getDocuments(
    storeId: string,
    evotorUserId?: string | null,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<unknown[]> {
    const documents: unknown[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.request<EvotorBridgeEnvelope<unknown[]>>(
        this.buildPath(
          `/api/evotor/stores/${encodeURIComponent(storeId)}/documents`,
          {
            cursor,
            evotorUserId: evotorUserId ?? undefined,
            dateFrom,
            dateTo,
          },
        ),
        { method: 'GET' },
        { evotorUserId, retry: true },
      );

      const items = Array.isArray(response.data.items)
        ? response.data.items
        : [];
      documents.push(
        ...items.map((item) => this.normalizeRemoteDocument(item)),
      );
      cursor =
        (response.data.paging as { nextCursor?: string } | undefined)
          ?.nextCursor ??
        (response.paging as { nextCursor?: string } | undefined)?.nextCursor ??
        undefined;
    } while (cursor);

    return documents;
  }

  async getAdminDocuments(
    evotorUserId: string,
    storeId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<unknown[]> {
    const documents: unknown[] = [];
    const take = 100;
    let skip = 0;
    let total = 0;

    do {
      const response = await this.listAdminDocuments({
        evotorUserId,
        dateFrom,
        dateTo,
        skip,
        take,
      });

      total = response.total;

      for (const item of response.items) {
        const event = this.asRecord(item);

        if (storeId && event && !this.recordMatchesStore(event, storeId)) {
          continue;
        }

        documents.push(this.normalizeRemoteDocument(item));
      }

      skip += response.items.length;
    } while (skip < total && skip > 0);

    return documents;
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
    const [accounts, stores, devices, inboxEvents, products, documents] =
      await Promise.all([
        this.listAdminAccounts({}),
        this.listAdminStores({}),
        this.listAdminDevices({}),
        this.listAdminInboxEvents({}),
        this.listAdminProducts({}),
        this.listAdminDocuments({}),
      ]);

    return {
      accounts: accounts.items,
      inboxEvents: inboxEvents.items,
      stores: stores.items,
      devices: devices.items,
      products: products.items,
      documents: documents.items,
    };
  }

  async getAdminSelectors(): Promise<EvotorAdminSelectorsDto> {
    const [accounts, stores] = await Promise.all([
      this.listAllAdminResource<EvotorAccountDto>('accounts'),
      this.listAllAdminResource<EvotorStoreDto>('stores'),
    ]);

    return {
      users: accounts
        .map((account) => {
          const value = this.getEvotorUserId(account);
          return value
            ? {
                value,
                label: account.name ?? account.email ?? value,
              }
            : null;
        })
        .filter((account): account is { value: string; label: string } =>
          Boolean(account),
        ),
      stores: stores
        .map((store) => {
          const value = this.getEvotorStoreId(store);
          return value
            ? {
                value,
                label: store.name ?? store.address ?? value,
                evotorUserId: this.getEvotorUserId(store) ?? undefined,
              }
            : null;
        })
        .filter(
          (
            store,
          ): store is {
            value: string;
            label: string;
            evotorUserId: string | undefined;
          } => Boolean(store),
        ),
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

  async countSellEvents(
    evotorUserId: string,
    storeId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<number> {
    const take = 100;
    let skip = 0;
    let sellCount = 0;

    while (true) {
      const response = await this.listAdminResource<EvotorInboxEventDto>(
        'inbox-events',
        {
          evotorUserId,
          storeId,
          eventType: 'evotor.documents.received',
          dateFrom,
          dateTo,
          skip,
          take,
        },
      );

      if (!response.items.length) break;

      for (const event of response.items) {
        const payload = event.payload as Record<string, unknown> | undefined;
        if (payload?.type === 'SELL') {
          sellCount += 1;
        }
      }

      if (response.items.length < take) break;
      skip += take;
    }

    return sellCount;
  }

  async processAdminInboxEvents(
    query: EvotorAdminProcessInboxEventsQueryDto,
  ): Promise<unknown> {
    return this.request(
      this.buildPath('/admin/evotor/inbox-events/process', {
        evotorUserId: query.evotorUserId,
        take: String(query.take ?? 100),
      }),
      { method: 'POST' },
      {
        evotorUserId: query.evotorUserId,
        timeoutMs: Math.max(this.evotorConfig.timeoutMs, 30000),
      },
    );
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
  ): Promise<EvotorAdminListResponse<EvotorInboxEventDto>> {
    return this.listAdminResource<EvotorInboxEventDto>('inbox-events', {
      ...query,
      eventType: 'evotor.documents.received',
    });
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

  async deleteAdminSyncDocuments(
    query: EvotorAdminDeleteSyncDocumentsQueryDto,
  ): Promise<EvotorAdminDeleteSyncDocumentsResponseDto> {
    return this.request<EvotorAdminDeleteSyncDocumentsResponseDto>(
      this.buildPath('/admin/evotor/sync/documents', {
        evotorUserId: query.evotorUserId,
        storeId: query.storeId,
      }),
      { method: 'DELETE' },
      { evotorUserId: query.evotorUserId },
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

    if (resource === 'products') {
      if (query.storeUuid) params.storeUuid = query.storeUuid;
      if (query.productId) params.productId = query.productId;
      if (query.search) params.search = query.search;
      if (query.name) params.name = query.name;
      if (query.code) params.code = query.code;
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

  private async listAllAdminResource<T>(
    resource: string,
    query: Partial<EvotorAdminListQuery> = {},
  ): Promise<T[]> {
    const items: T[] = [];
    const take = 100;
    let skip = 0;

    while (true) {
      const response = await this.listAdminResource<T>(resource, {
        ...query,
        skip,
        take,
      });

      items.push(...response.items);

      if (items.length >= response.total || response.items.length < take) {
        break;
      }

      skip += response.items.length;
    }

    return items;
  }

  private getEvotorUserId(record: Record<string, unknown>): string | null {
    const evotorUserId = this.pickString(
      [record],
      ['evotorUserId', 'externalUserId', 'userId', 'user_id', 'evotor_user_id'],
    );

    if (evotorUserId) {
      return evotorUserId;
    }

    const id = this.pickString([record], ['id']);
    return id && /^[0-9a-f]{2}-[0-9a-f]{15}$/i.test(id) ? id : null;
  }

  private getEvotorStoreId(record: Record<string, unknown>): string | null {
    return this.pickString(
      [record],
      [
        'externalStoreId',
        'storeUuid',
        'store_uuid',
        'uuid',
        'storeId',
        'store_id',
      ],
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

  private normalizeRemoteProduct(value: unknown): RemoteProduct | null {
    const product = this.asRecord(value);
    if (!product) {
      return null;
    }

    const rawPayload =
      this.asRecord(product.rawPayload) ?? this.asRecord(product.raw_payload);

    const payload = this.asRecord(product.payload);
    const data = this.asRecord(product.data);
    const productNode = this.asRecord(product.product);

    const rawPayloadPayload = this.asRecord(rawPayload?.payload);
    const rawPayloadData = this.asRecord(rawPayload?.data);
    const rawPayloadProduct = this.asRecord(rawPayload?.product);

    const payloadData = this.asRecord(payload?.data);
    const payloadProduct = this.asRecord(payload?.product);

    const dataProduct = this.asRecord(data?.product);

    const records = [
      product,
      rawPayload,
      payload,
      data,
      productNode,
      rawPayloadPayload,
      rawPayloadData,
      rawPayloadProduct,
      payloadData,
      payloadProduct,
      dataProduct,
    ].filter(Boolean);

    const id = this.pickString(records, [
      'productId',
      'id',
      'uuid',
      'product_id',
    ]);

    if (!id) {
      return null;
    }

    const articleNumber =
      this.pickString(records, [
        'article_number',
        'articleNumber',
        'article',
        'code',
        'sku',
      ]) ?? id;
    const barcode = this.pickString(records, ['barcode', 'barCode']);

    const quantityRecords = [
      rawPayload,
      rawPayloadPayload,
      rawPayloadData,
      rawPayloadProduct,
      product,
      payload,
      data,
      productNode,
      payloadData,
      payloadProduct,
      dataProduct,
    ].filter(Boolean);
    const quantity = this.pickNumber(quantityRecords, [
      'quantity',
      'stock',
      'stockQuantity',
      'stock_quantity',
      'balance',
      'amount',
    ]);

    if (id === '6cfccd83-e3b7-45e4-bela-1356811c94b4') {
      this.logger.debug({
        message: 'EVOTOR_TARGET_PRODUCT_QUANTITY_DEBUG',
        productId: id,
        expectedQuantity: 277,
        productQuantity: product.quantity,
        rawPayloadQuantity: rawPayload?.quantity,
        normalizedQuantity: quantity ?? 0,
      });
    }

    return {
      id,
      article_number: articleNumber,
      name: this.pickString(records, ['name', 'title']) ?? articleNumber,
      price: this.pickNumber(records, ['price']) ?? 0,
      quantity: quantity ?? 0,
      ...(barcode ? { barcode } : {}),
    };
  }

  private normalizeRemoteDocument(value: unknown): unknown {
    const document = this.asRecord(value);
    if (!document) {
      return value;
    }

    return document.rawPayload ?? document.payload ?? value;
  }

  private recordMatchesStore(record: Record<string, unknown>, storeId: string) {
    const payload = this.asRecord(record.payload);

    return [
      record.storeUuid,
      record.storeId,
      record.store_id,
      record.externalStoreId,
      payload?.store_id,
      payload?.storeId,
      payload?.storeUuid,
      payload?.externalStoreId,
    ].some((value) => value === storeId);
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private pickString(
    records: Array<Record<string, unknown> | null>,
    keys: string[],
  ): string | null {
    for (const record of records) {
      if (!record) continue;

      for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim() !== '') {
          return value;
        }
      }
    }

    return null;
  }

  private pickNumber(
    records: Array<Record<string, unknown> | null>,
    keys: string[],
  ): number | null {
    for (const record of records) {
      if (!record) continue;

      for (const key of keys) {
        const value = record[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value;
        }
        if (typeof value === 'string' && value.trim() !== '') {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) {
            return parsed;
          }
        }
      }
    }

    return null;
  }
}
