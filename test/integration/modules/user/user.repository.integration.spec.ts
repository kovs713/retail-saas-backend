import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { Order } from '@/modules/order/entities';
import { Location, Shop } from '@/modules/shop/entities';
import { User } from '@/modules/user/entities';
import { UserRepository } from '@/modules/user/repositories';
import { getPostgresConnection } from '../../setup';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('UserRepository Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let repository: UserRepository;

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
        TypeOrmModule.forFeature([Shop, Location, User, ChatEvent, StorefrontView, Order]),
      ],
      providers: [UserRepository],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    repository = moduleFixture.get<UserRepository>(UserRepository);
  }, 120000);

  afterEach(async () => {
    await dataSource.query('UPDATE shops SET "ownerId" = NULL');
    await dataSource.query('UPDATE users SET "shopId" = NULL');
    await dataSource.query('DELETE FROM shops');
    await dataSource.query('DELETE FROM users');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 30000);

  const createShop = async (name: string, slug: string): Promise<Shop> => {
    return dataSource.getRepository(Shop).save(
      dataSource.getRepository(Shop).create({
        name,
        slug,
      }),
    );
  };

  const createUser = async (email: string, shopId: string | null): Promise<User> => {
    return dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email,
        passwordHash: 'hashed-password',
        role: 'member',
        shopId,
      }),
    );
  };

  it('findByEmail returns matching user only', async () => {
    const shop = await createShop('Users Shop', `users-shop-${Date.now()}`);
    const savedUser = await createUser('user-repo@example.com', shop.id);
    await createUser('another@example.com', shop.id);

    const result = await repository.findByEmail('user-repo@example.com');

    expect(result?.id).toBe(savedUser.id);
    expect(result?.email).toBe('user-repo@example.com');
  });

  it('findById returns null for missing id', async () => {
    const result = await repository.findById('00000000-0000-0000-0000-000000000000');

    expect(result).toBeNull();
  });

  it('findByShopId returns users scoped to the target shop and loads shop relation', async () => {
    const shopA = await createShop('Shop A', `shop-a-${Date.now()}`);
    const shopB = await createShop('Shop B', `shop-b-${Date.now()}`);
    const userA1 = await createUser('shop-a-1@example.com', shopA.id);
    const userA2 = await createUser('shop-a-2@example.com', shopA.id);
    await createUser('shop-b-1@example.com', shopB.id);

    const result = await repository.findByShopId(shopA.id);

    expect(result).toHaveLength(2);
    expect(result.map((user) => user.id).sort()).toEqual([userA1.id, userA2.id].sort());
    expect(result.every((user) => user.shopId === shopA.id)).toBe(true);
    expect(result.every((user) => user.shop?.id === shopA.id)).toBe(true);
  });

  it('existsByEmail returns true only for persisted email', async () => {
    const shop = await createShop('Exists Shop', `exists-shop-${Date.now()}`);
    await createUser('exists@example.com', shop.id);

    await expect(repository.existsByEmail('exists@example.com')).resolves.toBe(true);
    await expect(repository.existsByEmail('missing@example.com')).resolves.toBe(false);
  });

  it('existsByEmailAndNotId excludes the provided user id', async () => {
    const shop = await createShop('Exclude Shop', `exclude-shop-${Date.now()}`);
    const userA = await createUser('same@example.com', shop.id);
    const userB = await createUser('other@example.com', shop.id);

    await expect(repository.existsByEmailAndNotId('same@example.com', userA.id)).resolves.toBe(false);
    await expect(repository.existsByEmailAndNotId('same@example.com', userB.id)).resolves.toBe(true);
  });
});
