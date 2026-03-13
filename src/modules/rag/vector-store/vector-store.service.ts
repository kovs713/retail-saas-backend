import { AppLogger } from '@/app/core/logger/app-logger.service';
import { ChromaDBClient } from '@/common/types/providers.type';
import { TenantContext } from '@/common/types/tenant-context.type';
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

  private getTenantFilter(tenantContext: TenantContext): Record<string, any> {
    return { organizationId: tenantContext.organizationId };
  }

  async addDocuments(documents: Document[], tenantContext: TenantContext): Promise<string[]> {
    const docsWithTenant = documents.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        organizationId: tenantContext.organizationId,
      },
    }));

    const ids = await this.chromaDBClient.addDocuments(docsWithTenant);
    this.logger.log(
      `Added ${documents.length} documents to vector store for organization: ${tenantContext.organizationId}`,
    );
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
          organizationId: tenantContext.organizationId,
        },
      };
    });

    const resultIds = await this.chromaDBClient.addVectors(await this.embeddingsService.embedDocuments(texts), docs);
    this.logger.log(`Added ${texts.length} texts to vector store for organization: ${tenantContext.organizationId}`);
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
    this.logger.log(
      `Similarity search completed for query: "${query}" for organization: ${tenantContext.organizationId}`,
    );
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
      `Similarity search with scores completed for query: "${query}" for organization: ${tenantContext.organizationId}`,
    );
    return results;
  }

  deleteDocuments(ids: string[]): void {
    this.logger.warn(`Document deletion not implemented for Chroma vector store. IDs: ${ids.join(', ')}`);
  }

  getVectorStore(): Chroma {
    return this.chromaDBClient;
  }

  asRetriever(tenantContext: TenantContext, searchKwargs?: { k?: number; filter?: Record<string, any> }) {
    const tenantFilter = this.getTenantFilter(tenantContext);
    const combinedFilter = searchKwargs?.filter ? { ...tenantFilter, ...searchKwargs.filter } : tenantFilter;
    return this.chromaDBClient.asRetriever({ ...searchKwargs, filter: combinedFilter });
  }
}
