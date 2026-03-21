import { AuthModule } from '@/core/auth/auth.module';
import { ShopModule } from '@/modules/shop/shop.module';
import { UserModule } from '@/modules/user/user.module';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedTestContainer } from 'testcontainers';

describe('Shop E2E Tests', () => {
  let app: INestApplication;
  let container: StartedTestContainer;

  let accessToken: string;
  let userId: string;
  let shopId: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:18-alpine')
      .withDatabase('test_db')
      .withUsername('test')
      .withPassword('test')
      .start();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: container.getHost(),
          port: container.getMappedPort(5432),
          username: 'test',
          password: 'test',
          database: 'test_db',
          autoLoadEntities: true,
          synchronize: true,
          logging: false,
        }),
        AuthModule,
        UserModule,
        ShopModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `shop-test-${Date.now()}@example.com`,
        password: 'password123',
        shopName: 'Shop Test Shop',
        shopSlug: `shop-test-shop-${Date.now()}`,
      })
      .expect(201);

    accessToken = registerResponse.body.data.accessToken;
    userId = registerResponse.body.data.userId;
    shopId = registerResponse.body.data.shopId;
  });

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  describe('GET /shops/my-shops', () => {
    it('should return shops owned by user', async () => {
      const response = await request(app.getHttpServer())
        .get('/shops/my-shops')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].ownerId).toBe(userId);
    });
  });

  describe('GET /shops/:id', () => {
    it('should return shop by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/shops/${shopId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(shopId);
      expect(response.body.data.name).toBe('Shop Test Shop');
    });

    it('should include owner relation', async () => {
      const response = await request(app.getHttpServer())
        .get(`/shops/${shopId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('owner');
      expect(response.body.data.owner).toHaveProperty('id');
      expect(response.body.data.owner).toHaveProperty('email');
    });

    it('should return 404 for non-existent shop', async () => {
      await request(app.getHttpServer())
        .get('/shops/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /shops/slug/:slug', () => {
    it('should return shop by slug', async () => {
      const response = await request(app.getHttpServer())
        .get('/shops/slug/shop-test-shop')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toContain('shop-test-shop');
    });

    it('should return 404 for non-existent slug', async () => {
      await request(app.getHttpServer())
        .get('/shops/slug/non-existent-slug')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /shops/:id', () => {
    it('should update shop details', async () => {
      const update = {
        name: 'Updated Shop Name',
        description: 'Updated shop description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/shops/${shopId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(update)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(update.name);
      expect(response.body.data.description).toBe(update.description);
    });

    it('should fail for non-existent shop', async () => {
      await request(app.getHttpServer())
        .patch('/shops/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('Shop Owner Transfer', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let _newOwnerAccessToken: string;
    let newOwnerId: string;

    beforeAll(async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `new-owner-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'Temporary Shop',
          shopSlug: `temp-shop-${Date.now()}`,
        })
        .expect(201);

      _newOwnerAccessToken = registerResponse.body.data.accessToken;
      newOwnerId = registerResponse.body.data.userId;
    });

    it('should transfer shop ownership', async () => {
      const update = {
        ownerId: newOwnerId,
      };

      const response = await request(app.getHttpServer())
        .patch(`/shops/${shopId}/owner`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(update)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ownerId).toBe(newOwnerId);
    });

    it('should fail if new owner does not exist', async () => {
      const update = {
        ownerId: 'non-existent-user-id',
      };

      await request(app.getHttpServer())
        .patch(`/shops/${shopId}/owner`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(update)
        .expect(404);
    });
  });

  describe('Shop Active Status', () => {
    let activeShopId: string;

    beforeAll(async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `active-shop-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'Active Shop Test',
          shopSlug: `active-shop-test-${Date.now()}`,
        })
        .expect(201);

      activeShopId = registerResponse.body.data.shopId;
    });

    it('should deactivate shop', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/shops/${activeShopId}/toggle-active`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should reactivate shop', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/shops/${activeShopId}/toggle-active`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });
  });

  describe('Multi-tenant Shop Isolation', () => {
    let tenant2AccessToken: string;
    let tenant2ShopId: string;

    beforeAll(async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `shop-tenant2-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'Tenant 2 Shop',
          shopSlug: `shop-tenant2-shop-${Date.now()}`,
        })
        .expect(201);

      tenant2AccessToken = registerResponse.body.data.accessToken;
      tenant2ShopId = registerResponse.body.data.shopId;
    });

    it('should not see other tenant shops in my-shops', async () => {
      const response = await request(app.getHttpServer())
        .get('/shops/my-shops')
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const tenant1Shop = response.body.data.find((s: any) => s.id !== tenant2ShopId);
      expect(tenant1Shop).toBeUndefined();
    });

    it('should not update other tenant shop', async () => {
      await request(app.getHttpServer())
        .patch(`/shops/${shopId}`)
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .send({ name: 'Hacked Shop Name' })
        .expect(404);
    });

    it('should not delete other tenant shop', async () => {
      await request(app.getHttpServer())
        .delete(`/shops/${shopId}`)
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .expect(404);
    });
  });

  describe('Shop Validation', () => {
    it('should fail with invalid shop data', async () => {
      const invalidShop = {
        name: '',
        slug: '',
      };

      await request(app.getHttpServer())
        .post('/shops')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidShop)
        .expect(400);
    });

    it('should fail with duplicate slug', async () => {
      const duplicateSlug = {
        name: 'Duplicate Shop',
        slug: 'shop-tenant2-shop',
      };

      await request(app.getHttpServer())
        .post('/shops')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(duplicateSlug)
        .expect(409);
    });
  });
});
