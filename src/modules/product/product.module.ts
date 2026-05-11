import { EvotorApiModule } from '@/modules/evotor/evotor-api.module';
import { VectorStoreModule } from '@/modules/rag/vector-store/vector-store.module';
import { CatalogIndexService } from './catalog-index.service';
import { Category, Product } from './entities';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { PublicMediaController } from './public-media.controller';
import { CategoryRepository, ProductRepository } from './repositories';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category]),
    EvotorApiModule.forRoot(),
    VectorStoreModule.forRootAsync(),
  ],
  providers: [
    ProductService,
    ProductRepository,
    CategoryRepository,
    CatalogIndexService,
  ],
  exports: [
    ProductService,
    ProductRepository,
    CategoryRepository,
    CatalogIndexService,
  ],
  controllers: [ProductController, PublicMediaController],
})
export class ProductModule {}
