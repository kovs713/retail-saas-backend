import { Module } from '@nestjs/common';
import { RagModule } from '@/modules/rag';
import { StorageModule } from '@/modules/storage';
import { ProductModule } from '@/modules/product';
import { RagController } from './rag/rag.controller';
import { StorageController } from './storage/storage.controller';
import { ProductController } from './product/product.controller';

@Module({
  imports: [RagModule, StorageModule, ProductModule],
  controllers: [RagController, StorageController, ProductController],
})
export class ApiModule {}
