import { RegistrationStatus } from '@/common/enums';
import { AuthGuard } from '@/common/guards';
import { AuthConfig, AuthOptions } from '@/common/types';
import { mockAuthGuard } from '@/common/utils';
import { AuthController } from '@/core/auth/auth.controller';
import { AuthService } from '@/core/auth/auth.service';
import {
  createAuthResponseDto,
  createTokenPayload,
} from '@/core/database/factories';
import { RegistrationApplicationPublicController } from '@/modules/registration-application/registration-application-public.controller';
import { RegistrationApplicationService } from '@/modules/registration-application/registration-application.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import {
  ConflictException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';

describe('Auth E2E', () => {
  let app: INestApplication;
  let service: DeepMocked<AuthService>;
  let registrationApplicationService: DeepMocked<RegistrationApplicationService>;

  const mockUser = createTokenPayload({
    overrides: { sub: 'user_001', shopId: 'shop_001' },
  });

  const mockAuthConfig: AuthOptions = {
    refreshTokenCookie: 'refreshToken',
    refreshTokenMaxAge: 604800000,
  };

  const mockAuthResponse = createAuthResponseDto({
    email: 'test@example.com',
    userId: 'user_001',
    shopId: 'shop_001',
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        { provide: AuthConfig, useValue: mockAuthConfig },
        { provide: AuthService, useValue: createMock<AuthService>() },
        {
          provide: RegistrationApplicationService,
          useValue: createMock<RegistrationApplicationService>(),
        },
      ],
      controllers: [AuthController, RegistrationApplicationPublicController],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard(mockUser))
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    service = module.get<DeepMocked<AuthService>>(AuthService);
    registrationApplicationService = module.get<
      DeepMocked<RegistrationApplicationService>
    >(RegistrationApplicationService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should create registration application without auth cookie', async () => {
      registrationApplicationService.create.mockResolvedValue({
        id: 'application_001',
        email: 'new@example.com',
        shopName: 'New Shop',
        shopSlug: 'new-shop',
        status: RegistrationStatus.PENDING,
      } as never);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'new@example.com',
          password: 'password123',
          shopName: 'New Shop',
          shopSlug: 'new-shop',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('application_001');
      expect(response.body.data.status).toBe(RegistrationStatus.PENDING);
      expect(response.body.message).toBe(
        'Registration application created successfully',
      );
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'invalid' })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      registrationApplicationService.create.mockRejectedValue(
        new ConflictException('Email already exists'),
      );

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          shopName: 'Shop',
          shopSlug: 'shop',
        })
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    it('should login and return tokens with cookie', async () => {
      service.signIn.mockResolvedValue(mockAuthResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBe(mockAuthResponse.accessToken);
      expect(response.body.data.refreshToken).toBeUndefined();
      expect(response.body.data.user.email).toBe('test@example.com');

      const setCookie = response.headers['set-cookie'];
      expect(setCookie[0]).toContain('refreshToken=mock-refresh-token');
    });

    it('should return 401 for invalid credentials', async () => {
      service.signIn.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token from cookie', async () => {
      service.refreshToken.mockResolvedValue(mockAuthResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refreshToken=old-refresh-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBe(mockAuthResponse.accessToken);
      expect(response.body.data.refreshToken).toBeUndefined();
    });

    it('should return 401 when no refresh token', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile with valid token', async () => {
      service.getProfile.mockResolvedValue(mockAuthResponse.user);

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('user_001');
      expect(response.body.data.email).toBe('test@example.com');
    });
  });
});
