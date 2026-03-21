import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

export interface TestAppContext {
  app: INestApplication;
  accessToken: string;
  refreshToken: string;
  userId: string;
  shopId: string;
}

type ModuleFixture = {
  createNestApplication: () => INestApplication;
  get: <T>(token: any) => T;
};

export const TestHelpers = {
  async setupTestApp(moduleFixture: ModuleFixture): Promise<INestApplication> {
    const app: INestApplication = moduleFixture.createNestApplication();
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(201);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body: { data: { accessToken: string; refreshToken: string; userId: string; shopId: string } } =
      registerResponse.body;

    return {
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
      userId: body.data.userId,
      shopId: body.data.shopId,
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
