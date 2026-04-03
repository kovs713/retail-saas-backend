import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { Order } from '@/modules/order/entities';
import { Shop } from '@/modules/shop/entities';
import { ShopRepository } from '@/modules/shop/repositories';
import { User } from '@/modules/user/entities';
import { getPostgresConnection } from '../../setup';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('ShopRepository Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let repository: ShopRepository;

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
        TypeOrmModule.forFeature([Shop, User, ChatEvent, StorefrontView, Order]),
      ],
      providers: [ShopRepository],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    repository = moduleFixture.get<ShopRepository>(ShopRepository);
  }, 120000);

  afterEach(async () => {
    await dataSource.query('UPDATE shops SET "ownerId" = NULL');
    await dataSource.query('UPDATE users SET "shopId" = NULL');
    await dataSource.query('DELETE FROM shops');
    await dataSource.query('DELETE FROM users');
  });

  afterAll(async () => {
    await app.close();
  }, 30000);

  const createUser = async (email: string): Promise<User> => {
    return dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email,
        passwordHash: 'hashed-password',
        role: 'owner',
      }),
    );
  };

  const createShop = async (name: string, slug: string, ownerId?: string | null): Promise<Shop> => {
    return dataSource.getRepository(Shop).save(
      dataSource.getRepository(Shop).create({
        name,
        slug,
        ownerId: ownerId ?? null,
      }),
    );
  };

  it('findBySlug returns the matching shop', async () => {
    const savedShop = await createShop('Slug Shop', `slug-shop-${Date.now()}`);
    await createShop('Other Shop', `other-shop-${Date.now()}`);

    const result = await repository.findBySlug(savedShop.slug);

    expect(result?.id).toBe(savedShop.id);
    expect(result?.slug).toBe(savedShop.slug);
  });

  it('findById returns the matching shop', async () => {
    const savedShop = await createShop('Id Shop', `id-shop-${Date.now()}`);

    const result = await repository.findById(savedShop.id);

    expect(result?.slug).toBe(savedShop.slug);
  });

  it('findByOwnerId returns the shop owned by the given user', async () => {
    const owner = await createUser(`owner-${Date.now()}@example.com`);
    const otherOwner = await createUser(`other-owner-${Date.now()}@example.com`);
    const ownedShop = await createShop('Owned Shop', `owned-shop-${Date.now()}`, owner.id);
    await createShop('Other Owned Shop', `other-owned-shop-${Date.now()}`, otherOwner.id);

    const result = await repository.findByOwnerId(owner.id);

    expect(result?.id).toBe(ownedShop.id);
    expect(result?.ownerId).toBe(owner.id);
  });

  it('existsBySlug returns true only for existing slug', async () => {
    const savedShop = await createShop('Exists Shop', `exists-shop-${Date.now()}`);

    await expect(repository.existsBySlug(savedShop.slug)).resolves.toBe(true);
    await expect(repository.existsBySlug(`missing-${Date.now()}`)).resolves.toBe(false);
  });

  it('existsBySlugAndNotId ignores the current shop id and detects another shop with the slug', async () => {
    const currentShop = await createShop('Current Shop', `current-shop-${Date.now()}`);
    const otherShop = await createShop('Other Shop', `other-shop-${Date.now()}`);

    await expect(repository.existsBySlugAndNotId(currentShop.slug, currentShop.id)).resolves.toBe(false);

    await expect(repository.existsBySlugAndNotId(otherShop.slug, currentShop.id)).resolves.toBe(true);
  });
});
