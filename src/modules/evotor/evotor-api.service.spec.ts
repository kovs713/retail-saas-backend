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
      'https://bridge.example.com/api/evotor/stores/store%2F1/products?evotorUserId=evotor-user-1&cursor=cursor-2',
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
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
