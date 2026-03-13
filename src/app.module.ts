import { TypeOrmConfigService } from '@/common/configs/typeorm-config.service';
import { AuthModule } from '@/core/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { ProductModule } from './modules/product/product.module';
import { RagModule } from './modules/rag/rag.module';
import { StorageModule } from './modules/storage/storage.module';
import { UserModule } from './modules/user/user.module';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }),
    RagModule,
    AuthModule,
    StorageModule.forRoot(),
    ProductModule,
    OrganizationModule,
    UserModule,
  ],
})
export class AppModule {}
