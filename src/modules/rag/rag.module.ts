import { AppLogger } from '@/core/logger/app-logger.service';
import { RagController } from '@/app/modules/rag/rag.controller';
import { EmbeddingsModule } from '@/modules/rag/embeddings/embeddings.module';
import { LLMModule } from '@/modules/rag/llm/llm.module';
import { RagService } from '@/modules/rag/rag.service';
import { VectorStoreModule } from '@/modules/rag/vector-store/vector-store.module';

import { Module } from '@nestjs/common';

@Module({
  imports: [EmbeddingsModule.forRootAsync(), LLMModule.forRootAsync(), VectorStoreModule.forRootAsync()],
  controllers: [RagController],
  providers: [RagService, AppLogger],
  exports: [RagService],
})
export class RagModule {}
