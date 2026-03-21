import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

export interface TestAppContext {
  app: INestApplication;
  accessToken: string;
  refreshToken: string;
  userId: string;
  shopId: string;
}

export const TestHelpers = {
  async setupTestApp(moduleFixture: any): Promise<INestApplication> {
    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    return app;
  },

  async registerAndLogin(
    app: INestApplication,
    email?: string,
    password?: string,
  ): Promise<{ accessToken: string; refreshToken: string; userId: string; shopId: string }> {
    const registerDto = {
      email: email || `test-${Date.now()}@example.com`,
      password: password || 'password123',
      shopName: `Test Shop ${Date.now()}`,
      shopSlug: `test-shop-${Date.now()}`,
    };

    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(201);

    return {
      accessToken: registerResponse.body.data.accessToken,
      refreshToken: registerResponse.body.data.refreshToken,
      userId: registerResponse.body.data.userId,
      shopId: registerResponse.body.data.shopId,
    };
  },

  getAuthHeader(accessToken: string) {
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  },

  async cleanupTestApp(app: INestApplication) {
    await app.close();
  },
};
