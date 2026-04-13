import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { Order } from '@/modules/order/entities';
import { Category, Product } from '@/modules/product/entities';
import { CategoryRepository } from '@/modules/product/repositories';
import { Location, Shop } from '@/modules/shop/entities';
import { User } from '@/modules/user/entities';
import { getPostgresConnection } from '../../setup';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('CategoryRepository Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let repository: CategoryRepository;

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
      providers: [CategoryRepository],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    repository = moduleFixture.get<CategoryRepository>(CategoryRepository);
  }, 120000);

  afterEach(async () => {
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM chat_events');
    await dataSource.query('DELETE FROM storefront_views');
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM categories');
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

  const createCategory = async (shopId: string, name: string, slug: string): Promise<Category> => {
    return dataSource.getRepository(Category).save(
      dataSource.getRepository(Category).create({
        shopId,
        name,
        slug,
      }),
    );
  };

  const createProduct = async (shopId: string, categoryId: string | null, sku: string): Promise<Product> => {
    return dataSource.getRepository(Product).save(
      dataSource.getRepository(Product).create({
        shopId,
        categoryId,
        sku,
        name: sku,
        price: 100,
        quantity: 1,
        description: null,
        cost: null,
        barcode: null,
        images: [],
        metadata: null,
      }),
    );
  };

  it('findAllByShop returns categories ordered by name and scoped to the target shop', async () => {
    const shopA = await createShop('Category Shop A', `category-shop-a-${Date.now()}`);
    const shopB = await createShop('Category Shop B', `category-shop-b-${Date.now()}`);
    const alpha = await createCategory(shopA.id, 'Alpha', `alpha-${Date.now()}`);
    const beta = await createCategory(shopA.id, 'Beta', `beta-${Date.now()}`);
    await createCategory(shopB.id, 'Other', `other-${Date.now()}`);

    const result = await repository.findAllByShop(shopA.id);

    expect(result.map((category) => category.id)).toEqual([alpha.id, beta.id]);
  });

  it('findBySlug and findByIdAndShop are scoped to the target shop', async () => {
    const shopA = await createShop('Slug Shop A', `slug-shop-a-${Date.now()}`);
    const shopB = await createShop('Slug Shop B', `slug-shop-b-${Date.now()}`);
    const category = await createCategory(shopA.id, 'Electronics', `electronics-${Date.now()}`);

    await expect(repository.findBySlug(shopA.id, category.slug)).resolves.toMatchObject({ id: category.id });
    await expect(repository.findBySlug(shopB.id, category.slug)).resolves.toBeNull();
    await expect(repository.findByIdAndShop(category.id, shopA.id)).resolves.toMatchObject({ id: category.id });
    await expect(repository.findByIdAndShop(category.id, shopB.id)).resolves.toBeNull();
  });

  it('existsBySlugAndShop reflects whether a slug is already taken inside the same shop', async () => {
    const shopA = await createShop('Exists Shop A', `exists-shop-a-${Date.now()}`);
    const shopB = await createShop('Exists Shop B', `exists-shop-b-${Date.now()}`);
    const category = await createCategory(shopA.id, 'Electronics', `electronics-${Date.now()}`);

    await expect(repository.existsBySlugAndShop(shopA.id, category.slug)).resolves.toBe(true);
    await expect(repository.existsBySlugAndShop(shopB.id, category.slug)).resolves.toBe(false);
  });

  it('countProductsInCategory counts only products assigned to that category', async () => {
    const shop = await createShop('Count Products Shop', `count-products-shop-${Date.now()}`);
    const category = await createCategory(shop.id, 'Phones', `phones-${Date.now()}`);
    const otherCategory = await createCategory(shop.id, 'Tablets', `tablets-${Date.now()}`);
    await createProduct(shop.id, category.id, 'SKU-CAT-1');
    await createProduct(shop.id, category.id, 'SKU-CAT-2');
    await createProduct(shop.id, otherCategory.id, 'SKU-CAT-3');
    await createProduct(shop.id, null, 'SKU-CAT-4');

    await expect(repository.countProductsInCategory(category.id)).resolves.toBe(2);
  });
});
