import { LoggerService } from '@/core/logger/logger.service';

import { OllamaEmbeddings } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingsService extends OllamaEmbeddings {
  private readonly logger: LoggerService = new LoggerService(
    EmbeddingsService.name,
  );

  constructor(configService: ConfigService) {
    super({
      model: configService.getOrThrow<string>('EMBEDDINGS_MODEL'),
      baseUrl: configService.getOrThrow<string>('OLLAMA_BASE_URL'),
    });
    this.logger.log(`Initialized Ollama embeddings with model: ${this.model}`);
  }
}
