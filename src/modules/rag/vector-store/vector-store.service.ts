import { AppLogger } from '@/app/core/logger/app-logger.service';
import { ChromaDBClient } from '@/common/types/providers.type';
import { EmbeddingsService } from '../embeddings/embeddings.service';

import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class VectorStoreService {
  private readonly logger: AppLogger = new AppLogger(VectorStoreService.name);

  constructor(
    private readonly embeddingsService: EmbeddingsService,
    @Inject(ChromaDBClient)
    private readonly chromaDBClient: Chroma,
  ) {}

  async addDocuments(documents: Document[]): Promise<string[]> {
    const ids = await this.chromaDBClient.addDocuments(documents);
    this.logger.log(`Added ${documents.length} documents to vector store`);
    return ids;
  }

  async addTexts(texts: string[], metadatas?: Record<string, any>[]): Promise<string[]> {
    const docs = texts.map((text, index) => {
      const metadata = metadatas?.length === 1 ? metadatas[0] : metadatas?.[index] || {};
      if (Object.keys(metadata).length === 0) {
        metadata.source = 'unknown';
      }
      return {
        pageContent: text,
        metadata,
      };
    });

    const resultIds = await this.chromaDBClient.addVectors(await this.embeddingsService.embedDocuments(texts), docs);
    this.logger.log(`Added ${texts.length} texts to vector store`);
    return resultIds;
  }

  async similaritySearch(query: string, k: number = 5, filter?: Record<string, any>): Promise<Document[]> {
    const results = await this.chromaDBClient.similaritySearch(query, k, filter);
    this.logger.log(`Similarity search completed for query: "${query}"`);
    return results;
  }

  async similaritySearchWithScore(
    query: string,
    k: number = 5,
    filter?: Record<string, any>,
  ): Promise<[Document, number][]> {
    const results = await this.chromaDBClient.similaritySearchWithScore(query, k, filter);
    this.logger.log(`Similarity search with scores completed for query: "${query}"`);
    return results;
  }

  deleteDocuments(ids: string[]): void {
    this.logger.warn(`Document deletion not implemented for Chroma vector store. IDs: ${ids.join(', ')}`);
  }

  getVectorStore(): Chroma {
    return this.chromaDBClient;
  }

  asRetriever(searchKwargs?: { k?: number; filter?: Record<string, any> }) {
    return this.chromaDBClient.asRetriever(searchKwargs);
  }
}
