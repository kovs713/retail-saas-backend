import { Category, Product } from '@/modules/product/entities';
import { Shop } from '@/modules/shop/entities';
import { User } from '@/modules/user/entities';
import { AppModule } from 'src/app.module';
import { createAdminUser, createCategory, createEmployeeUser, createOwnerUser, createShop } from '../factories';

import { Faker, en } from '@faker-js/faker';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';

const faker = new Faker({ locale: [en] });

interface ShopSeedData {
  name: string;
  slug: string;
  description: string;
  products: { name: string; basePrice: number; cost: number }[];
  categories: { name: string; slug: string }[];
}

const SHOP_SEEDS: ShopSeedData[] = [
  {
    name: 'Electronics Hub',
    slug: 'electronics-hub',
    description: 'Premium electronics and gadgets',
    categories: [
      { name: 'Smartphones', slug: 'smartphones' },
      { name: 'Laptops', slug: 'laptops' },
      { name: 'Accessories', slug: 'accessories' },
      { name: 'Audio', slug: 'audio' },
    ],
    products: [
      { name: 'iPhone 15 Pro', basePrice: 999, cost: 750 },
      { name: 'Samsung Galaxy S24', basePrice: 899, cost: 650 },
      { name: 'MacBook Pro 16"', basePrice: 2499, cost: 1900 },
      { name: 'Dell XPS 15', basePrice: 1799, cost: 1400 },
      { name: 'AirPods Pro', basePrice: 249, cost: 150 },
      { name: 'Sony WH-1000XM5', basePrice: 399, cost: 280 },
      { name: 'USB-C Hub', basePrice: 49, cost: 25 },
      { name: 'Wireless Charger', basePrice: 39, cost: 18 },
      { name: 'Phone Case Premium', basePrice: 29, cost: 10 },
      { name: 'Screen Protector', basePrice: 19, cost: 5 },
    ],
  },
  {
    name: 'Fashion Store',
    slug: 'fashion-store',
    description: 'Trendy clothing and accessories',
    categories: [
      { name: 'Men', slug: 'men' },
      { name: 'Women', slug: 'women' },
      { name: 'Shoes', slug: 'shoes' },
      { name: 'Bags', slug: 'bags' },
    ],
    products: [
      { name: 'Classic White Shirt', basePrice: 59, cost: 25 },
      { name: 'Slim Fit Jeans', basePrice: 89, cost: 40 },
      { name: 'Summer Dress', basePrice: 129, cost: 60 },
      { name: 'Leather Jacket', basePrice: 299, cost: 150 },
      { name: 'Running Shoes', basePrice: 149, cost: 70 },
      { name: 'Casual Sneakers', basePrice: 119, cost: 55 },
      { name: 'Leather Bag', basePrice: 199, cost: 90 },
      { name: 'Canvas Backpack', basePrice: 79, cost: 35 },
      { name: 'Wool Scarf', basePrice: 49, cost: 20 },
      { name: 'Sunglasses', basePrice: 159, cost: 75 },
    ],
  },
];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await app.init();
  const dataSource = app.get<DataSource>(DataSource);

  await dataSource.synchronize(true);

  const shopRepo = dataSource.getRepository(Shop);
  const userRepo = dataSource.getRepository(User);
  const categoryRepo = dataSource.getRepository(Category);
  const productRepo = dataSource.getRepository(Product);

  await dataSource.transaction(async () => {
    await dataSource.query('DELETE FROM "products"');
    await dataSource.query('DELETE FROM "categories"');
    await dataSource.query('DELETE FROM "shops"');
    await dataSource.query('DELETE FROM "users"');
    await dataSource.query('DELETE FROM "orders"');
    await dataSource.query('DELETE FROM "chat_events"');
    await dataSource.query('DELETE FROM "storefront_views"');
  });

  const shops = await Promise.all(
    SHOP_SEEDS.map(async (data) => {
      const shop = shopRepo.create(
        createShop({ overrides: { name: data.name, slug: data.slug, description: data.description } }),
      );
      return shopRepo.save(shop);
    }),
  );

  const passwordHash = await hash('changeme123', 10);
  const adminPasswordHash = await hash('admin123', 10);

  const users = await Promise.all([
    userRepo.save(createOwnerUser(shops[0].id, { email: 'owner@electronics-hub.com', passwordHash })),
    userRepo.save(createOwnerUser(shops[1].id, { email: 'owner@fashion-store.com', passwordHash })),
    userRepo.save(createAdminUser({ passwordHash: adminPasswordHash })),
    userRepo.save(createEmployeeUser(shops[0].id, { email: 'manager@electronics-hub.com', passwordHash })),
    userRepo.save(createEmployeeUser(shops[1].id, { email: 'manager@fashion-store.com', passwordHash })),
  ]);

  shops[0].ownerId = users[0].id;
  shops[1].ownerId = users[1].id;
  await shopRepo.save(shops);

  const allCategories = await Promise.all([
    ...SHOP_SEEDS[0].categories.map((cat) =>
      categoryRepo.save(createCategory({ overrides: { name: cat.name, slug: cat.slug, shopId: shops[0].id } })),
    ),
    ...SHOP_SEEDS[1].categories.map((cat) =>
      categoryRepo.save(createCategory({ overrides: { name: cat.name, slug: cat.slug, shopId: shops[1].id } })),
    ),
  ]);

  const createProducts = async (products: ShopSeedData['products'], shop: Shop, categories: typeof allCategories) => {
    return Promise.all(
      products.map(async (prod) => {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const product = productRepo.create({
          name: prod.name,
          sku: faker.string.alphanumeric(8).toUpperCase(),
          description: faker.commerce.productDescription(),
          price: prod.basePrice,
          cost: prod.cost,
          quantity: faker.number.int({ min: 10, max: 500 }),
          categoryId: category.id,
          shopId: shop.id,
          barcode: faker.commerce.upc(),
          images: [faker.image.dataUri({ width: 400, height: 400 }), faker.image.dataUri({ width: 400, height: 400 })],
          metadata: {
            brand: faker.company.name(),
            warranty: `${faker.number.int({ min: 1, max: 3 })} years`,
          },
        });
        return productRepo.save(product);
      }),
    );
  };

  await createProducts(SHOP_SEEDS[0].products, shops[0], allCategories.slice(0, 4));
  await createProducts(SHOP_SEEDS[1].products, shops[1], allCategories.slice(4, 8));

  await app.close();
}

bootstrap().catch(() => {
  process.exit(1);
});
