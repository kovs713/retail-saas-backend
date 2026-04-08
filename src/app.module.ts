import { CommonModule } from './common/common.module';
import { AuthModule } from './core/auth/auth.module';
import { CacheModule } from './core/cache/cache.module';
import { TypeOrmConfigService } from './core/database/config';
import { LoggerModule } from './core/logger/logger.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { OrderModule } from './modules/order/order.module';
import { ProductModule } from './modules/product/product.module';
import { RagModule } from './modules/rag/rag.module';
import { ShopModule } from './modules/shop/shop.module';
import { StorageModule } from './modules/storage/storage.module';
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
        return {
          throttlers: [
            {
              name: 'default',
              ttl: configService.getOrThrow<number>('THROTTLE_TTL'),
              limit: configService.getOrThrow<number>('THROTTLE_LIMIT'),
            },
          ],
          storage: new ThrottlerStorageRedisService(`redis://${host}:${port}`, { password }),
        };
      },
    }),
    TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }),

    CommonModule,
    AuthModule.forRoot(),
    CacheModule.forRootAsync(),
    LoggerModule,

    AnalyticsModule,
    OrderModule,
    ProductModule,
    RagModule.forRoot(),
    ShopModule,
    StorageModule.forRoot(),
    UserModule,
  ],
})
export class AppModule {}
