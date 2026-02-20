import { AppLogger } from '@/common/logger/app-logger.service';
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

  /**
   * Embed a single query string
   * @param text - The text to embed
   * @returns Promise<number[]> - The embedding vector
   */
  async embedQuery(text: string): Promise<number[]> {
    try {
      const output = await this.extractor(text, {
        pooling: 'mean',
        normalize: true,
      });
      return Array.from(output.data as number[]);
    } catch (error) {
      this.logger.error(
        `Failed to embed query: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Embed multiple documents
   * @param texts - Array of texts to embed
   * @returns Promise<number[][]> - Array of embedding vectors
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      const results = await Promise.all(
        texts.map((text) =>
          this.extractor(text, {
            pooling: 'mean',
            normalize: true,
          }),
        ),
      );
      return results.map((output) => Array.from(output.data as number[]));
    } catch (error) {
      this.logger.error(
        `Failed to embed documents: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
