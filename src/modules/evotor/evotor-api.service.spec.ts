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
          data: { items: [firstProduct] },
          paging: { nextCursor: 'cursor-2' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [secondProduct],
          paging: {},
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

  it('writes product changes through the bridge bulk proxy', async () => {
    const payload = [
      {
        id: 'product-1',
        article_number: 'SKU-001',
        name: 'First Product',
        price: 1200,
        quantity: 7,
      },
    ];
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: {} }));

    await service.upsertProducts('store-1', payload, 'evotor-user-1');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://bridge.example.com/api/evotor/stores/store-1/products/bulk?evotorUserId=evotor-user-1',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.any(Headers),
      }),
    );
    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer admin-token');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('reads admin dashboard resources through bridge admin endpoints', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ id: 'account-1' }]))
      .mockResolvedValueOnce(jsonResponse([{ id: 'event-1' }]))
      .mockResolvedValueOnce(jsonResponse([{ id: 'store-1' }]))
      .mockResolvedValueOnce(jsonResponse([{ id: 'device-1' }]))
      .mockResolvedValueOnce(jsonResponse([{ id: 'product-1' }]))
      .mockResolvedValueOnce(jsonResponse([{ id: 'document-1' }]));

    const result = await service.getAdminDashboard();

    expect(result).toEqual({
      accounts: [{ id: 'account-1' }],
      inboxEvents: [{ id: 'event-1' }],
      stores: [{ id: 'store-1' }],
      devices: [{ id: 'device-1' }],
      products: [{ id: 'product-1' }],
      documents: [{ id: 'document-1' }],
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://bridge.example.com/admin/evotor/accounts',
      'https://bridge.example.com/admin/evotor/inbox-events',
      'https://bridge.example.com/admin/evotor/stores',
      'https://bridge.example.com/admin/evotor/devices',
      'https://bridge.example.com/admin/evotor/products',
      'https://bridge.example.com/admin/evotor/documents',
    ]);
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

  it('forwards cloud token to bridge admin recovery endpoint', async () => {
    const payload = {
      evotorUserId: 'evotor-user-1',
      token: 'cloud-token',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));

    await service.setAdminCloudToken(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://bridge.example.com/admin/evotor/cloud-token',
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
