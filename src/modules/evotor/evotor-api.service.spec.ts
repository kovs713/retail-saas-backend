import { EvotorOptions } from '@/common/types';
import { EvotorApiService } from './evotor-api.service';

describe('EvotorApiService', () => {
  let service: EvotorApiService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  const options: EvotorOptions = {
    baseUrl: 'https://bridge.example.com/',
    adminToken: 'admin-token',
    timeoutMs: 5000,
  };

  beforeEach(() => {
    service = new EvotorApiService(options);
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('reads products through the bridge proxy with admin bearer auth', async () => {
    const firstProduct = {
      id: 'product-1',
      article_number: 'SKU-001',
      name: 'First Product',
      price: 1200,
      quantity: 7,
    };
    const secondProduct = {
      id: 'product-2',
      article_number: 'SKU-002',
      name: 'Second Product',
      price: 1500,
      quantity: 3,
    };

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            items: [
              {
                uuid: 'product-1',
                articleNumber: 'SKU-001',
                name: 'First Product',
                price: 1200,
                quantity: 7,
              },
            ],
          },
          paging: { nextCursor: 'cursor-2' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            items: [
              {
                name: 'Second Product',
                rawPayload: {
                  uuid: 'product-2',
                  articleNumber: 'SKU-002',
                  price: 1500,
                  quantity: 3,
                },
              },
            ],
            paging: {},
          },
        }),
      );

    const result = await service.getProducts('store/1', 'evotor-user-1');

    expect(result).toEqual([firstProduct, secondProduct]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://bridge.example.com/api/evotor/stores/store%2F1/products?evotorUserId=evotor-user-1',
      expect.objectContaining({ method: 'GET', headers: expect.any(Headers) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://bridge.example.com/api/evotor/stores/store%2F1/products?cursor=cursor-2&evotorUserId=evotor-user-1',
      expect.objectContaining({ method: 'GET', headers: expect.any(Headers) }),
    );

    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer admin-token');
    expect(headers.get('X-Authorization')).toBeNull();
  });

  it('filters out products with allow_to_sell=false', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          items: [
            {
              uuid: 'product-1',
              name: 'Not for sale',
              price: 100,
              quantity: 5,
              allow_to_sell: false,
            },
          ],
        },
        paging: {},
      }),
    );

    const result = await service.getProducts('store/1', 'evotor-user-1');

    expect(result).toEqual([]);
  });

  it('filters out product groups (group=true)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          items: [
            {
              uuid: 'group-1',
              name: 'Category Group',
              price: 0,
              quantity: 0,
              group: true,
            },
          ],
        },
        paging: {},
      }),
    );

    const result = await service.getProducts('store/1', 'evotor-user-1');

    expect(result).toEqual([]);
  });

  it('keeps product with quantity=0 and allow_to_sell=true', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          items: [
            {
              uuid: 'product-1',
              articleNumber: 'SKU-001',
              name: 'Out of Stock Product',
              price: 1000,
              quantity: 0,
            },
          ],
        },
        paging: {},
      }),
    );

    const result = await service.getProducts('store/1', 'evotor-user-1');

    expect(result).toEqual([
      {
        id: 'product-1',
        article_number: 'SKU-001',
        name: 'Out of Stock Product',
        price: 1000,
        quantity: 0,
      },
    ]);
  });

  it('filters out products with source=sell_document', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          items: [
            {
              uuid: 'product-1',
              name: 'Sell Document Item',
              price: 200,
              quantity: 1,
              source: 'sell_document',
            },
          ],
        },
        paging: {},
      }),
    );

    const result = await service.getProducts('store/1', 'evotor-user-1');

    expect(result).toEqual([]);
  });

  it('reads documents through the bridge proxy with pagination', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            items: [
              {
                rawPayload: {
                  id: 'doc-1',
                  type: 'SELL',
                  body: { positions: [], payments: [], result_sum: 1200 },
                },
              },
            ],
          },
          paging: { nextCursor: 'cursor-2' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            items: [
              {
                id: 'doc-2',
                type: 'BUY',
                body: {},
              },
            ],
            paging: {},
          },
        }),
      );

    const result = await service.getDocuments(
      'store/1',
      'evotor-user-1',
      '2026-05-01',
      '2026-05-16',
    );

    expect(result).toEqual([
      {
        id: 'doc-1',
        type: 'SELL',
        body: { positions: [], payments: [], result_sum: 1200 },
      },
      {
        id: 'doc-2',
        type: 'BUY',
        body: {},
      },
    ]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://bridge.example.com/api/evotor/stores/store%2F1/documents?evotorUserId=evotor-user-1&dateFrom=2026-05-01&dateTo=2026-05-16',
      expect.objectContaining({ method: 'GET', headers: expect.any(Headers) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://bridge.example.com/api/evotor/stores/store%2F1/documents?cursor=cursor-2&evotorUserId=evotor-user-1&dateFrom=2026-05-01&dateTo=2026-05-16',
      expect.objectContaining({ method: 'GET', headers: expect.any(Headers) }),
    );
  });

  it('reads admin dashboard resources through bridge admin endpoints', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: 'account-1' }],
          total: 1,
          skip: 0,
          take: 20,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: 'store-1' }],
          total: 1,
          skip: 0,
          take: 20,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: 'device-1' }],
          total: 1,
          skip: 0,
          take: 20,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: 'event-1' }],
          total: 1,
          skip: 0,
          take: 20,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: 'product-1' }],
          total: 1,
          skip: 0,
          take: 20,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: 'document-1' }],
          total: 1,
          skip: 0,
          take: 20,
        }),
      );

    const result = await service.getAdminDashboard();

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]).toMatchObject({ id: 'account-1' });
    expect(result.stores).toHaveLength(1);
    expect(result.devices).toHaveLength(1);
    expect(result.inboxEvents).toHaveLength(1);
    expect(result.products).toHaveLength(1);
    expect(result.documents).toHaveLength(1);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://bridge.example.com/admin/evotor/accounts',
      'https://bridge.example.com/admin/evotor/stores',
      'https://bridge.example.com/admin/evotor/devices',
      'https://bridge.example.com/admin/evotor/inbox-events',
      'https://bridge.example.com/admin/evotor/products',
      'https://bridge.example.com/admin/evotor/inbox-events?eventType=evotor.documents.received',
    ]);
  });

  it('passes filters to bridge admin list endpoints', async () => {
    const query = {
      evotorUserId: 'evotor-user-1',
      storeId: 'store-1',
      storeUuid: '20190405-F247-4028-8080-1031D2F79B44',
      productId: 'e2e7770b-4840-45b2-8b19-43ccf54c0059',
      search: 'TetraPro',
      name: 'Energy Crisps',
      code: '3706',
    };
    // Return fresh Response each call to avoid body-consumed issues with retry
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ items: [], total: 0, skip: 0, take: 20 })),
    );

    await service.listAdminAccounts(query);
    await service.listAdminInboxEvents(query);
    await service.listAdminStores(query);
    await service.listAdminDevices(query);
    await service.listAdminProducts(query);
    await service.listAdminDocuments(query);

    const getUrl = (n: number) =>
      (fetchMock.mock.calls[n][0] as URL | string).toString();

    // accounts — gets evotorUserId but NOT storeId (accounts doesn't support it)
    expect(getUrl(0)).toContain('/admin/evotor/accounts');
    expect(getUrl(0)).toContain('evotorUserId=evotor-user-1');
    expect(getUrl(0)).not.toContain('storeId');
    // inbox-events — gets evotorUserId but NOT storeId
    expect(getUrl(1)).toContain('/admin/evotor/inbox-events');
    expect(getUrl(1)).toContain('evotorUserId=evotor-user-1');
    expect(getUrl(1)).not.toContain('storeId');
    // stores
    expect(getUrl(2)).toContain('/admin/evotor/stores');
    expect(getUrl(2)).toContain('evotorUserId=evotor-user-1');
    expect(getUrl(2)).toContain('storeId=store-1');
    // devices
    expect(getUrl(3)).toContain('/admin/evotor/devices');
    expect(getUrl(3)).toContain('evotorUserId=evotor-user-1');
    expect(getUrl(3)).toContain('storeId=store-1');
    // products
    expect(getUrl(4)).toContain('/admin/evotor/products');
    expect(getUrl(4)).toContain('evotorUserId=evotor-user-1');
    expect(getUrl(4)).toContain('storeId=store-1');
    expect(getUrl(4)).toContain(
      'storeUuid=20190405-F247-4028-8080-1031D2F79B44',
    );
    expect(getUrl(4)).toContain(
      'productId=e2e7770b-4840-45b2-8b19-43ccf54c0059',
    );
    expect(getUrl(4)).toContain('search=TetraPro');
    expect(getUrl(4)).toContain('name=Energy+Crisps');
    expect(getUrl(4)).toContain('code=3706');
    // documents — now reads from inbox-events with eventType filter
    expect(getUrl(5)).toContain('/admin/evotor/inbox-events');
    expect(getUrl(5)).toContain('evotorUserId=evotor-user-1');
    expect(getUrl(5)).toContain('eventType=evotor.documents.received');
    expect(getUrl(5)).not.toContain('storeId');
  });

  it('returns accounts list from bridge', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            id: '01-000000000000001',
            name: 'Account One',
            email: 'a@test.com',
          },
        ],
        total: 1,
        skip: 0,
        take: 20,
      }),
    );

    const result = await service.listAdminAccounts({});

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: '01-000000000000001',
      name: 'Account One',
    });
    expect(result.total).toBe(1);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it('returns stores list from bridge', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [{ id: 'store-uuid-1', name: 'Store 1', devicesCount: 2 }],
        total: 1,
        skip: 0,
        take: 20,
      }),
    );

    const result = await service.listAdminStores({
      evotorUserId: '01-000000000000001',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'store-uuid-1',
      name: 'Store 1',
    });
  });

  it('returns devices list from bridge', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          { id: 'device-uuid-1', name: 'Terminal 1', serialNumber: 'SN-001' },
        ],
        total: 1,
        skip: 0,
        take: 20,
      }),
    );

    const result = await service.listAdminDevices({});

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'device-uuid-1',
      name: 'Terminal 1',
    });
  });

  it('returns products list from bridge', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          { id: 'product-1', article_number: 'SKU-001', name: 'Product 1' },
        ],
        total: 1,
        skip: 0,
        take: 20,
      }),
    );

    const result = await service.listAdminProducts({
      storeId: 'store-uuid-1',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'product-1',
      article_number: 'SKU-001',
      name: 'Product 1',
    });
  });

  it('normalizes persisted admin products', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            id: 'product-1',
            articleNumber: 'SKU-001',
            name: 'Product 1',
            price: 1200,
            quantity: 7,
          },
        ],
        total: 1,
        skip: 0,
        take: 100,
      }),
    );

    const result = await service.getAdminProducts(
      'evotor-user-1',
      'store-uuid-1',
    );

    expect(result).toEqual([
      {
        id: 'product-1',
        article_number: 'SKU-001',
        name: 'Product 1',
        price: 1200,
        quantity: 7,
      },
    ]);
    const url = (fetchMock.mock.calls[0][0] as URL | string).toString();
    expect(url).toContain('evotorUserId=evotor-user-1');
    expect(url).toContain('storeId=store-uuid-1');
  });

  it('prefers raw payload quantity for admin products', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            productId: '6cfccd83-e3b7-45e4-bela-1356811c94b4',
            storeId: 'store-uuid-1',
            name: 'Target Product',
            code: 'SKU-001',
            price: 5,
            quantity: 0,
            rawPayload: {
              quantity: 277,
            },
          },
        ],
        total: 1,
        skip: 0,
        take: 100,
      }),
    );

    const result = await service.getAdminProducts(
      'evotor-user-1',
      'store-uuid-1',
    );

    expect(result).toEqual([
      {
        id: '6cfccd83-e3b7-45e4-bela-1356811c94b4',
        article_number: 'SKU-001',
        name: 'Target Product',
        price: 5,
        quantity: 277,
      },
    ]);
  });

  it('returns empty products when no filters', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [], total: 0, skip: 0, take: 20 }),
    );
    const result = await service.listAdminProducts({});

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('applies skip/take pagination', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [], total: 0, skip: 10, take: 5 }),
    );

    const result = await service.listAdminDevices({ skip: 10, take: 5 });

    expect(result.skip).toBe(10);
    expect(result.take).toBe(5);
    const url = (fetchMock.mock.calls[0][0] as URL | string).toString();
    expect(url).toContain('skip=10');
    expect(url).toContain('take=5');
  });

  it('finds raw bridge account by userId', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [{ evotorUserId: '01-000000000000001', name: 'Test' }],
        total: 1,
        skip: 0,
        take: 1,
      }),
    );

    const result = await service.findRawBridgeAccount('01-000000000000001');

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Test');
  });

  it('finds raw bridge store by storeId', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [{ uuid: 'store-uuid-1', name: 'Store' }],
        total: 1,
        skip: 0,
        take: 1,
      }),
    );

    const result = await service.findRawBridgeStore(
      '01-000000000000001',
      'store-uuid-1',
    );

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Store');
  });

  it('triggers admin sync through the bridge', async () => {
    const response = {
      batchId: 'batch-1',
      evotorUserId: 'evotor-user-1',
    };
    const payload = {
      evotorUserId: 'evotor-user-1',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-16',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(response));

    const result = await service.syncAdmin(payload);

    expect(result).toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://bridge.example.com/admin/evotor/sync',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.any(Headers),
      }),
    );
  });

  it('processes admin inbox events through the bridge', async () => {
    const response = { processed: 3, skipped: 1, failed: 0 };
    fetchMock.mockResolvedValueOnce(jsonResponse(response));

    const result = await service.processAdminInboxEvents({
      evotorUserId: '01-000000000000001',
      take: 100,
    });

    expect(result).toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://bridge.example.com/admin/evotor/inbox-events/process?evotorUserId=01-000000000000001&take=100',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      }),
    );
  });

  it('deletes admin sync documents through the bridge', async () => {
    const response = { deleted: 3 };
    fetchMock.mockResolvedValueOnce(jsonResponse(response));

    const result = await service.deleteAdminSyncDocuments({
      evotorUserId: '01-000000000000001',
      storeId: '20190607-4F3B-40E0-80F0-00155D012500',
    });

    expect(result).toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://bridge.example.com/admin/evotor/sync/documents?evotorUserId=01-000000000000001&storeId=20190607-4F3B-40E0-80F0-00155D012500',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.any(Headers),
      }),
    );
  });

  it('forwards cloud token to bridge admin recovery endpoint', async () => {
    const payload = {
      evotorUserId: 'evotor-user-1',
      token: 'cloud-token',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));

    await service.setAdminCloudToken(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://bridge.example.com/api/evotor/cloud-token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
