import { AppLogger } from '@/core/logger/app-logger.service';
import { AuthModule } from '@/core/auth/auth.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { LLMModule } from './llm/llm.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { VectorStoreModule } from './vector-store/vector-store.module';

import { Module } from '@nestjs/common';

@Module({
  imports: [AuthModule, EmbeddingsModule.forRootAsync(), LLMModule.forRootAsync(), VectorStoreModule.forRootAsync()],
  controllers: [RagController],
  providers: [RagService, AppLogger],
  exports: [RagService],
})
export class RagModule {}
