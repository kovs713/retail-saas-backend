import { VectorStoreModule } from '@/modules/rag/vector-store/vector-store.module';
import { CatalogIndexService } from './catalog-index.service';
import { Category, Product, ProductImage } from './entities';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { PublicMediaController } from './public-media.controller';
import {
  CategoryRepository,
  ProductImageRepository,
  ProductRepository,
} from './repositories';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, ProductImage]),
    VectorStoreModule.forRootAsync(),
  ],
  providers: [
    ProductService,
    ProductRepository,
    ProductImageRepository,
    CategoryRepository,
    CatalogIndexService,
  ],
  exports: [
    ProductService,
    ProductRepository,
    ProductImageRepository,
    CategoryRepository,
    CatalogIndexService,
  ],
  controllers: [ProductController, PublicMediaController],
})
export class ProductModule {}
