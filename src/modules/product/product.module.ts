import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category])],
  providers: [ProductService],
  exports: [ProductService],
  controllers: [ProductController],
})
export class ProductModule {}
