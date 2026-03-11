import { AppLogger } from '@/core/logger/app-logger.service';
import { EmbeddingsService } from './embeddings.service';

import { DynamicModule, Module } from '@nestjs/common';

@Module({})
export class EmbeddingsModule {
  static forRootAsync(): DynamicModule {
    return {
      module: EmbeddingsModule,
      providers: [AppLogger, EmbeddingsService],
      exports: [EmbeddingsService],
    };
  }
}
