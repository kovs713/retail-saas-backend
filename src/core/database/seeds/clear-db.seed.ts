import { AppModule } from 'src/app.module';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await app.init();

  const dataSource = app.get<DataSource>(DataSource);
  await dataSource.synchronize(true);

  await app.close();
}

bootstrap().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown clear-db error';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
