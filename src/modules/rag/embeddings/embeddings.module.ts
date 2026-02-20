import { AppLogger } from '@/common/logger/app-logger.service';
import { EmbeddingsExtractor } from '@/common/types/providers.type';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureExtractionPipeline, pipeline } from '@xenova/transformers';
import { EmbeddingsService } from './embeddings.service';

@Module({})
export class EmbeddingsModule {
  static forRootAsync(): DynamicModule {
    return {
      module: EmbeddingsModule,
      providers: [
        {
          provide: EmbeddingsExtractor,
          inject: [ConfigService],
          async useFactory(
            config: ConfigService,
          ): Promise<FeatureExtractionPipeline> {
            const model = config.getOrThrow<string>('EMBEDDINGS_MODEL');

            const extractor = await pipeline('feature-extraction', model, {
              revision: 'main',
            });

            return extractor;
          },
        },

        AppLogger,
        EmbeddingsService,
      ],
      exports: [EmbeddingsService, EmbeddingsExtractor],
    };
  }
}
