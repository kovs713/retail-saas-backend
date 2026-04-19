import { Role } from '@/common/enums';
import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
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
  address: string;
  phone: string;
  workingHours: Record<string, string>;
  categories: { name: string; slug: string }[];
  products: { name: string; price: number; cost: number }[];
}

const SHOP_SEEDS: ShopSeedData[] = [
  {
    name: 'Electronics Hub',
    slug: 'electronics-hub',
    description: 'Premium electronics and gadgets',
    address: '123 Tech Street, Silicon Valley, CA 94025',
    phone: '+1-555-0101',
    workingHours: {
      monday: '9:00-21:00',
      tuesday: '9:00-21:00',
      wednesday: '9:00-21:00',
      thursday: '9:00-21:00',
      friday: '9:00-22:00',
      saturday: '10:00-22:00',
      sunday: '10:00-18:00',
    },
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
    address: '456 Fashion Ave, New York, NY 10018',
    phone: '+1-555-0202',
    workingHours: {
      monday: '10:00-20:00',
      tuesday: '10:00-20:00',
      wednesday: '10:00-20:00',
      thursday: '10:00-20:00',
      friday: '10:00-21:00',
      saturday: '10:00-21:00',
      sunday: '12:00-18:00',
    },
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
          address: data.address,
          phone: data.phone,
          workingHours: data.workingHours,
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

async function seedStorefrontViews(dataSource: DataSource, shops: Shop[]): Promise<void> {
  const viewRepo = dataSource.getRepository(StorefrontView);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const views = shops.flatMap((shop) => {
    const count = faker.number.int({ min: 50, max: 200 });
    return Array.from({ length: count }, () =>
      viewRepo.create({
        shopId: shop.id,
        createdAt: faker.date.between({ from: thirtyDaysAgo, to: now }),
      }),
    );
  });

  await viewRepo.save(views);
}

async function seedChatEvents(dataSource: DataSource, shops: Shop[]): Promise<void> {
  const eventRepo = dataSource.getRepository(ChatEvent);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const queries = [
    'What are your shipping options?',
    'Do you offer returns?',
    'Is this product in stock?',
    'What payment methods do you accept?',
    'Can I get a discount?',
    'How do I track my order?',
    'What is your warranty policy?',
    'Do you ship internationally?',
  ];

  const events = shops.flatMap((shop) => {
    const count = faker.number.int({ min: 20, max: 100 });
    return Array.from({ length: count }, () =>
      eventRepo.create({
        shopId: shop.id,
        userQuery: faker.helpers.arrayElement(queries),
        answerLength: faker.number.int({ min: 50, max: 500 }),
        sourcesCount: faker.number.int({ min: 1, max: 5 }),
        createdAt: faker.date.between({ from: thirtyDaysAgo, to: now }),
      }),
    );
  });

  await eventRepo.save(events);
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
  await seedStorefrontViews(dataSource, shops);
  await seedChatEvents(dataSource, shops);

  await app.close();
}

bootstrap().catch(() => process.exit(1));
