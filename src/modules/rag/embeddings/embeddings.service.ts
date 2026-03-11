import { AppLogger } from '@/app/core/logger/app-logger.service';

import { OllamaEmbeddings } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingsService extends OllamaEmbeddings {
  private readonly logger: AppLogger = new AppLogger(EmbeddingsService.name);

  constructor(configService: ConfigService) {
    super({
      model: configService.get<string>('EMBEDDINGS_MODEL', 'embeddinggemma'),
      baseUrl: configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11435'),
    });
    this.logger.log(`Initialized Ollama embeddings with model: ${this.model}`);
  }
}
