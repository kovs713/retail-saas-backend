import { AuthModule } from '@/core/auth/auth.module';
import { CategoryModule } from '@/modules/category/category.module';
import { ProductModule } from '@/modules/product/product.module';
import { ShopModule } from '@/modules/shop/shop.module';
import { UserModule } from '@/modules/user/user.module';
import { CommonModule } from '@/common/common.module';
import { postgresVersion } from '../env.const';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { StartedTestContainer } from 'testcontainers';
import * as path from 'path';

describe('Product E2E Tests', () => {
  let app: INestApplication;
  let container: StartedTestContainer;

  let accessToken: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(postgresVersion)
      .withDatabase('test_db')
      .withUsername('test')
      .withPassword('test')
      .start();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: path.resolve(__dirname, '../../.env'),
          load: [
            () => ({
              JWT_SECRET: process.env.JWT_SECRET || 'test-secret-key-for-e2e-tests',
              JWT_EXPIRED_TIME: process.env.JWT_EXPIRED_TIME || '1d',
            }),
          ],
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
        ProductModule,
        CategoryModule,
        CommonModule,
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
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
        shopName: 'Test Shop',
        shopSlug: `test-shop-${Date.now()}`,
      })
      .expect(201);

    accessToken = registerResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  describe('POST /products', () => {
    it('should create product successfully', async () => {
      const product = {
        sku: 'PROD-001',
        name: 'Test Product',
        price: 99.99,
        quantity: 100,
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(product)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.sku).toBe(product.sku);
      expect(response.body.data.name).toBe(product.name);
      expect(response.body.data.price).toBe(product.price.toString());
      expect(response.body.data.quantity).toBe(product.quantity);
    });

    it('should fail with duplicate SKU', async () => {
      const product = {
        sku: 'PROD-001',
        name: 'Another Product',
        price: 49.99,
        quantity: 50,
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(product)
        .expect(409);
    });

    it('should fail with invalid price', async () => {
      const product = {
        sku: 'PROD-002',
        name: 'Invalid Product',
        price: -10,
        quantity: 50,
      };

      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(product)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      const product = {
        sku: 'PROD-003',
        name: 'Unauthorized Product',
        price: 19.99,
        quantity: 25,
      };

      await request(app.getHttpServer()).post('/products').send(product).expect(401);
    });
  });

  describe('GET /products', () => {
    it('should return paginated products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should search products by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?search=Test')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by price range', async () => {
      const response = await request(app.getHttpServer())
        .get('/products?minPrice=50&maxPrice=150')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((product: any) => {
        expect(parseFloat(product.price)).toBeGreaterThanOrEqual(50);
        expect(parseFloat(product.price)).toBeLessThanOrEqual(150);
      });
    });
  });

  describe('GET /products/:id', () => {
    let createdProductId: string;

    beforeAll(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sku: 'PROD-GET-001',
          name: 'Get Test Product',
          price: 29.99,
          quantity: 10,
        })
        .expect(201);

      createdProductId = createResponse.body.data.id;
    });

    it('should return product by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdProductId);
    });

    it('should return 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .get('/products/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /products/:id', () => {
    let createdProductId: string;

    beforeAll(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sku: 'PROD-UPDATE-001',
          name: 'Update Test Product',
          price: 39.99,
          quantity: 15,
        })
        .expect(201);

      createdProductId = createResponse.body.data.id;
    });

    it('should update product successfully', async () => {
      const update = {
        name: 'Updated Product Name',
        price: 49.99,
      };

      const response = await request(app.getHttpServer())
        .patch(`/products/${createdProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(update)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(update.name);
      expect(response.body.data.price).toBe(update.price.toString());
    });

    it('should fail for non-existent product', async () => {
      await request(app.getHttpServer())
        .patch('/products/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /products/:id', () => {
    let createdProductId: string;

    beforeAll(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sku: 'PROD-DELETE-001',
          name: 'Delete Test Product',
          price: 59.99,
          quantity: 20,
        })
        .expect(201);

      createdProductId = createResponse.body.data.id;
    });

    it('should soft delete product', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${createdProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const getResponse = await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(getResponse.body.message).toContain('not found');
    });
  });

  describe('POST /products/:id/restore', () => {
    let deletedProductId: string;

    beforeAll(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sku: 'PROD-RESTORE-001',
          name: 'Restore Test Product',
          price: 69.99,
          quantity: 30,
        })
        .expect(201);

      deletedProductId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`/products/${deletedProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should restore deleted product', async () => {
      const response = await request(app.getHttpServer())
        .post(`/products/${deletedProductId}/restore`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('restored');

      await request(app.getHttpServer())
        .get(`/products/${deletedProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /products/:id/stock', () => {
    let productId: string;

    beforeAll(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sku: 'PROD-STOCK-001',
          name: 'Stock Test Product',
          price: 79.99,
          quantity: 100,
        })
        .expect(201);

      productId = createResponse.body.data.id;
    });

    it('should update stock quantity', async () => {
      const response = await request(app.getHttpServer())
        .post(`/products/${productId}/stock`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ quantity: 50 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(50);
    });

    it('should adjust stock (increment)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/products/${productId}/stock/adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ adjustment: 25 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(75);
    });

    it('should adjust stock (decrement)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/products/${productId}/stock/adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ adjustment: -30 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(45);
    });
  });

  describe('Multi-tenant Isolation', () => {
    let tenant2AccessToken: string;

    beforeAll(async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `tenant2-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'Tenant 2 Shop',
          shopSlug: `tenant2-shop-${Date.now()}`,
        })
        .expect(201);

      tenant2AccessToken = registerResponse.body.data.accessToken;
    });

    it('should not see products from other shop', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(0);
    });

    it('should not update products from other shop', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sku: 'PROD-ISOLATION-001',
          name: 'Isolation Test Product',
          price: 89.99,
          quantity: 40,
        })
        .expect(201);

      const productId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });
  });
});
