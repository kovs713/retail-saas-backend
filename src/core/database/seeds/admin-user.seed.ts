import { Role } from '@/common/enums';
import { User } from '@/modules/user/entities';
import { AppModule } from 'src/app.module';

import { NestFactory } from '@nestjs/core';
import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const dataSource = app.get<DataSource>(DataSource);
    const userRepository = dataSource.getRepository(User);
    const email = process.env.SEED_ADMIN_EMAIL;
    const passwordHash = await hash(getRequiredEnv('SEED_ADMIN_PASSWORD'), 10);

    await userRepository.upsert(
      {
        email,
        passwordHash,
        role: Role.ADMIN,
        isActive: true,
        shopId: null,
      },
      ['email'],
    );

    process.stdout.write(`Seeded admin user: ${email}\n`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown admin seed error';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
