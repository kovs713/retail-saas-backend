import { WsAuthGuard } from '@/common/guards/ws-auth.guard';
import { RagChatConfig } from '@/common/types';
import { CacheModule } from '@/core/cache/cache.module';
import { ChatSessionService } from './chat-session.service';
import { ChatGateway } from './chat.gateway';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { LLMModule } from './llm/llm.module';
import { ProductModule } from '@/modules/product/product.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { ChatSessionRepository } from './repositories';
import { VectorStoreModule } from './vector-store/vector-store.module';

import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RagChatOptions } from './rag.types';

@Module({})
export class RagModule {
  static forRoot(): DynamicModule {
    return {
      module: RagModule,
      imports: [
        EmbeddingsModule,
        LLMModule.forRootAsync(),
        VectorStoreModule.forRootAsync(),
        CacheModule.forRootAsync(),
        ProductModule,
      ],
      providers: [
        {
          provide: RagChatConfig,
          inject: [ConfigService],
          useFactory: (configService: ConfigService): RagChatOptions => ({
            WsRateLimitWindow: configService.getOrThrow('WS_RATE_LIMIT_WINDOW'),
            WsRateLimitMax: configService.getOrThrow('WS_RATE_LIMIT_MAX'),
            ChatSessionTtl: configService.getOrThrow('CHAT_SESSION_TTL'),
          }),
        },

        RagService,
        ChatGateway,
        ChatSessionService,
        ChatSessionRepository,
        WsAuthGuard,
      ],
      exports: [RagService, ChatSessionService, ChatSessionRepository],
      controllers: [RagController],
    };
  }
}
