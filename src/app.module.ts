import { CommonModule } from './common/common.module';
import { TypeOrmConfigService } from './common/configs';
import { AuthModule } from './core/auth/auth.module';
import { LoggerModule } from './core/logger/logger.module';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';
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
    CommonModule,

    AuthModule,
    RagModule,
    StorageModule.forRoot(),
    ProductModule,
    CategoryModule,
    ShopModule,
    UserModule,
  ],
})
export class AppModule {}
