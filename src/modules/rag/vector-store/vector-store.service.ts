import { ChromaDBClient } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';

import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Inject, Injectable } from '@nestjs/common';
import { type Where } from 'chromadb';

@Injectable()
export class VectorStoreService {
  private readonly logger: LoggerService = new LoggerService(
    VectorStoreService.name,
  );

  private static readonly allowedMetadataTypes = new Set([
    'string',
    'number',
    'boolean',
  ]);

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

    this.logger.log(
      `Retrieved ${result.length} documents from vector store for organization: ${shopId}`,
    );

    return result;
  }

  async getDocumentsByGroup(
    documentGroupId: string,
    shopId: string,
  ): Promise<Document[]> {
    const collection = this.chromaDBClient.collection;

    if (!collection) {
      return [];
    }

    const documents = await collection.get({
      where: {
        $and: [{ shopId }, { documentGroupId }],
      },
    });

    if (!documents.ids?.length) {
      return [];
    }

    const result = documents.ids
      .map((id, index) => {
        const meta = documents.metadatas?.[index];
        return {
          pageContent: documents.documents[index] ?? '',
          metadata: {
            ...meta,
            _id: id,
            chunkIndex: meta?.chunkIndex as number | undefined,
            totalChunks: meta?.totalChunks as number | undefined,
            documentGroupId: meta?.documentGroupId as string | undefined,
          },
        };
      })
      .sort((a, b) => {
        const aIndex = (a.metadata?.chunkIndex as number) ?? 0;
        const bIndex = (b.metadata?.chunkIndex as number) ?? 0;
        return aIndex - bIndex;
      });

    this.logger.log(
      `Retrieved ${result.length} documents for documentGroupId: ${documentGroupId}`,
    );

    return result;
  }

  async addDocuments(documents: Document[], shopId: string): Promise<string[]> {
    const documentGroupId = crypto.randomUUID();
    const result = await this.addDocumentsWithGroupId(
      documents,
      shopId,
      documentGroupId,
    );
    return result.chunkIds;
  }

  async addDocumentsWithGroupId(
    documents: Document[],
    shopId: string,
    documentGroupId: string,
  ): Promise<{
    documentGroupId: string;
    chunkIds: string[];
    totalChunks: number;
  }> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs: Document[] = [];
    for (const doc of documents) {
      const docWithTenant = {
        ...doc,
        metadata: this.sanitizeMetadata({
          ...doc.metadata,
          shopId,
          documentGroupId,
        }),
      };

      const chunks = await splitter.splitDocuments([docWithTenant]);
      for (let i = 0; i < chunks.length; i++) {
        splitDocs.push({
          ...chunks[i],
          metadata: {
            ...chunks[i].metadata,
            documentGroupId,
            chunkIndex: i,
            totalChunks: chunks.length,
          },
        });
      }
    }

    this.logger.log(
      `Split ${documents.length} documents into ${splitDocs.length} chunks`,
    );

    const ids = await this.chromaDBClient.addDocuments(splitDocs);
    this.logger.log(
      `Added ${splitDocs.length} document chunks to vector store for organization: ${shopId}`,
    );
    return { documentGroupId, chunkIds: ids, totalChunks: splitDocs.length };
  }

  async addTexts(
    texts: string[],
    shopId: string,
    metadatas?: Record<string, any>[],
  ): Promise<string[]> {
    const docs = texts.map((text, index) => {
      const metadata =
        metadatas?.length === 1 ? metadatas[0] : metadatas?.[index] || {};
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

    const resultIds = await this.chromaDBClient.addVectors(
      await this.embeddingsService.embedDocuments(texts),
      docs,
    );
    this.logger.log(
      `Added ${texts.length} texts to vector store for organization: ${shopId}`,
    );
    return resultIds;
  }

  async similaritySearch(
    query: string,
    shopId: string,
    k: number = 5,
    filter?: Record<string, any>,
  ): Promise<Document[]> {
    const combinedFilter = filter ? { shopId, ...filter } : { shopId };

    const results = await this.chromaDBClient.similaritySearch(
      query,
      k,
      combinedFilter,
    );
    this.logger.log(
      `Similarity search completed for query: "${query}" for organization: ${shopId}`,
    );
    return results;
  }

  async similaritySearchWithScore(
    query: string,
    shopId: string,
    k: number = 5,
    filter?: Record<string, any>,
  ): Promise<[Document, number][]> {
    const combinedFilter = filter ? { shopId, ...filter } : { shopId };

    const results = await this.chromaDBClient.similaritySearchWithScore(
      query,
      k,
      combinedFilter,
    );
    this.logger.log(
      `Similarity search with scores completed for query: "${query}" for organization: ${shopId}`,
    );
    return results;
  }

  async deleteDocuments(shopId: string): Promise<void> {
    const collection = await this.chromaDBClient.ensureCollection();

    const documents = await collection.get({
      where: { shopId },
    });

    if (!documents.ids?.length) {
      this.logger.log(`No documents found for organization: ${shopId}`);
      return;
    }

    await this.chromaDBClient.delete({ ids: documents.ids });

    this.logger.log(
      `Deleted ${documents.ids.length} documents from vector store`,
    );
  }

  async deleteDocumentGroup(
    documentGroupId: string,
    shopId: string,
  ): Promise<number> {
    const collection = await this.chromaDBClient.ensureCollection();

    const documents = await collection.get({
      where: {
        $and: [{ shopId }, { documentGroupId }],
      },
    });

    if (!documents.ids?.length) {
      this.logger.log(
        `No documents found for documentGroupId: ${documentGroupId}`,
      );
      return 0;
    }

    await this.chromaDBClient.delete({ ids: documents.ids });

    this.logger.log(
      `Deleted ${documents.ids.length} chunks for documentGroupId: ${documentGroupId}`,
    );
    return documents.ids.length;
  }

  async updateDocumentGroup(
    documentGroupId: string,
    shopId: string,
    documents: Document[],
  ): Promise<number> {
    const collection = this.chromaDBClient.collection;

    if (!collection) {
      return 0;
    }

    const existingDocs = await collection.get({
      where: {
        $and: [{ shopId }, { documentGroupId }],
      },
    });

    if (!existingDocs.ids?.length) {
      return 0;
    }

    await this.chromaDBClient.delete({ ids: existingDocs.ids });

    const splitDocs: Document[] = [];
    for (const doc of documents) {
      const docWithTenant = {
        ...doc,
        metadata: this.sanitizeMetadata({
          ...doc.metadata,
          shopId,
          documentGroupId,
        }),
      };
      splitDocs.push(docWithTenant);
    }

    for (let i = 0; i < splitDocs.length; i++) {
      splitDocs[i].metadata = {
        ...splitDocs[i].metadata,
        documentGroupId,
        chunkIndex: i,
        totalChunks: splitDocs.length,
      };
    }

    const ids = await this.chromaDBClient.addDocuments(splitDocs);

    this.logger.log(
      `Updated ${ids.length} chunks for documentGroupId: ${documentGroupId}`,
    );
    return ids.length;
  }

  async deleteDocumentsByFilter(
    shopId: string,
    filter: Record<string, string | number | boolean | null>,
  ): Promise<number> {
    const collection = await this.chromaDBClient.ensureCollection();

    const conditions: Where[] = [{ shopId } as Where];
    for (const [key, value] of Object.entries(filter)) {
      conditions.push({ [key]: value } as Where);
    }

    const where: Where =
      conditions.length === 1 ? conditions[0] : ({ $and: conditions } as Where);

    const documents = await collection.get({ where });

    if (!documents.ids?.length) {
      return 0;
    }

    await this.chromaDBClient.delete({ ids: documents.ids });

    this.logger.log(
      `Deleted ${documents.ids.length} documents for tenant-scoped filter`,
    );

    return documents.ids.length;
  }

  asRetriever(
    shopId: string,
    searchKwargs?: { k?: number; filter?: Record<string, any> },
  ) {
    const combinedFilter = searchKwargs?.filter
      ? { shopId, ...searchKwargs.filter }
      : { shopId };
    return this.chromaDBClient.asRetriever({
      ...searchKwargs,
      filter: combinedFilter,
    });
  }

  private sanitizeMetadata(
    metadata?: Record<string, unknown>,
  ): Record<string, string | number | boolean | null> {
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
