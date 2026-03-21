import { AuthModule } from '@/core/auth/auth.module';
import { UserModule } from '@/modules/user/user.module';
import { ShopModule } from '@/modules/shop/shop.module';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedTestContainer } from 'testcontainers';

describe('Authentication E2E (Expanded)', () => {
  let app: INestApplication;
  let container: StartedTestContainer;

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
  });

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  describe('POST /auth/register', () => {
    it('should successfully register a new user with shop', async () => {
      const registerDto = {
        email: `success-${Date.now()}@example.com`,
        password: 'password123',
        shopName: 'Success Shop',
        shopSlug: `success-shop-${Date.now()}`,
      };

      const response = await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('shopId');
      expect(response.body.data.email).toBe(registerDto.email);
    });

    it('should fail with duplicate email', async () => {
      const registerDto = {
        email: 'duplicate@example.com',
        password: 'password123',
        shopName: 'Shop 1',
        shopSlug: `shop1-${Date.now()}`,
      };

      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...registerDto, shopName: 'Shop 2', shopSlug: `shop2-${Date.now()}` })
        .expect(409);
    });

    it('should fail with duplicate shop slug', async () => {
      const slug = `duplicate-slug-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `shop1-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'Shop 1',
          shopSlug: slug,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `shop2-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'Shop 2',
          shopSlug: slug,
        })
        .expect(409);
    });

    it('should fail with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          shopName: 'Shop',
          shopSlug: `shop-${Date.now()}`,
        })
        .expect(400);
    });

    it('should fail with short password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `short-${Date.now()}@example.com`,
          password: 'short',
          shopName: 'Shop',
          shopSlug: `shop-${Date.now()}`,
        })
        .expect(400);
    });

    it('should fail with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `missing-${Date.now()}@example.com`,
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    let testUser: any;

    beforeAll(async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `login-test-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'Login Test Shop',
          shopSlug: `login-test-shop-${Date.now()}`,
        })
        .expect(201);

      testUser = registerResponse.body.data;
    });

    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: testUser.email,
        password: 'password123',
      };

      const response = await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.email).toBe(loginDto.email);
    });

    it('should fail with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(404);
    });

    it('should fail with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should fail with missing credentials', async () => {
      await request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    let testRefreshToken: string;

    beforeAll(async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `refresh-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'Refresh Test Shop',
          shopSlug: `refresh-test-shop-${Date.now()}`,
        })
        .expect(201);

      testRefreshToken = registerResponse.body.data.refreshToken;
    });

    it('should successfully refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: testRefreshToken })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.refreshToken).not.toBe(testRefreshToken);
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: 'invalid-token' }).expect(401);
    });

    it('should fail with missing refresh token', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').send({}).expect(400);
    });

    it('should invalidate old refresh token after refresh', async () => {
      const firstRefresh = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: testRefreshToken })
        .expect(201);

      const newRefreshToken = firstRefresh.body.data.refreshToken;

      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: testRefreshToken }).expect(401);

      const secondRefresh = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(201);

      expect(secondRefresh.body.data.refreshToken).toBeDefined();
    });
  });

  describe('POST /auth/logout', () => {
    let logoutAccessToken: string;
    let logoutRefreshToken: string;

    beforeAll(async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `logout-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'Logout Test Shop',
          shopSlug: `logout-test-shop-${Date.now()}`,
        })
        .expect(201);

      logoutAccessToken = registerResponse.body.data.accessToken;
      logoutRefreshToken = registerResponse.body.data.refreshToken;
    });

    it('should logout user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${logoutAccessToken}`)
        .send({ refreshToken: logoutRefreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should invalidate access token after logout', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `logout2-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'Logout Test Shop 2',
          shopSlug: `logout-test-shop2-${Date.now()}`,
        })
        .expect(201);

      const testAccessToken = registerResponse.body.data.accessToken;
      const testRefreshToken = registerResponse.body.data.refreshToken;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ refreshToken: testRefreshToken })
        .expect(200);

      await request(app.getHttpServer()).get('/products').set('Authorization', `Bearer ${testAccessToken}`).expect(401);
    });
  });

  describe('Password Reset Flow', () => {
    let resetEmail: string;

    beforeAll(async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `reset-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'Reset Test Shop',
          shopSlug: `reset-test-shop-${Date.now()}`,
        })
        .expect(201);

      resetEmail = registerResponse.body.data.email;
    });

    it('should request password reset email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: resetEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset link has been sent');
    });

    it('should not reveal if email exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should fail with invalid email format', async () => {
      await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: 'invalid-email' }).expect(400);
    });
  });

  describe('Token Validation', () => {
    let validToken: string;

    beforeAll(async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `token-test-${Date.now()}@example.com`,
          password: 'password123',
          shopName: 'Token Test Shop',
          shopSlug: `token-test-shop-${Date.now()}`,
        })
        .expect(201);

      validToken = registerResponse.body.data.accessToken;
    });

    it('should accept valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/shops/my-shops')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject malformed token', async () => {
      await request(app.getHttpServer())
        .get('/shops/my-shops')
        .set('Authorization', 'Bearer malformed-token')
        .expect(401);
    });

    it('should reject token without Bearer prefix', async () => {
      await request(app.getHttpServer()).get('/shops/my-shops').set('Authorization', validToken).expect(401);
    });
  });
});
