import { AuthModule } from '@/core/auth/auth.module';
import { Shop } from '@/modules/shop/entities/shop.entity';
import { ShopModule } from '@/modules/shop/shop.module';
import { User } from '@/modules/user/entities/user.entity';
import { UserModule } from '@/modules/user/user.module';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';

describe('Authentication E2E', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    shopName: 'Test Shop',
    shopSlug: 'test-shop',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'test_db',
          entities: [Shop, User],
          synchronize: true,
        }),
        AuthModule,
        ShopModule,
        UserModule,
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

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should successfully register a new user with shop', async () => {
      const registerDto = {
        email: testUser.email,
        password: testUser.password,
        shopName: testUser.shopName,
        shopSlug: testUser.shopSlug,
      };

      const response = await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.email).toBe(testUser.email);

      const tokenPayload = await jwtService.verifyAsync(response.body.data.accessToken);
      expect(tokenPayload.email).toBe(testUser.email);
      expect(tokenPayload.role).toBe('owner');
      expect(tokenPayload.shopId).toBeDefined();
    });

    it('should fail with duplicate email', async () => {
      const registerDto = {
        email: testUser.email,
        password: testUser.password,
        shopName: 'Another Shop',
        shopSlug: 'another-shop',
      };

      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(409);
    });

    it('should fail with duplicate shop slug', async () => {
      const registerDto = {
        email: 'test2@example.com',
        password: testUser.password,
        shopName: 'Different Shop',
        shopSlug: testUser.shopSlug,
      };

      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(409);
    });

    it('should fail with invalid email', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: testUser.password,
        shopName: 'Test Shop 2',
        shopSlug: 'test-shop-2',
      };

      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(400);
    });

    it('should fail with short password', async () => {
      const registerDto = {
        email: 'test3@example.com',
        password: '12345',
        shopName: 'Test Shop 3',
        shopSlug: 'test-shop-3',
      };

      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.email).toBe(testUser.email);

      const tokenPayload = await jwtService.verifyAsync(response.body.data.accessToken);
      expect(tokenPayload.email).toBe(testUser.email);
      expect(tokenPayload.role).toBe('owner');
    });

    it('should fail with invalid email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: testUser.password,
      };

      await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(404);
    });

    it('should fail with wrong password', async () => {
      const loginDto = {
        email: testUser.email,
        password: 'wrongpassword',
      };

      await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const loginDto = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(app.getHttpServer()).post('/auth/login').send(loginDto);
      refreshToken = response.body.data.refreshToken;
    });

    it('should successfully refresh token', async () => {
      const response = await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.refreshToken).not.toBe(refreshToken);

      const tokenPayload = await jwtService.verifyAsync(response.body.data.accessToken);
      expect(tokenPayload.email).toBe(testUser.email);
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: 'invalid-token' }).expect(401);
    });

    it('should fail with missing refresh token', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').send({}).expect(400);
    });
  });
});
