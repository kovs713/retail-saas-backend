import { AuthConfig } from '@/common/types';
import { mockCacheService } from '@/common/utils';
import { AuthService } from '@/core/auth/auth.service';
import { CacheService } from '@/core/cache/cache.service';
import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { Order } from '@/modules/order/entities';
import { Category, Product } from '@/modules/product/entities';
import { Location, Shop } from '@/modules/shop/entities';
import { LocationRepository, ShopRepository } from '@/modules/shop/repositories';
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
        TypeOrmModule.forFeature([Shop, Location, User, Product, Category, ChatEvent, StorefrontView, Order]),
      ],
      providers: [
        AuthService,
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
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM categories');
    await dataSource.query('UPDATE shops SET "ownerId" = NULL');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM shops');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 30000);

  it('should rollback shop creation when user email already exists', async () => {
    await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email: 'taken@example.com',
        passwordHash: 'hash',
        role: 'owner',
        shopId: null,
      }),
    );

    await expect(
      authService.register({
        email: 'taken@example.com',
        password: 'password123',
        shopName: 'Rollback Shop',
        shopSlug: 'rollback-shop',
      }),
    ).rejects.toThrow();

    const shops = await dataSource.getRepository(Shop).findBy({ slug: 'rollback-shop' });
    expect(shops).toHaveLength(0);
  });

  it('should register user and create shop in a transaction', async () => {
    const result = await authService.register({
      email: 'new@example.com',
      password: 'password123',
      shopName: 'New Shop',
      shopSlug: 'new-shop',
    });

    expect(result.user.email).toBe('new@example.com');
    expect(result.accessToken).toBe('token');

    const user = await userService.findByEmail('new@example.com');
    expect(user.email).toBe('new@example.com');

    const shop = await shopService.findBySlug('new-shop');
    expect(shop.name).toBe('New Shop');
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
