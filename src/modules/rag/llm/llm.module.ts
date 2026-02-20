import { AppLogger } from '@/common/logger/app-logger.service';
import { ChatGroqClient } from '@/common/types/providers.type';
import { ChatGroq } from '@langchain/groq';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMService } from './llm.service';

@Module({})
export class LLMModule {
  static forRootAsync(): DynamicModule {
    return {
      module: LLMModule,
      providers: [
        {
          provide: ChatGroqClient,
          inject: [ConfigService],
          useFactory(config: ConfigService) {
            const apiKey = config.getOrThrow<string>('GROQ_API_KEY');
            const model = config.getOrThrow<string>('GROQ_MODEL');
            const temperature = parseFloat(
              config.getOrThrow<string>('GROQ_TEMPERATURE'),
            );

            return new ChatGroq({
              apiKey,
              model,
              temperature,
            });
          },
        },

        AppLogger,
        LLMService,
      ],
      exports: [LLMService],
    };
  }
}
