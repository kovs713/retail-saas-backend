import { Category, Product } from './entities';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CategoryRepository, ProductRepository } from './repositories';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category])],
  providers: [ProductService, ProductRepository, CategoryRepository],
  exports: [ProductService],
  controllers: [ProductController],
})
export class ProductModule {}
