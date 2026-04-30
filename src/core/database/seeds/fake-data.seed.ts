import { Role } from '@/common/enums';
import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { Category, Product } from '@/modules/product/entities';
import { Shop } from '@/modules/shop/entities';
import { User } from '@/modules/user/entities';
import { AppModule } from 'src/app.module';
import {
  CHAT_EVENT_QUERIES,
  SEED_LOCALE,
  SHOP_SEEDS,
  buildSeedUsers,
} from './fake-data.seed-data';

import { Faker, ru } from '@faker-js/faker';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';

const seedFaker = new Faker({ locale: [ru] });

if (SEED_LOCALE !== 'ru') {
  throw new Error('Unsupported fake seed locale');
}

async function clearDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async () => {
    for (const table of [
      'products',
      'categories',
      'orders',
      'chat_events',
      'storefront_views',
      'users',
      'shops',
    ]) {
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

async function seedUsers(
  dataSource: DataSource,
  shops: Shop[],
): Promise<User[]> {
  const userRepo = dataSource.getRepository(User);
  const passwordHash = await hash('changeme123', 10);
  const adminPasswordHash = await hash('admin123', 10);
  const userSeeds = buildSeedUsers();

  return Promise.all(
    userSeeds.map((userSeed) =>
      userRepo.save(
        userRepo.create({
          email: userSeed.email,
          passwordHash:
            userSeed.role === Role.ADMIN ? adminPasswordHash : passwordHash,
          role: userSeed.role,
          shopId:
            userSeed.shopSeedIndex === null
              ? null
              : shops[userSeed.shopSeedIndex].id,
          isActive: true,
        }),
      ),
    ),
  );
}

async function seedCategories(
  dataSource: DataSource,
  shops: Shop[],
): Promise<Category[]> {
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

async function seedProducts(
  dataSource: DataSource,
  shops: Shop[],
  categories: Category[],
): Promise<void> {
  const productRepo = dataSource.getRepository(Product);
  const categoriesByShopId = new Map<string, Category[]>();

  for (const category of categories) {
    const shopCategories = categoriesByShopId.get(category.shopId) ?? [];
    shopCategories.push(category);
    categoriesByShopId.set(category.shopId, shopCategories);
  }

  await Promise.all(
    SHOP_SEEDS.flatMap((seed, i) =>
      seed.products.map((prod) => {
        const shopCategoryList = categoriesByShopId.get(shops[i].id) ?? [];

        if (shopCategoryList.length === 0) {
          throw new Error(`No categories seeded for shop ${shops[i].slug}`);
        }

        const category = seedFaker.helpers.arrayElement(shopCategoryList);

        return productRepo.save(
          productRepo.create({
            name: prod.name,
            price: prod.price,
            cost: prod.cost,
            shopId: shops[i].id,
            categoryId: category.id,
            sku: seedFaker.string.alphanumeric(8).toUpperCase(),
            description: prod.description,
            quantity: seedFaker.number.int({ min: 10, max: 500 }),
            barcode: seedFaker.commerce.isbn(),
            images: [
              seedFaker.image.dataUri({ width: 400, height: 400 }),
              seedFaker.image.dataUri({ width: 400, height: 400 }),
            ],
            metadata: prod.metadata,
          }),
        );
      }),
    ),
  );
}

async function seedStorefrontViews(
  dataSource: DataSource,
  shops: Shop[],
): Promise<void> {
  const viewRepo = dataSource.getRepository(StorefrontView);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const views = shops.flatMap((shop) => {
    const count = seedFaker.number.int({ min: 50, max: 200 });
    return Array.from({ length: count }, () =>
      viewRepo.create({
        shopId: shop.id,
        createdAt: seedFaker.date.between({ from: thirtyDaysAgo, to: now }),
      }),
    );
  });

  await viewRepo.save(views);
}

async function seedChatEvents(
  dataSource: DataSource,
  shops: Shop[],
): Promise<void> {
  const eventRepo = dataSource.getRepository(ChatEvent);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const events = shops.flatMap((shop) => {
    const count = seedFaker.number.int({ min: 20, max: 100 });
    return Array.from({ length: count }, () =>
      eventRepo.create({
        shopId: shop.id,
        userQuery: seedFaker.helpers.arrayElement(CHAT_EVENT_QUERIES),
        answerLength: seedFaker.number.int({ min: 50, max: 500 }),
        sourcesCount: seedFaker.number.int({ min: 1, max: 5 }),
        createdAt: seedFaker.date.between({ from: thirtyDaysAgo, to: now }),
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
  const ownerEmails = new Set(
    buildSeedUsers()
      .filter((user) => user.role === Role.OWNER)
      .map((user) => user.email),
  );
  const ownerUsers = users.filter((user) => ownerEmails.has(user.email));

  shops.forEach((shop, index) => {
    shop.ownerId = ownerUsers[index]?.id ?? null;
  });

  await shopRepo.save(shops);

  const categories = await seedCategories(dataSource, shops);
  await seedProducts(dataSource, shops, categories);
  await seedStorefrontViews(dataSource, shops);
  await seedChatEvents(dataSource, shops);

  await app.close();
}

bootstrap().catch(() => process.exit(1));
