import { Role } from '@/common/enums';
import { Category, Product } from '@/modules/product/entities';
import { Shop } from '@/modules/shop/entities';
import { User } from '@/modules/user/entities';
import { AppModule } from 'src/app.module';

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
  categories: { name: string; slug: string }[];
  products: { name: string; price: number; cost: number }[];
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
      { name: 'iPhone 15 Pro', price: 999, cost: 750 },
      { name: 'Samsung Galaxy S24', price: 899, cost: 650 },
      { name: 'MacBook Pro 16"', price: 2499, cost: 1900 },
      { name: 'Dell XPS 15', price: 1799, cost: 1400 },
      { name: 'AirPods Pro', price: 249, cost: 150 },
      { name: 'Sony WH-1000XM5', price: 399, cost: 280 },
      { name: 'USB-C Hub', price: 49, cost: 25 },
      { name: 'Wireless Charger', price: 39, cost: 18 },
      { name: 'Phone Case Premium', price: 29, cost: 10 },
      { name: 'Screen Protector', price: 19, cost: 5 },
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
      { name: 'Classic White Shirt', price: 59, cost: 25 },
      { name: 'Slim Fit Jeans', price: 89, cost: 40 },
      { name: 'Summer Dress', price: 129, cost: 60 },
      { name: 'Leather Jacket', price: 299, cost: 150 },
      { name: 'Running Shoes', price: 149, cost: 70 },
      { name: 'Casual Sneakers', price: 119, cost: 55 },
      { name: 'Leather Bag', price: 199, cost: 90 },
      { name: 'Canvas Backpack', price: 79, cost: 35 },
      { name: 'Wool Scarf', price: 49, cost: 20 },
      { name: 'Sunglasses', price: 159, cost: 75 },
    ],
  },
] as const;

async function clearDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async () => {
    for (const table of ['products', 'categories', 'orders', 'chat_events', 'storefront_views', 'users', 'shops']) {
      await dataSource.query(`DELETE FROM "${table}"`);
    }
  });
}

async function seedShops(dataSource: DataSource): Promise<Shop[]> {
  const shopRepo = dataSource.getRepository(Shop);
  return Promise.all(
    SHOP_SEEDS.map((data) =>
      shopRepo.save(
        shopRepo.create({
          name: data.name,
          slug: data.slug,
          description: data.description,
        }),
      ),
    ),
  );
}

async function seedUsers(dataSource: DataSource, shops: Shop[]): Promise<User[]> {
  const userRepo = dataSource.getRepository(User);
  const passwordHash = await hash('changeme123', 10);
  const adminPasswordHash = await hash('admin123', 10);

  return Promise.all([
    userRepo.save(
      userRepo.create({
        email: 'owner@electronics-hub.com',
        passwordHash,
        role: Role.OWNER,
        shopId: shops[0].id,
        isActive: true,
      }),
    ),
    userRepo.save(
      userRepo.create({
        email: 'owner@fashion-store.com',
        passwordHash,
        role: Role.OWNER,
        shopId: shops[1].id,
        isActive: true,
      }),
    ),
    userRepo.save(
      userRepo.create({
        email: 'admin@retail-saas.com',
        passwordHash: adminPasswordHash,
        role: Role.ADMIN,
        shopId: null,
        isActive: true,
      }),
    ),
    userRepo.save(
      userRepo.create({
        email: 'manager@electronics-hub.com',
        passwordHash,
        role: Role.EMPLOYEE,
        shopId: shops[0].id,
        isActive: true,
      }),
    ),
    userRepo.save(
      userRepo.create({
        email: 'manager@fashion-store.com',
        passwordHash,
        role: Role.EMPLOYEE,
        shopId: shops[1].id,
        isActive: true,
      }),
    ),
  ]);
}

async function seedCategories(dataSource: DataSource, shops: Shop[]): Promise<Category[]> {
  const categoryRepo = dataSource.getRepository(Category);
  return Promise.all(
    SHOP_SEEDS.flatMap((seed, i) =>
      seed.categories.map((cat) =>
        categoryRepo.save(
          categoryRepo.create({
            name: cat.name,
            slug: cat.slug,
            shopId: shops[i].id,
          }),
        ),
      ),
    ),
  );
}

async function seedProducts(dataSource: DataSource, shops: Shop[], categories: Category[]): Promise<void> {
  const productRepo = dataSource.getRepository(Product);
  const shopCategories = [categories.slice(0, 4), categories.slice(4, 8)];

  await Promise.all(
    SHOP_SEEDS.flatMap((seed, i) =>
      seed.products.map((prod) => {
        const category = shopCategories[i][Math.floor(Math.random() * shopCategories[i].length)];
        return productRepo.save(
          productRepo.create({
            name: prod.name,
            price: prod.price,
            cost: prod.cost,
            shopId: shops[i].id,
            categoryId: category.id,
            sku: faker.string.alphanumeric(8).toUpperCase(),
            description: faker.commerce.productDescription(),
            quantity: faker.number.int({ min: 10, max: 500 }),
            barcode: faker.commerce.upc(),
            images: [
              faker.image.dataUri({ width: 400, height: 400 }),
              faker.image.dataUri({ width: 400, height: 400 }),
            ],
            metadata: {
              brand: faker.company.name(),
              warranty: `${faker.number.int({ min: 1, max: 3 })} years`,
            },
          }),
        );
      }),
    ),
  );
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await app.init();

  const dataSource = app.get<DataSource>(DataSource);
  await dataSource.synchronize(true);

  await clearDatabase(dataSource);

  const shops = await seedShops(dataSource);
  const users = await seedUsers(dataSource, shops);

  const shopRepo = dataSource.getRepository(Shop);
  shops[0].ownerId = users[0].id;
  shops[1].ownerId = users[1].id;
  await shopRepo.save(shops);

  const categories = await seedCategories(dataSource, shops);
  await seedProducts(dataSource, shops, categories);

  await app.close();
}

bootstrap().catch(() => process.exit(1));
