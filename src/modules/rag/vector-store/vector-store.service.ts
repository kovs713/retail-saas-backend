import { ChromaDBClient, TenantContext } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';

import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class VectorStoreService {
  private readonly logger: LoggerService = new LoggerService(VectorStoreService.name);

  constructor(
    @Inject(ChromaDBClient)
    private readonly chromaDBClient: Chroma,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  private getTenantFilter(tenantContext: TenantContext): Record<string, any> {
    return { shopId: tenantContext.shopId };
  }

  async getDocuments(tenantContext: TenantContext): Promise<Document[]> {
    const tenantFilter = this.getTenantFilter(tenantContext);

    const collection = this.chromaDBClient.collection;

    if (!collection) {
      return [];
    }

    const documents = await collection.get({
      where: tenantFilter,
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

    this.logger.log(`Retrieved ${result.length} documents from vector store for organization: ${tenantContext.shopId}`);

    return result;
  }

  async addDocuments(documents: Document[], tenantContext: TenantContext): Promise<string[]> {
    const docsWithTenant = documents.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        shopId: tenantContext.shopId,
      },
    }));

    const ids = await this.chromaDBClient.addDocuments(docsWithTenant);
    this.logger.log(`Added ${documents.length} documents to vector store for organization: ${tenantContext.shopId}`);
    return ids;
  }

  async addTexts(texts: string[], tenantContext: TenantContext, metadatas?: Record<string, any>[]): Promise<string[]> {
    const docs = texts.map((text, index) => {
      const metadata = metadatas?.length === 1 ? metadatas[0] : metadatas?.[index] || {};
      if (Object.keys(metadata).length === 0) {
        metadata.source = 'unknown';
      }
      return {
        pageContent: text,
        metadata: {
          ...metadata,
          shopId: tenantContext.shopId,
        },
      };
    });

    const resultIds = await this.chromaDBClient.addVectors(await this.embeddingsService.embedDocuments(texts), docs);
    this.logger.log(`Added ${texts.length} texts to vector store for organization: ${tenantContext.shopId}`);
    return resultIds;
  }

  async similaritySearch(
    query: string,
    tenantContext: TenantContext,
    k: number = 5,
    filter?: Record<string, any>,
  ): Promise<Document[]> {
    const tenantFilter = this.getTenantFilter(tenantContext);
    const combinedFilter = filter ? { ...tenantFilter, ...filter } : tenantFilter;

    const results = await this.chromaDBClient.similaritySearch(query, k, combinedFilter);
    this.logger.log(`Similarity search completed for query: "${query}" for organization: ${tenantContext.shopId}`);
    return results;
  }

  async similaritySearchWithScore(
    query: string,
    tenantContext: TenantContext,
    k: number = 5,
    filter?: Record<string, any>,
  ): Promise<[Document, number][]> {
    const tenantFilter = this.getTenantFilter(tenantContext);
    const combinedFilter = filter ? { ...tenantFilter, ...filter } : tenantFilter;

    const results = await this.chromaDBClient.similaritySearchWithScore(query, k, combinedFilter);
    this.logger.log(
      `Similarity search with scores completed for query: "${query}" for organization: ${tenantContext.shopId}`,
    );
    return results;
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    await this.chromaDBClient.delete({ ids });
    this.logger.log(`Deleted ${ids.length} documents from vector store`);
  }

  asRetriever(tenantContext: TenantContext, searchKwargs?: { k?: number; filter?: Record<string, any> }) {
    const tenantFilter = this.getTenantFilter(tenantContext);
    const combinedFilter = searchKwargs?.filter ? { ...tenantFilter, ...searchKwargs.filter } : tenantFilter;
    return this.chromaDBClient.asRetriever({ ...searchKwargs, filter: combinedFilter });
  }
}
