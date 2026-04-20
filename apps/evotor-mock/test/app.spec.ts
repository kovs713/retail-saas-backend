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
});
