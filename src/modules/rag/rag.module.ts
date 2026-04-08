import { ChatGateway } from './chat.gateway';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { LLMModule } from './llm/llm.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { VectorStoreModule } from './vector-store/vector-store.module';
import { WsAuthGuard } from '@/common/guards/ws-auth.guard';

import { Module } from '@nestjs/common';

@Module({
  imports: [EmbeddingsModule, LLMModule.forRootAsync(), VectorStoreModule.forRootAsync()],
  providers: [RagService, ChatGateway, WsAuthGuard],
  exports: [RagService],
  controllers: [RagController],
})
export class RagModule {}
