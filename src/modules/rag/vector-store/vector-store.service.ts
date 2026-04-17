import { ChromaDBClient } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';

import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class VectorStoreService {
  private readonly logger: LoggerService = new LoggerService(VectorStoreService.name);

  private static readonly allowedMetadataTypes = new Set(['string', 'number', 'boolean']);

  constructor(
    @Inject(ChromaDBClient)
    private readonly chromaDBClient: Chroma,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async getDocuments(shopId: string): Promise<Document[]> {
    const collection = this.chromaDBClient.collection;

    if (!collection) {
      return [];
    }

    const documents = await collection.get({
      where: { shopId },
    });

    if (!documents.ids?.length) {
      return [];
    }

    const result = documents.ids.map((id, index) => {
      return {
        pageContent: documents.documents[index] ?? '',
        metadata: {
          ...documents.metadatas?.[index],
          _id: id,
        },
      };
    });

    this.logger.log(`Retrieved ${result.length} documents from vector store for organization: ${shopId}`);

    return result;
  }

  async addDocuments(documents: Document[], shopId: string): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docsWithTenant = documents.map((doc) => ({
      ...doc,
      metadata: this.sanitizeMetadata({
        ...doc.metadata,
        shopId,
      }),
    }));

    const splitDocs: Document[] = [];
    for (const doc of docsWithTenant) {
      const chunks = await splitter.splitDocuments([doc]);
      splitDocs.push(...chunks);
    }

    this.logger.log(`Split ${documents.length} documents into ${splitDocs.length} chunks`);

    const ids = await this.chromaDBClient.addDocuments(splitDocs);
    this.logger.log(`Added ${splitDocs.length} document chunks to vector store for organization: ${shopId}`);
    return ids;
  }

  async addTexts(texts: string[], shopId: string, metadatas?: Record<string, any>[]): Promise<string[]> {
    const docs = texts.map((text, index) => {
      const metadata = metadatas?.length === 1 ? metadatas[0] : metadatas?.[index] || {};
      if (Object.keys(metadata).length === 0) {
        metadata.source = 'unknown';
      }
      return {
        pageContent: text,
        metadata: this.sanitizeMetadata({
          ...metadata,
          shopId,
        }),
      };
    });

    const resultIds = await this.chromaDBClient.addVectors(await this.embeddingsService.embedDocuments(texts), docs);
    this.logger.log(`Added ${texts.length} texts to vector store for organization: ${shopId}`);
    return resultIds;
  }

  async similaritySearch(
    query: string,
    shopId: string,
    k: number = 5,
    filter?: Record<string, any>,
  ): Promise<Document[]> {
    const combinedFilter = filter ? { shopId, ...filter } : { shopId };

    const results = await this.chromaDBClient.similaritySearch(query, k, combinedFilter);
    this.logger.log(`Similarity search completed for query: "${query}" for organization: ${shopId}`);
    return results;
  }

  async similaritySearchWithScore(
    query: string,
    shopId: string,
    k: number = 5,
    filter?: Record<string, any>,
  ): Promise<[Document, number][]> {
    const combinedFilter = filter ? { shopId, ...filter } : { shopId };

    const results = await this.chromaDBClient.similaritySearchWithScore(query, k, combinedFilter);
    this.logger.log(`Similarity search with scores completed for query: "${query}" for organization: ${shopId}`);
    return results;
  }

  async deleteDocuments(shopId: string): Promise<void> {
    const collection = this.chromaDBClient.collection;

    if (!collection) {
      return;
    }
    const documents = await collection.get({
      where: { shopId },
    });

    await this.chromaDBClient.delete({ ids: documents.ids });

    this.logger.log(`Deleted ${documents.ids.length} documents from vector store`);
  }

  asRetriever(shopId: string, searchKwargs?: { k?: number; filter?: Record<string, any> }) {
    const combinedFilter = searchKwargs?.filter ? { shopId, ...searchKwargs.filter } : { shopId };
    return this.chromaDBClient.asRetriever({ ...searchKwargs, filter: combinedFilter });
  }

  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, string | number | boolean | null> {
    const safeMetadata: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(metadata ?? {})) {
      if (value === null) {
        safeMetadata[key] = null;
        continue;
      }

      if (value === undefined) {
        continue;
      }

      if (VectorStoreService.allowedMetadataTypes.has(typeof value)) {
        safeMetadata[key] = value as string | number | boolean;
        continue;
      }

      safeMetadata[key] = JSON.stringify(value);
    }

    return safeMetadata;
  }
}
