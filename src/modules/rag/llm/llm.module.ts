import { ChatGroqClient } from '@/common/types';
import { LLMService } from './llm.service';

import { ChatGroq } from '@langchain/groq';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({})
export class LLMModule {
  static forRootAsync(): DynamicModule {
    return {
      module: LLMModule,
      providers: [
        {
          provide: ChatGroqClient,
          inject: [ConfigService],
          useFactory(configService: ConfigService) {
            const apiKey = configService.getOrThrow<string>('GROQ_API_KEY');
            const model = configService.getOrThrow<string>('GROQ_MODEL');
            const temperature = parseFloat(
              configService.getOrThrow<string>('GROQ_TEMPERATURE'),
            );

            return new ChatGroq({
              apiKey,
              model,
              temperature,
            });
          },
        },

        LLMService,
      ],
      exports: [LLMService],
    };
  }
}
