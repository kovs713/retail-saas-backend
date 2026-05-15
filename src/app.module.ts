import { CommonModule } from './common/common.module';
import { AuthModule } from './core/auth/auth.module';
import { CacheModule } from './core/cache/cache.module';
import { TypeOrmConfigService } from './core/database/config';
import { LoggerModule } from './core/logger/logger.module';
import { ObjectStorageModule } from './core/object-storage/object-storage.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DocPreprocessorModule } from './modules/doc-preprocessor/doc-preprocessor.module';
import { EvotorModule } from './modules/evotor/evotor.module';
import { OrderModule } from './modules/order/order.module';
import { ProductModule } from './modules/product/product.module';
import { RagModule } from './modules/rag/rag.module';
import { RegistrationApplicationModule } from './modules/registration-application/registration-application.module';
import { ShopModule } from './modules/shop/shop.module';
import { UserModule } from './modules/user/user.module';

import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.getOrThrow<string>('REDIS_HOST');
        const port = configService.getOrThrow<number>('REDIS_PORT');
        const password = configService.getOrThrow<string>('REDIS_PASSWORD');
        const throttlerStorage = new ThrottlerStorageRedisService(
          `redis://${host}:${port}`,
          {
            password: password || undefined,
          },
        );

        const storageInternal = throttlerStorage as unknown as {
          redis?: { on?: (event: string, callback: () => void) => void };
        };
        storageInternal.redis?.on?.('error', () => undefined);

        return {
          throttlers: [
            {
              name: 'default',
              ttl: configService.getOrThrow<number>('THROTTLE_TTL'),
              limit: configService.getOrThrow<number>('THROTTLE_LIMIT'),
            },
          ],
          storage: throttlerStorage,
        };
      },
    }),
    TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }),

    CommonModule,
    AuthModule.forRoot(),
    CacheModule.forRootAsync(),
    LoggerModule,

    AnalyticsModule,
    DocPreprocessorModule,
    EvotorModule,
    OrderModule,
    ProductModule,
    RagModule.forRoot(),
    RegistrationApplicationModule,
    ShopModule,
    ObjectStorageModule.forRoot(),
    UserModule,
  ],
})
export class AppModule {}
