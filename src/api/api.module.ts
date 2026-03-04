import { Module } from '@nestjs/common';
import { RagModule } from '@/modules/rag';
import { StorageModule } from '@/modules/storage';
import { RagController } from './rag/rag.controller';
import { StorageController } from './storage/storage.controller';

@Module({
  imports: [RagModule, StorageModule],
  controllers: [RagController, StorageController],
})
export class ApiModule {}
