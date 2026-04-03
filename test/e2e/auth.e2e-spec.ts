import { AuthController } from '@/core/auth/auth.controller';
import { AuthService } from '@/core/auth/auth.service';
import { AuthGuard } from '@/common/guards';
import {
  CanActivate,
  ConflictException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';

const mockAuthGuard: CanActivate = {
  canActivate: (context) => {
    const req = context.switchToHttp().getRequest();
    req.user = { sub: 'user-123', shopId: 'shop-456', role: 'owner', email: 'test@example.com' };
    return true;
  },
};

describe('Auth E2E', () => {
  let app: INestApplication;
  let authService: jest.Mocked<AuthService>;

  const mockAuthResponse = {
    email: 'test@example.com',
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      role: 'owner',
      shopId: 'shop-456',
      isActive: true,
    },
  };

  beforeAll(async () => {
    authService = {
      register: jest.fn(),
      signIn: jest.fn(),
      refreshToken: jest.fn(),
      getProfile: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register user and set refresh token cookie', async () => {
      authService.register.mockResolvedValue(mockAuthResponse);

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
      expect(response.body.data.accessToken).toBe(mockAuthResponse.accessToken);
      expect(response.body.data.user.id).toBe('user-123');
      expect(response.body.message).toBe('User registered successfully');

      const setCookie = response.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      expect(setCookie[0]).toContain('refreshToken=mock-refresh-token');
      expect(setCookie[0]).toContain('HttpOnly');
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send({ email: 'invalid' }).expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      authService.register.mockRejectedValue(new ConflictException('Email already exists'));

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
      authService.signIn.mockResolvedValue(mockAuthResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBe(mockAuthResponse.accessToken);
      expect(response.body.data.user.email).toBe('test@example.com');

      const setCookie = response.headers['set-cookie'];
      expect(setCookie[0]).toContain('refreshToken=mock-refresh-token');
    });

    it('should return 401 for invalid credentials', async () => {
      authService.signIn.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token from cookie', async () => {
      authService.refreshToken.mockResolvedValue(mockAuthResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refreshToken=old-refresh-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBe(mockAuthResponse.accessToken);
    });

    it('should return 401 when no refresh token', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile with valid token', async () => {
      authService.getProfile.mockResolvedValue(mockAuthResponse.user);

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('user-123');
      expect(response.body.data.email).toBe('test@example.com');
    });
  });
});
