import { AppLogger } from '@/app/core/logger/app-logger.service';
import { EmbeddingsExtractor } from '@/common/types/providers.type';

import { Embeddings } from '@langchain/core/embeddings';
import { Inject, Injectable } from '@nestjs/common';
import { FeatureExtractionPipeline } from '@xenova/transformers';

@Injectable()
export class EmbeddingsService extends Embeddings {
  private readonly logger: AppLogger = new AppLogger(EmbeddingsService.name);

  constructor(
    @Inject(EmbeddingsExtractor)
    private readonly extractor: FeatureExtractionPipeline,
  ) {
    super({});
  }

  async embedQuery(text: string): Promise<number[]> {
    const output = await this.extractor(text, {
      pooling: 'mean',
      normalize: true,
    });
    return Array.from(output.data as number[]);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const results = await Promise.all(
      texts.map((text) =>
        this.extractor(text, {
          pooling: 'mean',
          normalize: true,
        }),
      ),
    );
    return results.map((output) => Array.from(output.data as number[]));
  }
}
