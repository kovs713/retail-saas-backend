import { AppLogger } from '@/core/logger/app-logger.service';
import { AuthModule } from '@/core/auth/auth.module';
import { Product } from './entities/product.entity';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Product])],
  providers: [ProductService, AppLogger],
  exports: [ProductService],
  controllers: [ProductController],
})
export class ProductModule {}
