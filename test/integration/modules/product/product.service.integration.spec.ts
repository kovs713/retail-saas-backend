import { mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { ObjectStorageService } from '@/core/object-storage/object-storage.service';
import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { Order } from '@/modules/order/entities';
import { CatalogIndexService } from '@/modules/product/catalog-index.service';
import { Category, Product, ProductImage } from '@/modules/product/entities';
import { ProductService } from '@/modules/product/product.service';
import {
  CategoryRepository,
  ProductImageRepository,
  ProductRepository,
} from '@/modules/product/repositories';
import { Shop } from '@/modules/shop/entities';
import { Location } from '@/modules/shop/entities';
import { User } from '@/modules/user/entities';
import { getPostgresConnection } from '../../setup';

import { createMock } from '@golevelup/ts-jest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('ProductService Integration', () => {
  let app: INestApplication;
  let productService: ProductService;
  let dataSource: DataSource;
  let shopId: string;

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
        ]),
      ],
      providers: [
        ProductService,
        ProductRepository,
        ProductImageRepository,
        CategoryRepository,
        { provide: CacheService, useValue: mockCacheService() },
        {
          provide: ObjectStorageService,
          useValue: createMock<ObjectStorageService>(),
        },
        {
          provide: CatalogIndexService,
          useValue: createMock<CatalogIndexService>(),
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    productService = moduleFixture.get<ProductService>(ProductService);
    dataSource = moduleFixture.get<DataSource>(DataSource);
  }, 120000);

  beforeEach(async () => {
    const shop = await dataSource.getRepository(Shop).save({
      name: 'Integration Test Shop',
      slug: `integration-shop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isActive: true,
    });
    shopId = shop.id;
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query('DELETE FROM product_images');
      await dataSource.query('DELETE FROM orders');
      await dataSource.query('DELETE FROM chat_events');
      await dataSource.query('DELETE FROM storefront_views');
      await dataSource.query('DELETE FROM products');
      await dataSource.query('DELETE FROM categories');
      await dataSource.query('DELETE FROM shops');
      await dataSource.query('DELETE FROM users');
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 30000);

  const createSyncedProduct = async (
    overrides: Partial<Product> = {},
  ): Promise<Product> => {
    return dataSource.getRepository(Product).save({
      sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: 'Synced Product',
      price: 100,
      quantity: 10,
      shopId,
      externalSource: 'evotor',
      ...overrides,
    });
  };

  it('findAll returns synced products only', async () => {
    await createSyncedProduct({ name: 'Synced 1' });
    await dataSource.getRepository(Product).save({
      sku: `SKU-LOCAL-${Date.now()}`,
      name: 'Local Product',
      price: 20,
      quantity: 5,
      shopId,
      externalSource: null,
    });

    const result = await productService.findAll({ page: 1, limit: 10 }, shopId);

    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].name).toBe('Synced 1');
  });

  it('findOne returns synced product by id', async () => {
    const product = await createSyncedProduct({ name: 'Target Product' });

    const result = await productService.findOne(product.id, shopId);

    expect(result.id).toBe(product.id);
    expect(result.name).toBe('Target Product');
  });

  it('update updates synced product fields', async () => {
    const product = await createSyncedProduct({ name: 'Before Update' });

    const result = await productService.update(
      product.id,
      { name: 'After Update' },
      shopId,
    );

    expect(result.name).toBe('After Update');
  });

  it('findOneBySku finds synced product by sku', async () => {
    await createSyncedProduct({ sku: 'SKU-SYNC-1' });

    const found = await productService.findOneBySku('SKU-SYNC-1', shopId);

    expect(found.sku).toBe('SKU-SYNC-1');
  });

  it('findByBarcode finds synced product by barcode', async () => {
    const product = await createSyncedProduct({ barcode: '5901234123457' });

    const found = await productService.findByBarcode('5901234123457', shopId);

    expect(found.id).toBe(product.id);
    expect(found.barcode).toBe('5901234123457');
  });

  it('findLowStock returns synced products below threshold', async () => {
    await createSyncedProduct({ sku: 'LOW-1', quantity: 3 });
    await createSyncedProduct({ sku: 'HIGH-1', quantity: 50 });

    const result = await productService.findLowStock(10, shopId);

    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe('LOW-1');
  });

  it('count and countByCategory return synced counts', async () => {
    const category = await dataSource.getRepository(Category).save({
      name: 'Electronics',
      slug: `electronics-${Date.now()}`,
      shopId,
    });

    await createSyncedProduct({ sku: 'C-1', categoryId: category.id });
    await createSyncedProduct({ sku: 'C-2', categoryId: category.id });
    await dataSource.getRepository(Product).save({
      sku: `LOCAL-${Date.now()}`,
      name: 'Local',
      price: 1,
      quantity: 1,
      shopId,
      externalSource: null,
      categoryId: category.id,
    });

    const total = await productService.count(shopId);
    const byCategory = await productService.countByCategory(category.id, shopId);

    expect(total).toBe(2);
    expect(byCategory).toBe(2);
  });
});
