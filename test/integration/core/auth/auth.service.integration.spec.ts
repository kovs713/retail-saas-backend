import { mockCacheService } from '@/common/utils';
import { AuthService } from '@/core/auth/auth.service';
import { CacheService } from '@/core/cache/cache.service';
import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { Order } from '@/modules/order/entities';
import { Category, Product } from '@/modules/product/entities';
import { Shop } from '@/modules/shop/entities';
import { ShopService } from '@/modules/shop/shop.service';
import { User } from '@/modules/user/entities';
import { UserService } from '@/modules/user/user.service';
import { getPostgresConnection } from '../../setup';

import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('AuthService Integration', () => {
  let app: INestApplication;
  let authService: AuthService;
  let dataSource: DataSource;

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
        TypeOrmModule.forFeature([Shop, User, Product, Category, ChatEvent, StorefrontView, Order]),
      ],
      providers: [
        AuthService,
        JwtService,
        {
          provide: UserService,
          useValue: {},
        },
        {
          provide: ShopService,
          useValue: {},
        },
        {
          provide: CacheService,
          useValue: mockCacheService(),
        },
      ],
    })
      .overrideProvider(JwtService)
      .useValue({
        signAsync: jest.fn().mockResolvedValue('token'),
        verifyAsync: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authService = moduleFixture.get(AuthService);
    dataSource = moduleFixture.get(DataSource);
  }, 120000);

  afterEach(async () => {
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
    ).rejects.toThrow('Email or shop slug already exists');

    const shops = await dataSource.getRepository(Shop).findBy({ slug: 'rollback-shop' });
    expect(shops).toHaveLength(0);
  });
});
