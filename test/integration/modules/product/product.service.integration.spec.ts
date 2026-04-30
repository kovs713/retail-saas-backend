import { mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { EvotorApiService } from '@/modules/evotor/evotor-api.service';
import { Order } from '@/modules/order/entities';
import { Category, Product } from '@/modules/product/entities';
import { ProductService } from '@/modules/product/product.service';
import { CatalogIndexService } from '@/modules/product/catalog-index.service';
import {
  CategoryRepository,
  ProductRepository,
} from '@/modules/product/repositories';
import { Location, Shop } from '@/modules/shop/entities';
import {
  LocationRepository,
  ShopRepository,
} from '@/modules/shop/repositories';
import { ShopService } from '@/modules/shop/shop.service';
import { StorageService } from '@/modules/storage/storage.service';
import { User } from '@/modules/user/entities';
import { getPostgresConnection } from '../../setup';

import { createMock } from '@golevelup/ts-jest';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
          Category,
          ChatEvent,
          StorefrontView,
          Order,
        ]),
      ],
      providers: [
        ProductService,
        ProductRepository,
        CategoryRepository,
        ShopService,
        ShopRepository,
        LocationRepository,
        { provide: CacheService, useValue: mockCacheService() },
        {
          provide: StorageService,
          useValue: createMock<StorageService>,
        },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>,
        },
        {
          provide: EvotorApiService,
          useValue: createMock<EvotorApiService>(),
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
    const shop = dataSource.getRepository(Shop).create({
      name: 'Integration Test Shop',
      slug: `integration-shop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    });
    const savedShop = await dataSource.getRepository(Shop).save(shop);
    shopId = savedShop.id;
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM categories');
    await dataSource.query('DELETE FROM shops');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 30000);

  describe('create', () => {
    it('should create a product successfully', async () => {
      const result = await productService.create(
        { sku: 'PROD-001', name: 'Test Product', price: 100, quantity: 100 },
        shopId,
      );

      expect(result.id).toBeDefined();
      expect(result.sku).toBe('PROD-001');
      expect(result.name).toBe('Test Product');
      expect(result.price).toBe(100);
      expect(result.quantity).toBe(100);
      expect(result.shopId).toBe(shopId);
    });

    it('should throw ConflictException for duplicate SKU', async () => {
      const dto = {
        sku: 'PROD-001',
        name: 'Test Product',
        price: 100,
        quantity: 100,
      };

      await productService.create(dto, shopId);

      await expect(productService.create(dto, shopId)).rejects.toThrow(
        'Product with this SKU already exists',
      );
    });
  });

  describe('findAll with ILike search', () => {
    beforeEach(async () => {
      const repo = dataSource.getRepository(Product);
      await repo.save([
        repo.create({
          sku: 'PROD-001',
          name: 'Test Product 1',
          price: 100,
          quantity: 10,
          shopId,
        }),
        repo.create({
          sku: 'PROD-002',
          name: 'Test Product 2',
          price: 150,
          quantity: 20,
          shopId,
        }),
        repo.create({
          sku: 'PROD-003',
          name: 'Another Product',
          price: 80,
          quantity: 30,
          shopId,
        }),
      ]);
    });

    it('should search products by name', async () => {
      const result = await productService.findAll(
        { page: 1, limit: 10, search: 'Test' },
        shopId,
      );

      expect(result.data).toHaveLength(2);
      expect(result.data?.every((p) => p.name.includes('Test'))).toBe(true);
    });

    it('should escape special characters in search', async () => {
      const repo = dataSource.getRepository(Product);
      const special = await repo.save(
        repo.create({
          sku: 'PROD-SPECIAL',
          name: 'Product %_special chars',
          price: 50,
          quantity: 5,
          shopId,
        }),
      );

      const result = await productService.findAll(
        { page: 1, limit: 10, search: '%_' },
        shopId,
      );

      expect(result.data?.some((p) => p.id === special.id)).toBe(true);
    });

    it('should filter by category', async () => {
      const catRepo = dataSource.getRepository(Category);
      const category = await catRepo.save(
        catRepo.create({ name: 'Electronics', slug: 'electronics', shopId }),
      );

      const prodRepo = dataSource.getRepository(Product);
      await prodRepo.save(
        prodRepo.create({
          sku: 'PROD-CAT',
          name: 'Categorized',
          price: 100,
          quantity: 10,
          shopId,
          categoryId: category.id,
        }),
      );

      const result = await productService.findAll(
        { page: 1, limit: 10, category: category.id },
        shopId,
      );

      expect(result.data?.every((p) => p.categoryId === category.id)).toBe(
        true,
      );
    });

    it('should return paginated results', async () => {
      const result = await productService.findAll(
        { page: 1, limit: 2 },
        shopId,
      );

      expect(result.data).toHaveLength(2);
      expect(result.pagination?.total).toBe(3);
      expect(result.pagination?.page).toBe(1);
      expect(result.pagination?.limit).toBe(2);
    });
  });

  describe('soft delete and restore', () => {
    it('should soft delete a product', async () => {
      const product = await productService.create(
        { sku: 'PROD-001', name: 'Test Product', price: 100, quantity: 100 },
        shopId,
      );

      await productService.remove(product.id, shopId);

      await expect(productService.findOne(product.id, shopId)).rejects.toThrow(
        'Product not found',
      );
    });

    it('should restore a soft deleted product', async () => {
      const product = await productService.create(
        { sku: 'PROD-001', name: 'Test Product', price: 100, quantity: 100 },
        shopId,
      );

      await productService.remove(product.id, shopId);

      const result = await productService.restore(product.id, shopId);

      expect(result.message).toBe('Product restored successfully');

      const restored = await productService.findOne(product.id, shopId);
      expect(restored.id).toBe(product.id);
    });
  });

  describe('stock operations', () => {
    it('should update stock quantity', async () => {
      const product = await productService.create(
        { sku: 'PROD-001', name: 'Test Product', price: 100, quantity: 100 },
        shopId,
      );

      const updated = await productService.updateStock(product.id, 150, shopId);
      expect(updated.quantity).toBe(150);
    });

    it('should not update stock for a product from another shop', async () => {
      const otherShop = await dataSource.getRepository(Shop).save(
        dataSource.getRepository(Shop).create({
          name: 'Other Shop',
          slug: `other-shop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }),
      );

      const product = await productService.create(
        {
          sku: 'PROD-OTHER-1',
          name: 'Other Product',
          price: 100,
          quantity: 100,
        },
        otherShop.id,
      );

      await expect(
        productService.updateStock(product.id, 150, shopId),
      ).rejects.toThrow('Product not found');

      const persisted = await dataSource
        .getRepository(Product)
        .findOneByOrFail({ id: product.id });
      expect(persisted.quantity).toBe(100);
    });

    it('should adjust stock (increment)', async () => {
      const product = await productService.create(
        { sku: 'PROD-001', name: 'Test Product', price: 100, quantity: 100 },
        shopId,
      );

      const updated = await productService.adjustStock(product.id, 50, shopId);
      expect(updated.quantity).toBe(150);
    });

    it('should not adjust stock for a product from another shop', async () => {
      const otherShop = await dataSource.getRepository(Shop).save(
        dataSource.getRepository(Shop).create({
          name: 'Other Shop Adjust',
          slug: `other-adjust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }),
      );

      const product = await productService.create(
        {
          sku: 'PROD-OTHER-2',
          name: 'Other Product',
          price: 100,
          quantity: 100,
        },
        otherShop.id,
      );

      await expect(
        productService.adjustStock(product.id, 50, shopId),
      ).rejects.toThrow('Product not found');

      const persisted = await dataSource
        .getRepository(Product)
        .findOneByOrFail({ id: product.id });
      expect(persisted.quantity).toBe(100);
    });

    it('should adjust stock (decrement)', async () => {
      const product = await productService.create(
        { sku: 'PROD-001', name: 'Test Product', price: 100, quantity: 100 },
        shopId,
      );

      const updated = await productService.adjustStock(product.id, -30, shopId);
      expect(updated.quantity).toBe(70);
    });
  });

  describe('findOneBySku', () => {
    it('should find product by SKU', async () => {
      const created = await productService.create(
        {
          sku: 'UNIQUE-SKU-123',
          name: 'Test Product',
          price: 100,
          quantity: 100,
        },
        shopId,
      );

      const found = await productService.findOneBySku('UNIQUE-SKU-123', shopId);

      expect(found.id).toBe(created.id);
      expect(found.sku).toBe('UNIQUE-SKU-123');
    });

    it('should throw NotFoundException for non-existent SKU', async () => {
      await expect(
        productService.findOneBySku('NON-EXISTENT', shopId),
      ).rejects.toThrow('Product not found');
    });
  });

  describe('findByBarcode', () => {
    it('should find product by barcode', async () => {
      const repo = dataSource.getRepository(Product);
      const product = await repo.save(
        repo.create({
          sku: 'PROD-001',
          name: 'Test Product',
          price: 100,
          quantity: 100,
          barcode: '5901234123457',
          shopId,
        }),
      );

      const found = await productService.findByBarcode('5901234123457', shopId);

      expect(found.id).toBe(product.id);
      expect(found.barcode).toBe('5901234123457');
    });
  });

  describe('findLowStock', () => {
    it('should return products below threshold', async () => {
      const repo = dataSource.getRepository(Product);
      await repo.save([
        repo.create({
          sku: 'PROD-LOW-1',
          name: 'Low Stock 1',
          price: 10,
          quantity: 5,
          shopId,
        }),
        repo.create({
          sku: 'PROD-LOW-2',
          name: 'Low Stock 2',
          price: 20,
          quantity: 3,
          shopId,
        }),
        repo.create({
          sku: 'PROD-HIGH',
          name: 'High Stock',
          price: 30,
          quantity: 100,
          shopId,
        }),
      ]);

      const result = await productService.findLowStock(10, shopId);

      expect(result).toHaveLength(2);
      expect(result.every((p) => p.quantity < 10)).toBe(true);
    });
  });

  describe('count operations', () => {
    let categoryId: string;

    beforeEach(async () => {
      const catRepo = dataSource.getRepository(Category);
      const category = await catRepo.save(
        catRepo.create({ name: 'Electronics', slug: 'electronics', shopId }),
      );
      categoryId = category.id;

      const prodRepo = dataSource.getRepository(Product);
      await prodRepo.save([
        prodRepo.create({
          sku: 'PROD-001',
          name: 'Product 1',
          price: 100,
          quantity: 10,
          shopId,
          categoryId,
        }),
        prodRepo.create({
          sku: 'PROD-002',
          name: 'Product 2',
          price: 150,
          quantity: 20,
          shopId,
          categoryId,
        }),
        prodRepo.create({
          sku: 'PROD-003',
          name: 'Product 3',
          price: 80,
          quantity: 30,
          shopId,
        }),
      ]);
    });

    it('should count all products in shop', async () => {
      const count = await productService.count(shopId);
      expect(count).toBe(3);
    });

    it('should count products by category', async () => {
      const count = await productService.countByCategory(categoryId, shopId);
      expect(count).toBe(2);
    });
  });
});
