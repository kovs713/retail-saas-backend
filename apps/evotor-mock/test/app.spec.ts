import { AppModule } from '../src/app.module';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

describe('EvotorMock protocol', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
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
});
