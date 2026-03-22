import { AppModule } from '@/app/app.module';
import { Shop } from '@/modules/shop/entities/shop.entity';
import { User } from '@/modules/user/entities/user.entity';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await app.init();
  const dataSource = app.get<DataSource>(DataSource);

  await dataSource.synchronize(true);

  const shopRepo = dataSource.getRepository(Shop);
  const userRepo = dataSource.getRepository(User);

  const defaultShop = await shopRepo.findOne({ where: { slug: 'default' } });

  if (defaultShop) {
    await app.close();
    return;
  }

  const shop = shopRepo.create({
    name: 'Default Shop',
    slug: 'default',
    description: 'Default shop for testing',
    isActive: true,
  });

  const savedShop = await shopRepo.save(shop);

  const passwordHash = await hash('changeme123', 10);
  const ownerUser = userRepo.create({
    email: 'owner@default.com',
    passwordHash,
    role: 'owner',
    isActive: true,
    shopId: savedShop.id,
  });

  await userRepo.save(ownerUser);

  savedShop.ownerId = ownerUser.id;
  await shopRepo.save(savedShop);

  await app.close();
}

bootstrap().catch(() => {
  process.exit(1);
});
