import { AppLogger } from '@/common/logger/app-logger.service';
import { ChromaDBClient } from '@/common/types/providers.type';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { Inject, Injectable } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service';

@Injectable()
export class VectorStoreService {
  private readonly logger: AppLogger = new AppLogger(VectorStoreService.name);

  constructor(
    private readonly embeddingsService: EmbeddingsService,
    @Inject(ChromaDBClient)
    private readonly chromaDBClient: Chroma,
  ) {}

  /**
   * Add documents to the vector store
   * @param documents - Array of Document objects to add
   * @returns Promise<string[]> - Array of document IDs
   */
  async addDocuments(documents: Document[]): Promise<string[]> {
    try {
      const ids = await this.chromaDBClient.addDocuments(documents);
      this.logger.log(`Added ${documents.length} documents to vector store`);
      return ids;
    } catch (error) {
      this.logger.error(
        `Failed to add documents: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Add texts with metadata to the vector store
   * @param texts - Array of text strings
   * @param metadatas - Array of metadata objects (optional)
   * @param ids - Array of custom IDs (optional)
   * @returns Promise<string[]> - Array of document IDs
   */
  async addTexts(
    texts: string[],
    metadatas?: Record<string, any>[],
  ): Promise<string[]> {
    try {
      const resultIds = await this.chromaDBClient.addVectors(
        await this.embeddingsService.embedDocuments(texts),
        texts.map((text, index) => ({
          pageContent: text,
          metadata: metadatas?.[index] || {},
        })),
      );
      this.logger.log(`Added ${texts.length} texts to vector store`);
      return resultIds;
    } catch (error) {
      this.logger.error(
        `Failed to add texts: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Search for similar documents
   * @param query - Search query string
   * @param k - Number of results to return (default: 5)
   * @param filter - Optional filter for metadata
   * @returns Promise<Document[]> - Array of similar documents
   */
  async similaritySearch(
    query: string,
    k: number = 5,
    filter?: Record<string, any>,
  ): Promise<Document[]> {
    try {
      const results = await this.chromaDBClient.similaritySearch(
        query,
        k,
        filter,
      );
      this.logger.log(`Similarity search completed for query: "${query}"`);
      return results;
    } catch (error) {
      this.logger.error(
        `Failed to perform similarity search: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Search for documents with scores
   * @param query - Search query string
   * @param k - Number of results to return (default: 5)
   * @param filter - Optional filter for metadata
   * @returns Promise<[Document, number][]> - Array of documents with similarity scores
   */
  async similaritySearchWithScore(
    query: string,
    k: number = 5,
    filter?: Record<string, any>,
  ): Promise<[Document, number][]> {
    try {
      const results = await this.chromaDBClient.similaritySearchWithScore(
        query,
        k,
        filter,
      );
      this.logger.log(
        `Similarity search with scores completed for query: "${query}"`,
      );
      return results;
    } catch (error) {
      this.logger.error(
        `Failed to perform similarity search with scores: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Delete documents by IDs
   * @param ids - Array of document IDs to delete
   * @returns Promise<void>
   */
  deleteDocuments(ids: string[]): void {
    try {
      // LangChain Chroma delete method signature may vary
      // For now, we'll log a warning and not implement deletion
      this.logger.warn(
        `Document deletion not implemented for Chroma vector store. IDs: ${ids.join(', ')}`,
      );
      // TODO: Implement proper deletion when LangChain Chroma API is clarified
    } catch (error) {
      this.logger.error(
        `Failed to delete documents: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Get the underlying Chroma vector store instance
   * @returns Chroma - The LangChain Chroma instance
   */
  getVectorStore(): Chroma {
    return this.chromaDBClient;
  }

  /**
   * Create a retriever from the vector store
   * @param searchKwargs - Search configuration
   * @returns Retriever - LangChain retriever instance
   */
  asRetriever(searchKwargs?: { k?: number; filter?: Record<string, any> }) {
    return this.chromaDBClient.asRetriever(searchKwargs);
  }
}
