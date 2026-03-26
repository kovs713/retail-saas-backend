import { CommonModule } from './common/common.module';
import { TypeOrmConfigService } from './common/configs';
import { AuthModule } from './core/auth/auth.module';
import { CacheModule } from './core/cache/cache.module';
import { LoggerModule } from './core/logger/logger.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { OrderModule } from './modules/order/order.module';
import { ProductModule } from './modules/product/product.module';
import { PublicRagModule } from './modules/rag/public-rag.module';
import { RagModule } from './modules/rag/rag.module';
import { ShopModule } from './modules/shop/shop.module';
import { StorageModule } from './modules/storage/storage.module';
import { UserModule } from './modules/user/user.module';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }),

    LoggerModule,
    CacheModule.forRootAsync(),
    CommonModule,
    AuthModule,

    RagModule,
    PublicRagModule,
    StorageModule.forRoot(),
    ProductModule,
    ShopModule,
    OrderModule,
    AnalyticsModule,
    UserModule,
  ],
})
export class AppModule {}
