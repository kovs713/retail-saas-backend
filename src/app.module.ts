import { TypeOrmConfigService } from './common/configs/typeorm-config.service';
import { AuthModule } from './core/auth/auth.module';
import { ProductModule, RagModule, StorageModule } from './modules';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }),
    RagModule,
    AuthModule,
    StorageModule,
    ProductModule,
  ],
})
export class AppModule {}
