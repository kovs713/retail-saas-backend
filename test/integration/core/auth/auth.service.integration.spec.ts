import { RegistrationStatus } from '@/common/enums';
import { AuthConfig } from '@/common/types';
import { mockCacheService } from '@/common/utils';
import { AuthService } from '@/core/auth/auth.service';
import { CacheService } from '@/core/cache/cache.service';
import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { Order } from '@/modules/order/entities';
import { Category, Product, ProductImage } from '@/modules/product/entities';
import { RegistrationApplication } from '@/modules/registration-application/entities';
import { RegistrationApplicationService } from '@/modules/registration-application/registration-application.service';
import { Location, Shop } from '@/modules/shop/entities';
import {
  LocationRepository,
  ShopRepository,
} from '@/modules/shop/repositories';
import { ShopService } from '@/modules/shop/shop.service';
import { User } from '@/modules/user/entities';
import { UserRepository } from '@/modules/user/repositories';
import { UserService } from '@/modules/user/user.service';
import { getPostgresConnection } from '../../setup';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('AuthService Integration', () => {
  let app: INestApplication;
  let authService: AuthService;
  let registrationApplicationService: RegistrationApplicationService;
  let userService: UserService;
  let shopService: ShopService;
  let dataSource: DataSource;

  const mockAuthConfig = {
    refreshTokenCookie: 'refreshToken',
    refreshTokenMaxAge: 604800000,
  };

  beforeAll(async () => {
    const connection = getPostgresConnection();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: connection.host,
          port: connection.port,
          username: connection.username,
          password: connection.password,
          database: connection.database,
          autoLoadEntities: true,
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([
          Shop,
          Location,
          User,
          Product,
          ProductImage,
          Category,
          ChatEvent,
          StorefrontView,
          Order,
          RegistrationApplication,
        ]),
      ],
      providers: [
        AuthService,
        RegistrationApplicationService,
        UserService,
        UserRepository,
        ShopService,
        ShopRepository,
        LocationRepository,
        JwtService,
        { provide: AuthConfig, useValue: mockAuthConfig },
        {
          provide: CacheService,
          useValue: mockCacheService(),
        },
      ],
    })
      .overrideProvider(JwtService)
      .useValue(createMock<JwtService>())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authService = moduleFixture.get(AuthService);
    registrationApplicationService = moduleFixture.get(
      RegistrationApplicationService,
    );
    userService = moduleFixture.get(UserService);
    shopService = moduleFixture.get(ShopService);
    dataSource = moduleFixture.get(DataSource);

    const jwtService = moduleFixture.get<DeepMocked<JwtService>>(JwtService);
    jwtService.signAsync.mockResolvedValue('token');
  }, 120000);

  afterEach(async () => {
    if (!dataSource?.isInitialized) {
      return;
    }
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM product_images');
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM categories');
    await dataSource.query('DELETE FROM registration_applications');
    await dataSource.query('UPDATE shops SET "ownerId" = NULL');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM shops');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 30000);

  it('should reject registration application when user email already exists', async () => {
    await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email: 'taken@example.com',
        passwordHash: 'hash',
        role: 'owner',
        shopId: null,
      }),
    );

    await expect(
      registrationApplicationService.create({
        email: 'taken@example.com',
        password: 'password123',
        shopName: 'Rollback Shop',
        shopSlug: 'rollback-shop',
      }),
    ).rejects.toThrow();

    const shops = await dataSource
      .getRepository(Shop)
      .findBy({ slug: 'rollback-shop' });
    expect(shops).toHaveLength(0);
    const applications = await dataSource
      .getRepository(RegistrationApplication)
      .findBy({ email: 'taken@example.com' });
    expect(applications).toHaveLength(0);
  });

  it('should create pending registration application without creating user and shop', async () => {
    const result = await registrationApplicationService.create({
      email: 'new@example.com',
      password: 'password123',
      shopName: 'New Shop',
      shopSlug: 'new-shop',
    });

    expect(result.email).toBe('new@example.com');
    expect(result.status).toBe(RegistrationStatus.PENDING);

    await expect(userService.findByEmail('new@example.com')).rejects.toThrow();

    await expect(shopService.findBySlug('new-shop')).rejects.toThrow();

    const application = await dataSource
      .getRepository(RegistrationApplication)
      .findOneByOrFail({ email: 'new@example.com' });
    expect(application.shopName).toBe('New Shop');
  });

  it('should approve registration application and create user with shop', async () => {
    const application = await dataSource
      .getRepository(RegistrationApplication)
      .save(
        dataSource.getRepository(RegistrationApplication).create({
          email: 'approve@example.com',
          passwordHash: 'hashed-password',
          shopName: 'Approve Shop',
          shopSlug: 'approve-shop',
          status: RegistrationStatus.PENDING,
        }),
      );

    const registrationApplicationService = app.get(
      RegistrationApplicationService,
    );
    const approved = await registrationApplicationService.approve(
      application.id,
    );

    expect(approved.status).toBe(RegistrationStatus.APPROVED);

    const user = await userService.findByEmail('approve@example.com');
    expect(user.shopId).toBeDefined();

    const shop = await shopService.findBySlug('approve-shop');
    expect(shop.ownerId).toBe(user.id);
  });

  it('should sign in with valid credentials', async () => {
    await userService.create({
      email: 'signin@example.com',
      password: 'password123',
      role: 'owner',
      shopId: null,
    });

    const result = await authService.signIn({
      email: 'signin@example.com',
      password: 'password123',
    });

    expect(result.user.email).toBe('signin@example.com');
    expect(result.accessToken).toBe('token');
  });

  it('should reject sign in with wrong password', async () => {
    await userService.create({
      email: 'wrongpw@example.com',
      password: 'password123',
      role: 'owner',
      shopId: null,
    });

    await expect(
      authService.signIn({
        email: 'wrongpw@example.com',
        password: 'wrongpassword',
      }),
    ).rejects.toThrow();
  });
});
