import { WsAuthGuard } from '@/common/guards';
import { RagChatConfig, RagChatOptions } from '@/common/types';
import { CacheModule } from '@/core/cache/cache.module';
import { DocPreprocessorModule } from '@/modules/doc-preprocessor/doc-preprocessor.module';
import { ProductModule } from '@/modules/product/product.module';
import { ChatGateway, ChatSessionController, ChatSessionService } from './chat';
import { ChatMessage, ChatSession } from './chat/entities';
import {
  ChatMessageRepository,
  ChatSessionRepository,
} from './chat/repositories';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { LLMModule } from './llm/llm.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { VectorStoreModule } from './vector-store/vector-store.module';

import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

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
        TypeOrmModule.forFeature([ChatSession, ChatMessage]),
        DocPreprocessorModule.forRoot(),
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
        ChatMessageRepository,
        WsAuthGuard,
      ],
      exports: [
        RagService,
        ChatSessionService,
        ChatSessionRepository,
        ChatMessageRepository,
      ],
      controllers: [RagController, ChatSessionController],
    };
  }
}
