import { AppModule } from '../src/app.module';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

describe('EvotorMock protocol', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects requests without X-Authorization header', async () => {
    await request(app.getHttpServer()).get('/mock/status').expect(401);
  });

  it('returns evotor rate-limit headers for authorized requests', async () => {
    const response = await request(app.getHttpServer())
      .get('/mock/status')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .expect(200);

    expect(response.headers['x-ratelimit-limit']).toBe('1000');
    expect(response.headers['x-ratelimit-remaining']).toBe('999');
    expect(response.headers['x-ratelimit-reset']).toBe('60');
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        stores: 0,
        products: 0,
        documents: 0,
        pendingWebhooks: 0,
      }),
    );
  });

  it('creates a mock store via seed and returns it from GET /stores', async () => {
    await request(app.getHttpServer())
      .post('/mock/seed')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .send({
        storeId: 'shop-1',
        productCount: 0,
        documentCount: 0,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/stores')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .expect(200);

    expect(response.body).toEqual({
      items: [
        expect.objectContaining({
          id: 'store-shop-1',
          name: 'Mock Store shop-1',
          address: 'Mock address for shop-1',
          user_id: 'user-shop-1',
        }),
      ],
      paging: {},
    });
  });

  it('returns one static device per seeded store', async () => {
    await request(app.getHttpServer())
      .post('/mock/seed')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .send({
        storeId: 'shop-2',
        productCount: 0,
        documentCount: 0,
      })
      .expect(201);

    const allDevicesResponse = await request(app.getHttpServer())
      .get('/devices')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .expect(200);

    const storeDevicesResponse = await request(app.getHttpServer())
      .get('/stores/store-shop-2/devices')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .expect(200);

    expect(allDevicesResponse.body).toEqual({
      items: [
        expect.objectContaining({
          id: 'device-store-shop-2',
          store_id: 'store-shop-2',
          name: 'Mock Device store-shop-2',
          timezone_offset: 10800000,
        }),
      ],
      paging: {},
    });

    expect(storeDevicesResponse.body).toEqual(allDevicesResponse.body);
  });

  it('seeds products and returns them from GET /stores/:storeId/products', async () => {
    await request(app.getHttpServer())
      .post('/mock/seed')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .send({
        storeId: 'shop-3',
        productCount: 2,
        documentCount: 0,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/stores/store-shop-3/products')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .expect(200);

    expect(response.body).toEqual({
      items: [
        expect.objectContaining({
          id: 'product-store-shop-3-1',
          store_id: 'store-shop-3',
          user_id: 'user-shop-3',
          name: 'Mock Product 1',
          article_number: 'SKU-store-shop-3-1',
          price: 100,
          quantity: 10,
          measure_name: 'шт',
          tax: 'VAT_20',
          allow_to_sell: true,
          type: 'NORMAL',
        }),
        expect.objectContaining({
          id: 'product-store-shop-3-2',
          store_id: 'store-shop-3',
          user_id: 'user-shop-3',
          name: 'Mock Product 2',
          article_number: 'SKU-store-shop-3-2',
          price: 200,
          quantity: 20,
          measure_name: 'шт',
          tax: 'VAT_20',
          allow_to_sell: true,
          type: 'NORMAL',
        }),
      ],
      paging: {},
    });
  });

  it('returns a single seeded product by id', async () => {
    await request(app.getHttpServer())
      .post('/mock/seed')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .send({
        storeId: 'shop-4',
        productCount: 1,
        documentCount: 0,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/stores/store-shop-4/products/product-store-shop-4-1')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'product-store-shop-4-1',
        store_id: 'store-shop-4',
        article_number: 'SKU-store-shop-4-1',
        price: 100,
      }),
    );
  });

  it('seeds documents and returns them from GET /stores/:storeId/documents', async () => {
    await request(app.getHttpServer())
      .post('/mock/seed')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .send({
        storeId: 'shop-5',
        productCount: 2,
        documentCount: 2,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/stores/store-shop-5/documents')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .expect(200);

    expect(response.body).toEqual({
      items: [
        expect.objectContaining({
          id: 'document-store-shop-5-1',
          type: 'SELL',
          device_id: 'device-store-shop-5',
          store_id: 'store-shop-5',
          user_id: 'user-shop-5',
          version: 'V2',
          body: expect.objectContaining({
            result_sum: 100,
            positions: [
              expect.objectContaining({
                product_id: 'product-store-shop-5-1',
                product_name: 'Mock Product 1',
                price: 100,
                quantity: 1,
                result_sum: 100,
              }),
            ],
          }),
        }),
        expect.objectContaining({
          id: 'document-store-shop-5-2',
          type: 'SELL',
          body: expect.objectContaining({
            result_sum: 200,
          }),
        }),
      ],
      paging: {},
    });
  });

  it('returns a single seeded document by id', async () => {
    await request(app.getHttpServer())
      .post('/mock/seed')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .send({
        storeId: 'shop-6',
        productCount: 1,
        documentCount: 1,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/stores/store-shop-6/documents/document-store-shop-6-1')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'document-store-shop-6-1',
        device_id: 'device-store-shop-6',
        store_id: 'store-shop-6',
        body: expect.objectContaining({
          result_sum: 100,
        }),
      }),
    );
  });

  it('returns store device documents from GET /stores/:storeId/devices/:deviceId/documents', async () => {
    await request(app.getHttpServer())
      .post('/mock/seed')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .send({
        storeId: 'shop-7',
        productCount: 1,
        documentCount: 1,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/stores/store-shop-7/devices/device-store-shop-7/documents')
      .set('X-Authorization', 'Bearer mock-evotor-token')
      .expect(200);

    expect(response.body).toEqual({
      items: [
        expect.objectContaining({
          id: 'document-store-shop-7-1',
          device_id: 'device-store-shop-7',
          store_id: 'store-shop-7',
        }),
      ],
      paging: {},
    });
  });
});
