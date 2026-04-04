import { ChromaDBClient } from '@/common/types';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorStoreService } from './vector-store.service';

import { Chroma } from '@langchain/community/vectorstores/chroma';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({})
export class VectorStoreModule {
  static forRootAsync(): DynamicModule {
    return {
      module: VectorStoreModule,
      imports: [EmbeddingsModule],
      providers: [
        {
          provide: ChromaDBClient,
          inject: [ConfigService, EmbeddingsService],
          useFactory: (configService: ConfigService, embeddingsService: EmbeddingsService): Chroma => {
            const collectionName = configService.getOrThrow<string>('VECTOR_COLLECTION_NAME');
            const chromadbUrl = configService.getOrThrow<string>('CHROMADB_URL');

            const parsedUrl = new URL(chromadbUrl || 'http://localhost:8000');
            const ssl = parsedUrl.protocol === 'https:';
            const host = parsedUrl.hostname;
            const port = parseInt(parsedUrl.port) || (ssl ? 443 : 80);

            const chromaStore = new Chroma(embeddingsService, {
              collectionName,
              clientParams: {
                ssl,
                host,
                port,
              },
            });

            return chromaStore;
          },
        },

        VectorStoreService,
      ],
      exports: [VectorStoreService],
    };
  }
}
