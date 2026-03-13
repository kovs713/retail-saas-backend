/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Organization } from '@/modules/organization/entities/organization.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Product } from '@/modules/product/entities/product.entity';
import { AppModule } from '@/app/app.module';

import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await app.init();
  const dataSource = app.get<DataSource>(DataSource);

  await dataSource.synchronize(true);
  console.log('Database schema synchronized');

  const organizationRepo = dataSource.getRepository(Organization);
  const userRepo = dataSource.getRepository(User);
  const productRepo = dataSource.getRepository(Product);

  const defaultOrg = await organizationRepo.findOne({ where: { slug: 'default' } });

  if (defaultOrg) {
    console.log('Default organization already exists. Skipping seed.');
    await app.close();
    return;
  }

  const organization = organizationRepo.create({
    name: 'Default Organization',
    slug: 'default',
    isActive: true,
    metadata: { seeded: true, seedDate: new Date().toISOString() },
  });

  const savedOrg = await organizationRepo.save(organization);
  console.log(`Created default organization: ${savedOrg.id}`);

  const passwordHash = await hash('changeme123', 10);
  const adminUser = userRepo.create({
    email: 'admin@default.com',
    passwordHash,
    role: 'admin',
    isActive: true,
    organizationId: savedOrg.id,
  });

  await userRepo.save(adminUser);
  console.log(`Created admin user: ${adminUser.email} for organization: ${savedOrg.id}`);

  const existingProducts = await productRepo.find({ where: { organizationId: savedOrg.id } });
  if (existingProducts.length === 0) {
    const sampleProducts = productRepo.create([
      {
        sku: 'SAMPLE-001',
        name: 'Sample Product 1',
        description: 'This is a sample product for testing',
        price: 29.99,
        cost: 15.0,
        quantity: 100,
        category: 'Sample',
        organizationId: savedOrg.id,
      },
      {
        sku: 'SAMPLE-002',
        name: 'Sample Product 2',
        description: 'Another sample product for testing',
        price: 49.99,
        cost: 25.0,
        quantity: 50,
        category: 'Sample',
        organizationId: savedOrg.id,
      },
    ]);

    await productRepo.save(sampleProducts);
    console.log(`Created ${sampleProducts.length} sample products for organization: ${savedOrg.id}`);
  }

  console.log('Seed completed successfully!');
  console.log('Default Organization ID:', savedOrg.id);
  console.log('Admin User: admin@default.com / changeme123');

  await app.close();
}

bootstrap().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
