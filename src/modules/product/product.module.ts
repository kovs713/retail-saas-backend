import { Category, Product } from './entities';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { PublicMediaController } from './public-media.controller';
import { CategoryRepository, ProductRepository } from './repositories';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category])],
  providers: [ProductService, ProductRepository, CategoryRepository],
  exports: [ProductService, ProductRepository, CategoryRepository],
  controllers: [ProductController, PublicMediaController],
})
export class ProductModule {}
