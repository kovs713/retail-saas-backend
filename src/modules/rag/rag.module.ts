import { AuthModule } from '@/core/auth/auth.module';
import { AppLogger } from '@/core/logger/app-logger.service';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { LLMModule } from './llm/llm.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { VectorStoreModule } from './vector-store/vector-store.module';

import { Module } from '@nestjs/common';

@Module({
  imports: [AuthModule, EmbeddingsModule.forRootAsync(), LLMModule.forRootAsync(), VectorStoreModule.forRootAsync()],
  providers: [RagService, AppLogger],
  exports: [RagService],
  controllers: [RagController],
})
export class RagModule {}
