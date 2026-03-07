import { ProductController } from './product/product.controller';
import { RagController } from './rag/rag.controller';
import { StorageController } from './storage/storage.controller';

import { ProductModule } from '@/modules/product';
import { RagModule } from '@/modules/rag';
import { StorageModule } from '@/modules/storage';
import { Module } from '@nestjs/common';

@Module({
  imports: [RagModule, StorageModule.forRoot(), ProductModule],
  controllers: [RagController, StorageController, ProductController],
})
export class ApiModule {}
