import { CacheModule } from '@/core/cache/cache.module';
import { ChatGateway } from './chat.gateway';
import { ChatSessionService } from './chat-session.service';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { LLMModule } from './llm/llm.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { VectorStoreModule } from './vector-store/vector-store.module';
import { WsAuthGuard } from '@/common/guards/ws-auth.guard';

import { Module } from '@nestjs/common';

@Module({
  imports: [EmbeddingsModule, LLMModule.forRootAsync(), VectorStoreModule.forRootAsync(), CacheModule.forRootAsync()],
  providers: [RagService, ChatGateway, ChatSessionService, WsAuthGuard],
  exports: [RagService, ChatSessionService],
  controllers: [RagController],
})
export class RagModule {}
