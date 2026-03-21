import { Product } from '@/modules/product/entities/product.entity';
import { ProductModule } from '@/modules/product/product.module';
import { ProductService } from '@/modules/product/product.service';
import { Shop } from '@/modules/shop/entities/shop.entity';
import { ShopModule } from '@/modules/shop/shop.module';
import { User } from '@/modules/user/entities/user.entity';
import { UserModule } from '@/modules/user/user.module';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

describe('Product Integration Tests', () => {
  let app: INestApplication;
  let productService: ProductService;
  let productRepository: Repository<Product>;
  let shopRepository: Repository<Shop>;
  let userRepository: Repository<User>;
  let dataSource: DataSource;
  let container: StartedTestContainer;

  let testShop: Shop;
  let testContext: { shopId: string };

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:18-alpine')
      .withDatabase('test_db')
      .withUsername('test')
      .withPassword('test')
      .start();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: container.getHost(),
          port: container.getMappedPort(5432),
          username: 'test',
          password: 'test',
          database: 'test_db',
          entities: [Product, Shop, User],
          synchronize: true,
          logging: false,
        }),
        ProductModule,
        ShopModule,
        UserModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    productService = module.get<ProductService>(ProductService);
    productRepository = module.get<Repository<Product>>('ProductRepository');
    shopRepository = module.get<Repository<Shop>>('ShopRepository');
    userRepository = module.get<Repository<User>>('UserRepository');
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE "products" RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE TABLE "shops" RESTART IDENTITY CASCADE');
    await dataSource.query('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');

    const shop = shopRepository.create({
      name: 'Test Shop',
      slug: 'test-shop',
      ownerId: 'owner-123',
    });
    testShop = await shopRepository.save(shop);
    testContext = { shopId: testShop.id };
  });

  describe('ProductService + TypeORM', () => {
    it('should create product and persist to database', async () => {
      const createDto = {
        sku: 'PROD-001',
        name: 'Test Product',
        price: 99.99,
        quantity: 100,
      };

      const result = await productService.create(createDto, testContext);

      expect(result.id).toBeDefined();
      expect(result.sku).toBe(createDto.sku);
      expect(result.name).toBe(createDto.name);
      expect(result.price).toBe(createDto.price);
      expect(result.shopId).toBe(testShop.id);

      const saved = await productRepository.findOne({ where: { id: result.id } });
      expect(saved).toBeDefined();
      expect(saved?.sku).toBe(createDto.sku);
    });

    it('should enforce unique SKU per shop', async () => {
      const createDto = {
        sku: 'PROD-001',
        name: 'Test Product',
        price: 99.99,
        quantity: 100,
      };

      await productService.create(createDto, testContext);

      await expect(productService.create(createDto, testContext)).rejects.toThrow();
    });

    it('should allow same SKU in different shops', async () => {
      const createDto = {
        sku: 'PROD-001',
        name: 'Test Product',
        price: 99.99,
        quantity: 100,
      };

      const shop2 = shopRepository.create({
        name: 'Shop 2',
        slug: 'shop-2',
        ownerId: 'owner-456',
      });
      await shopRepository.save(shop2);

      await productService.create(createDto, testContext);

      const result2 = await productService.create(createDto, { shopId: shop2.id });
      expect(result2.id).toBeDefined();
    });

    it('should soft delete and restore products', async () => {
      const product = await productService.create(
        {
          sku: 'PROD-001',
          name: 'Test Product',
          price: 99.99,
          quantity: 100,
        },
        testContext,
      );

      await productService.remove(product.id, testContext);

      const deleted = await productRepository.findOne({ where: { id: product.id }, withDeleted: true });
      expect(deleted?.deletedAt).toBeDefined();

      const notFound = await productRepository.findOne({ where: { id: product.id } });
      expect(notFound).toBeNull();

      await productService.restore(product.id, testContext);

      const restored = await productRepository.findOne({ where: { id: product.id } });
      expect(restored?.deletedAt).toBeNull();
    });

    it('should filter products by category', async () => {
      const category1 = 'Electronics';
      const category2 = 'Clothing';

      await productService.create(
        { sku: 'PROD-001', name: 'Laptop', price: 999.99, quantity: 10, categoryId: category1 as any },
        testContext,
      );
      await productService.create(
        { sku: 'PROD-002', name: 'T-Shirt', price: 19.99, quantity: 50, categoryId: category2 as any },
        testContext,
      );
      await productService.create(
        { sku: 'PROD-003', name: 'Phone', price: 599.99, quantity: 20, categoryId: category1 as any },
        testContext,
      );

      const electronics = await productService.findAll({ page: 1, limit: 10, category: category1 }, testContext);
      expect(electronics.data!).toHaveLength(2);
      expect(electronics.data!.every((p) => p.categoryId === category1)).toBe(true);
    });

    it('should search products by name and SKU', async () => {
      await productService.create(
        { sku: 'LAPTOP-001', name: 'Gaming Laptop', price: 1299.99, quantity: 5 },
        testContext,
      );
      await productService.create({ sku: 'PHONE-001', name: 'Smartphone', price: 699.99, quantity: 20 }, testContext);
      await productService.create(
        { sku: 'LAPTOP-002', name: 'Business Laptop', price: 899.99, quantity: 10 },
        testContext,
      );

      const searchLaptop = await productService.findAll({ page: 1, limit: 10, search: 'Laptop' }, testContext);
      expect(searchLaptop.data).toHaveLength(2);

      const search001 = await productService.findAll({ page: 1, limit: 10, search: '001' }, testContext);
      expect(search001.data).toHaveLength(2);
    });

    it('should handle pagination correctly', async () => {
      for (let i = 1; i <= 25; i++) {
        await productService.create(
          { sku: `PROD-${String(i).padStart(3, '0')}`, name: `Product ${i}`, price: i * 10, quantity: i },
          testContext,
        );
      }

      const page1 = await productService.findAll({ page: 1, limit: 10 }, testContext);
      expect(page1.data).toHaveLength(10);
      expect(page1.pagination!.total).toBe(25);
      expect(page1.pagination!.page).toBe(1);
      expect(page1.pagination!.totalPages).toBe(3);

      const page2 = await productService.findAll({ page: 2, limit: 10 }, testContext);
      expect(page2.data).toHaveLength(10);
      expect(page2.pagination!.page).toBe(2);

      const page3 = await productService.findAll({ page: 3, limit: 10 }, testContext);
      expect(page3.data).toHaveLength(5);
      expect(page3.pagination!.page).toBe(3);
    });
  });

  describe('Product Repository Queries', () => {
    it('should count products by category', async () => {
      await productService.create(
        { sku: 'PROD-001', name: 'Laptop', price: 999.99, quantity: 10, categoryId: 'electronics' as any },
        testContext,
      );
      await productService.create(
        { sku: 'PROD-002', name: 'Phone', price: 599.99, quantity: 20, categoryId: 'electronics' as any },
        testContext,
      );
      await productService.create(
        { sku: 'PROD-003', name: 'T-Shirt', price: 19.99, quantity: 50, categoryId: 'clothing' as any },
        testContext,
      );

      const electronicsCount = await productService.countByCategory('electronics', testContext);
      const clothingCount = await productService.countByCategory('clothing', testContext);

      expect(electronicsCount).toBe(2);
      expect(clothingCount).toBe(1);
    });

    it('should find low stock products', async () => {
      await productService.create({ sku: 'PROD-001', name: 'Product 1', price: 10, quantity: 5 }, testContext);
      await productService.create({ sku: 'PROD-002', name: 'Product 2', price: 20, quantity: 15 }, testContext);
      await productService.create({ sku: 'PROD-003', name: 'Product 3', price: 30, quantity: 3 }, testContext);
      await productService.create({ sku: 'PROD-004', name: 'Product 4', price: 40, quantity: 25 }, testContext);

      const lowStock = await productService.findLowStock(10, testContext);

      expect(lowStock).toHaveLength(2);
      expect(lowStock.every((p) => p.quantity < 10)).toBe(true);
    });

    it('should find product by barcode', async () => {
      const product = await productService.create(
        {
          sku: 'PROD-001',
          name: 'Test Product',
          price: 99.99,
          quantity: 100,
          barcode: '5901234123457',
        },
        testContext,
      );

      const found = await productService.findByBarcode('5901234123457', testContext);

      expect(found.id).toBe(product.id);
      expect(found.barcode).toBe('5901234123457');
    });

    it('should update stock quantity', async () => {
      const product = await productService.create(
        { sku: 'PROD-001', name: 'Test Product', price: 99.99, quantity: 100 },
        testContext,
      );

      const updated = await productService.updateStock(product.id, 50, testContext);
      expect(updated.quantity).toBe(50);

      const adjusted = await productService.adjustStock(product.id, 25, testContext);
      expect(adjusted.quantity).toBe(75);
    });

    it('should filter products by price range', async () => {
      await productService.create({ sku: 'PROD-001', name: 'Cheap', price: 10, quantity: 100 }, testContext);
      await productService.create({ sku: 'PROD-002', name: 'Medium', price: 50, quantity: 100 }, testContext);
      await productService.create({ sku: 'PROD-003', name: 'Expensive', price: 100, quantity: 100 }, testContext);

      const midRange = await productService.findAll({ page: 1, limit: 10, minPrice: 20, maxPrice: 80 }, testContext);

      expect(midRange.data!).toHaveLength(1);
      expect(midRange.data![0].name).toBe('Medium');
    });
  });

  describe('Product Constraints', () => {
    it('should maintain shop isolation', async () => {
      const shop2 = shopRepository.create({
        name: 'Shop 2',
        slug: 'shop-2',
        ownerId: 'owner-456',
      });
      await shopRepository.save(shop2);

      await productService.create({ sku: 'PROD-001', name: 'Shop 1 Product', price: 10, quantity: 10 }, testContext);
      await productService.create(
        { sku: 'PROD-001', name: 'Shop 2 Product', price: 20, quantity: 20 },
        { shopId: shop2.id },
      );

      const shop1Products = await productService.findAll({ page: 1, limit: 10 }, testContext);
      const shop2Products = await productService.findAll({ page: 1, limit: 10 }, { shopId: shop2.id });

      expect(shop1Products.data!).toHaveLength(1);
      expect(shop2Products.data!).toHaveLength(1);
      expect(shop1Products.data![0].name).toBe('Shop 1 Product');
      expect(shop2Products.data![0].name).toBe('Shop 2 Product');
    });

    it('should not return deleted products in findAll', async () => {
      const product1 = await productService.create(
        { sku: 'PROD-001', name: 'Product 1', price: 10, quantity: 10 },
        testContext,
      );
      await productService.create({ sku: 'PROD-002', name: 'Product 2', price: 20, quantity: 20 }, testContext);

      await productService.remove(product1.id, testContext);

      const all = await productService.findAll({ page: 1, limit: 10 }, testContext);
      expect(all.data!).toHaveLength(1);
      expect(all.data![0].id).not.toBe(product1.id);
    });
  });
});
