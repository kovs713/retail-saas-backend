import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { Order } from '@/modules/order/entities';
import { Category, Product, ProductImage } from '@/modules/product/entities';
import { ProductRepository } from '@/modules/product/repositories';
import { Location, Shop } from '@/modules/shop/entities';
import { User } from '@/modules/user/entities';
import { getPostgresConnection } from '../../setup';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('ProductRepository Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let repository: ProductRepository;

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
      providers: [ProductRepository],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    repository = moduleFixture.get<ProductRepository>(ProductRepository);
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

  const createShop = async (
    name: string,
    slug: string,
    isActive: boolean = true,
  ): Promise<Shop> => {
    return dataSource.getRepository(Shop).save(
      dataSource.getRepository(Shop).create({
        name,
        slug,
        isActive,
      }),
    );
  };

  const createCategory = async (
    shopId: string,
    name: string,
    slug: string,
  ): Promise<Category> => {
    return dataSource.getRepository(Category).save(
      dataSource.getRepository(Category).create({
        shopId,
        name,
        slug,
      }),
    );
  };

  const createProduct = async (
    overrides: Partial<Product> &
      Pick<Product, 'shopId' | 'sku' | 'name' | 'price'>,
  ) => {
    const repo = dataSource.getRepository(Product);

    return repo.save(
      repo.create({
        quantity: 10,
        description: null,
        cost: null,
        categoryId: null,
        barcode: null,
        images: [],
        externalSource: 'evotor',
        metadata: { storefront: { publicationStatus: 'PUBLISHED' } },
        ...overrides,
      }),
    );
  };

  it('findAll returns only non-deleted products for the target shop ordered by newest first', async () => {
    const shopA = await createShop('Shop A', `product-shop-a-${Date.now()}`);
    const shopB = await createShop('Shop B', `product-shop-b-${Date.now()}`);
    const firstProduct = await createProduct({
      shopId: shopA.id,
      sku: 'SKU-001',
      name: 'First',
      price: 100,
    });
    const secondProduct = await createProduct({
      shopId: shopA.id,
      sku: 'SKU-002',
      name: 'Second',
      price: 200,
    });
    const deletedProduct = await createProduct({
      shopId: shopA.id,
      sku: 'SKU-003',
      name: 'Deleted',
      price: 300,
    });
    await createProduct({
      shopId: shopB.id,
      sku: 'SKU-004',
      name: 'Other shop',
      price: 400,
    });
    await repository.softDeleteById(deletedProduct.id);

    const [products, total] = await repository.findAll(shopA.id, {});

    expect(total).toBe(2);
    expect(products.map((product) => product.id)).toEqual([
      secondProduct.id,
      firstProduct.id,
    ]);
  });

  it('findAll applies category, search, price range and sorting behavior', async () => {
    const shop = await createShop('Filter Shop', `filter-shop-${Date.now()}`);
    const category = await createCategory(
      shop.id,
      'Electronics',
      `electronics-${Date.now()}`,
    );
    await createProduct({
      shopId: shop.id,
      sku: 'SKU-TV',
      name: 'Television',
      price: 700,
      categoryId: category.id,
    });
    const matchingProduct = await createProduct({
      shopId: shop.id,
      sku: 'SPECIAL-%_',
      name: 'Camera %_ Edition',
      price: 300,
      quantity: 4,
      categoryId: category.id,
      barcode: 'BAR-1',
    });
    await createProduct({
      shopId: shop.id,
      sku: 'SKU-CHEAP',
      name: 'Cheap camera',
      price: 50,
      categoryId: category.id,
    });
    await createProduct({
      shopId: shop.id,
      sku: 'SKU-BOOK',
      name: 'Book',
      price: 40,
    });

    const [products, total] = await repository.findAll(shop.id, {
      category: category.id,
      search: '%_',
      minPrice: 200,
      maxPrice: 500,
      sortBy: 'price',
      sortOrder: 'ASC',
    });

    expect(total).toBe(1);
    expect(products).toHaveLength(1);
    expect(products[0].id).toBe(matchingProduct.id);
  });

  it('findAll caps page size at 100', async () => {
    const shop = await createShop('Cap Shop', `cap-shop-${Date.now()}`);

    for (let index = 0; index < 101; index += 1) {
      await createProduct({
        shopId: shop.id,
        sku: `SKU-CAP-${index}`,
        name: `Cap Product ${index}`,
        price: index,
      });
    }

    const [products, total] = await repository.findAll(shop.id, { limit: 150 });

    expect(total).toBe(101);
    expect(products).toHaveLength(100);
  });

  it('findAll loads product category relation', async () => {
    const shop = await createShop(
      'Relation Shop',
      `relation-shop-${Date.now()}`,
    );
    const category = await createCategory(
      shop.id,
      'Electronics',
      `electronics-${Date.now()}`,
    );
    const productWithCategory = await createProduct({
      shopId: shop.id,
      sku: 'SKU-WITH-CAT',
      name: 'With Category',
      price: 100,
      categoryId: category.id,
    });
    const productWithoutCategory = await createProduct({
      shopId: shop.id,
      sku: 'SKU-WITHOUT-CAT',
      name: 'Without Category',
      price: 50,
      categoryId: null,
    });

    const [products] = await repository.findAll(shop.id, {});

    const withCat = products.find((p) => p.id === productWithCategory.id);
    const withoutCat = products.find((p) => p.id === productWithoutCategory.id);

    expect(withCat?.category).toBeDefined();
    expect(withCat?.category?.id).toBe(category.id);
    expect(withCat?.category?.name).toBe('Electronics');
    expect(withoutCat?.category).toBeNull();
  });

  it('findById, findBySku and findByBarcode stay scoped to shop and exclude soft-deleted rows', async () => {
    const shopA = await createShop('Lookup Shop A', `lookup-a-${Date.now()}`);
    const shopB = await createShop('Lookup Shop B', `lookup-b-${Date.now()}`);
    const product = await createProduct({
      shopId: shopA.id,
      sku: 'SKU-LOOKUP',
      name: 'Lookup Product',
      price: 150,
      barcode: 'BARCODE-LOOKUP',
    });

    await expect(
      repository.findById(product.id, shopA.id),
    ).resolves.toMatchObject({ id: product.id });
    await expect(
      repository.findBySku('SKU-LOOKUP', shopA.id),
    ).resolves.toMatchObject({ id: product.id });
    await expect(
      repository.findByBarcode('BARCODE-LOOKUP', shopA.id),
    ).resolves.toMatchObject({ id: product.id });
    await expect(repository.findById(product.id, shopB.id)).resolves.toBeNull();

    await repository.softDeleteById(product.id);

    await expect(repository.findById(product.id, shopA.id)).resolves.toBeNull();
    await expect(
      repository.findBySku('SKU-LOOKUP', shopA.id),
    ).resolves.toBeNull();
    await expect(
      repository.findByBarcode('BARCODE-LOOKUP', shopA.id),
    ).resolves.toBeNull();
  });

  it('findByIdWithShop and findByIdAndShopSlug load only products from active matching shops', async () => {
    const activeShop = await createShop(
      'Active Shop',
      `active-shop-${Date.now()}`,
      true,
    );
    const inactiveShop = await createShop(
      'Inactive Shop',
      `inactive-shop-${Date.now()}`,
      false,
    );
    const activeProduct = await createProduct({
      shopId: activeShop.id,
      sku: 'SKU-ACTIVE',
      name: 'Active',
      price: 100,
    });
    const inactiveProduct = await createProduct({
      shopId: inactiveShop.id,
      sku: 'SKU-INACTIVE',
      name: 'Inactive',
      price: 100,
    });

    const withShop = await repository.findByIdWithShop(
      activeProduct.id,
      activeShop.id,
    );
    const byActiveSlug = await repository.findByIdAndShopSlug(
      activeProduct.id,
      activeShop.slug,
    );
    const byInactiveSlug = await repository.findByIdAndShopSlug(
      inactiveProduct.id,
      inactiveShop.slug,
    );

    expect(withShop?.shop.id).toBe(activeShop.id);
    expect(byActiveSlug?.id).toBe(activeProduct.id);
    expect(byActiveSlug?.shop.id).toBe(activeShop.id);
    expect(byInactiveSlug).toBeNull();
  });

  it('findLowStock uses threshold and excludes deleted products', async () => {
    const shop = await createShop('Stock Shop', `stock-shop-${Date.now()}`);
    const lowStockProduct = await createProduct({
      shopId: shop.id,
      sku: 'SKU-LOW',
      name: 'Low',
      price: 10,
      quantity: 3,
    });
    const highStockProduct = await createProduct({
      shopId: shop.id,
      sku: 'SKU-HIGH',
      name: 'High',
      price: 10,
      quantity: 15,
    });
    const deletedLowStock = await createProduct({
      shopId: shop.id,
      sku: 'SKU-DEL',
      name: 'Deleted Low',
      price: 10,
      quantity: 2,
    });
    await repository.softDeleteById(deletedLowStock.id);

    const defaultLowStock = await repository.findLowStock(shop.id);
    const thresholdLowStock = await repository.findLowStock(shop.id, 5);

    expect(defaultLowStock.map((product) => product.id)).toContain(
      lowStockProduct.id,
    );
    expect(defaultLowStock.map((product) => product.id)).not.toContain(
      deletedLowStock.id,
    );
    expect(defaultLowStock.map((product) => product.id)).not.toContain(
      highStockProduct.id,
    );
    expect(thresholdLowStock.map((product) => product.id)).toEqual([
      lowStockProduct.id,
    ]);
  });

  it('countByShop and countByCategory count only non-deleted products in scope', async () => {
    const shop = await createShop('Count Shop', `count-shop-${Date.now()}`);
    const category = await createCategory(
      shop.id,
      'Count Category',
      `count-category-${Date.now()}`,
    );
    await createProduct({
      shopId: shop.id,
      sku: 'SKU-COUNT-1',
      name: 'Count 1',
      price: 10,
      categoryId: category.id,
    });
    const deletedProduct = await createProduct({
      shopId: shop.id,
      sku: 'SKU-COUNT-2',
      name: 'Count 2',
      price: 20,
      categoryId: category.id,
    });
    await createProduct({
      shopId: shop.id,
      sku: 'SKU-COUNT-3',
      name: 'Other category',
      price: 30,
    });
    await repository.softDeleteById(deletedProduct.id);

    await expect(repository.countByShop(shop.id)).resolves.toBe(2);
    await expect(
      repository.countByShop(shop.id, { categoryId: category.id }),
    ).resolves.toBe(1);
    await expect(
      repository.countByCategory(shop.id, category.id),
    ).resolves.toBe(1);
  });

  it('findOneWithDeleted, updateQuantity, incrementQuantity, existsBySkuAndShop and restoreById expose persisted state changes', async () => {
    const shop = await createShop('Mutate Shop', `mutate-shop-${Date.now()}`);
    const product = await createProduct({
      shopId: shop.id,
      sku: 'SKU-MUTATE',
      name: 'Mutate',
      price: 100,
      quantity: 5,
    });

    await expect(
      repository.existsBySkuAndShop('SKU-MUTATE', shop.id),
    ).resolves.toBe(true);
    await expect(
      repository.existsBySkuAndShop('MISSING', shop.id),
    ).resolves.toBe(false);

    await repository.updateQuantity(product.id, shop.id, 20);
    await repository.incrementQuantity(product.id, shop.id, 3);
    await repository.softDeleteById(product.id);

    const deletedProduct = await repository.findOneWithDeleted(
      product.id,
      shop.id,
    );

    expect(deletedProduct?.quantity).toBe(23);
    expect(deletedProduct?.deletedAt).toBeTruthy();

    const restoreResult = await repository.restoreById(product.id);
    const restoredProduct = await repository.findById(product.id, shop.id);

    expect(restoreResult.affected).toBe(1);
    expect(restoredProduct?.quantity).toBe(23);
  });
});
