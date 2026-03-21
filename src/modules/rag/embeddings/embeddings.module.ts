import { EmbeddingsService } from './embeddings.service';

import { Module } from '@nestjs/common';

@Module({
  providers: [EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
