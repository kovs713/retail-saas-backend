import { AuthModule } from '@/core/auth/auth.module';
import { CategoryModule } from '@/modules/category/category.module';
import { ProductModule } from '@/modules/product/product.module';
import { ShopModule } from '@/modules/shop/shop.module';
import { UserModule } from '@/modules/user/user.module';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedTestContainer } from 'testcontainers';

describe('Category E2E Tests', () => {
  let app: INestApplication;
  let container: StartedTestContainer;

  let accessToken: string;
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
        CategoryModule,
        ProductModule,
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
        email: `category-test-${Date.now()}@example.com`,
        password: 'password123',
        shopName: 'Category Test Shop',
        shopSlug: `category-test-shop-${Date.now()}`,
      })
      .expect(201);

    accessToken = registerResponse.body.data.accessToken;
    shopId = registerResponse.body.data.shopId;
  });

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  describe('POST /categories', () => {
    it('should create category successfully', async () => {
      const category = {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic products and gadgets',
      };

      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(category)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(category.name);
      expect(response.body.data.slug).toBe(category.slug);
      expect(response.body.data.description).toBe(category.description);
    });

    it('should fail with duplicate slug', async () => {
      const category = {
        name: 'Electronics Duplicate',
        slug: 'electronics',
        description: 'Duplicate category',
      };

      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(category)
        .expect(409);
    });

    it('should create subcategory with parent', async () => {
      const parentCategory = {
        name: 'Devices',
        slug: 'devices',
      };

      const parentResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(parentCategory)
        .expect(201);

      const subcategory = {
        name: 'Smartphones',
        slug: 'smartphones',
        parentId: parentResponse.body.data.id,
      };

      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(subcategory)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.parentId).toBe(parentResponse.body.data.id);
    });

    it('should fail without authentication', async () => {
      const category = {
        name: 'Unauthorized Category',
        slug: 'unauthorized',
      };

      await request(app.getHttpServer()).post('/categories').send(category).expect(401);
    });
  });

  describe('GET /categories', () => {
    it('should return all categories for shop', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should include parent relation', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const subcategories = response.body.data.filter((c: any) => c.parent);
      if (subcategories.length > 0) {
        expect(subcategories[0].parent).toHaveProperty('id');
        expect(subcategories[0].parent).toHaveProperty('name');
      }
    });
  });

  describe('GET /categories/:id', () => {
    let categoryId: string;

    beforeAll(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Get Test Category',
          slug: 'get-test-category',
        })
        .expect(201);

      categoryId = createResponse.body.data.id;
    });

    it('should return category by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(categoryId);
      expect(response.body.data.name).toBe('Get Test Category');
    });

    it('should return 404 for non-existent category', async () => {
      await request(app.getHttpServer())
        .get('/categories/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /categories/slug/:slug', () => {
    it('should return category by slug', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories/slug/electronics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe('electronics');
    });

    it('should return 404 for non-existent slug', async () => {
      await request(app.getHttpServer())
        .get('/categories/slug/non-existent-slug')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /categories/:id', () => {
    let categoryId: string;

    beforeAll(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Update Test Category',
          slug: 'update-test-category',
        })
        .expect(201);

      categoryId = createResponse.body.data.id;
    });

    it('should update category', async () => {
      const update = {
        name: 'Updated Category Name',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(update)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(update.name);
      expect(response.body.data.description).toBe(update.description);
    });

    it('should fail for non-existent category', async () => {
      await request(app.getHttpServer())
        .patch('/categories/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /categories/:id', () => {
    let categoryId: string;

    beforeAll(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Delete Test Category',
          slug: 'delete-test-category',
        })
        .expect(201);

      categoryId = createResponse.body.data.id;
    });

    it('should delete category', async () => {
      await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Category-Product Integration', () => {
    let categoryId: string;
    let productId: string;

    beforeAll(async () => {
      const categoryResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Products Category',
          slug: 'products-category',
        })
        .expect(201);

      categoryId = categoryResponse.body.data.id;

      const productResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          sku: `CAT-PROD-${Date.now()}`,
          name: 'Categorized Product',
          price: 49.99,
          quantity: 10,
          categoryId: categoryId,
        })
        .expect(201);

      productId = productResponse.body.data.id;
    });

    it('should filter products by category', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products?category=${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].categoryId).toBe(categoryId);
    });

    it('should return category with products', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(categoryId);
    });
  });

  describe('Multi-tenant Isolation', () => {
    let tenant2AccessToken: string;
    let category1Id: string;

    beforeAll(async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `category-tenant2-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'Tenant 2 Category Shop',
          shopSlug: `category-tenant2-shop-${Date.now()}`,
        })
        .expect(201);

      tenant2AccessToken = registerResponse.body.data.accessToken;

      const createResponse = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Isolation Test Category',
          slug: 'isolation-test-category',
        })
        .expect(201);

      category1Id = createResponse.body.data.id;
    });

    it('should not see categories from other shop', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const isolationCategory = response.body.data.find((c: any) => c.id === category1Id);
      expect(isolationCategory).toBeUndefined();
    });

    it('should not update categories from other shop', async () => {
      await request(app.getHttpServer())
        .patch(`/categories/${category1Id}`)
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });

    it('should not delete categories from other shop', async () => {
      await request(app.getHttpServer())
        .delete(`/categories/${category1Id}`)
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .expect(404);
    });
  });
});
