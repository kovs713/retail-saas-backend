import { ChatGateway } from './chat.gateway';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { LLMModule } from './llm/llm.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { VectorStoreModule } from './vector-store/vector-store.module';

import { Module } from '@nestjs/common';

@Module({
  imports: [EmbeddingsModule, LLMModule.forRootAsync(), VectorStoreModule.forRootAsync()],
  providers: [RagService, ChatGateway],
  exports: [RagService],
  controllers: [RagController],
})
export class RagModule {}
