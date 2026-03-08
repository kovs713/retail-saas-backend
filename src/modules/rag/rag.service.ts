import { AppLogger } from '@/app/core/logger/app-logger.service';
import { LLMService } from '@/modules/rag/llm/llm.service';
import { VectorStoreService } from '@/modules/rag/vector-store/vector-store.service';

import { Document } from '@langchain/core/documents';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RagService {
  private readonly logger: AppLogger = new AppLogger(RagService.name);

  constructor(
    private readonly llmService: LLMService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  /**
   * Add documents to the vector store for RAG
   * @param documents - Array of Document objects to add
   * @returns Promise<string[]> - Array of document IDs
   */
  async addDocuments(documents: Document[]): Promise<string[]> {
    try {
      const ids = await this.vectorStoreService.addDocuments(documents);
      this.logger.log(`Added ${documents.length} documents to RAG system`);
      return ids;
    } catch (error) {
      this.logger.error(`Failed to add documents to RAG system: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Clear all documents from the RAG system
   * @returns Promise<void>
   */
  clearDocuments(): void {
    try {
      // For LangChain Chroma, we can't easily get all document IDs
      // This is a placeholder - in a real implementation, you'd need to
      // track document IDs separately or use a different approach
      this.logger.warn('clearDocuments not fully implemented for LangChain Chroma wrapper');
      // You could implement this by maintaining a separate index of document IDs
    } catch (error) {
      this.logger.error(
        `Failed to clear documents from RAG system: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Query the RAG system with a question and get an AI-generated answer
   * @param query - The user's question
   * @param maxResults - Maximum number of documents to retrieve (default: 5)
   * @param systemPrompt - Optional system prompt to customize the AI response
   * @returns Promise with answer and source documents
   */
  async query(
    query: string,
    maxResults: number = 5,
    systemPrompt?: string,
  ): Promise<{
    answer: string;
    sources: Array<{
      pageContent: string;
      metadata: Record<string, any>;
    }>;
  }> {
    try {
      this.logger.log(`Processing RAG query: "${query}"`);

      // Step 1: Perform similarity search to find relevant documents
      const relevantDocs = await this.vectorStoreService.similaritySearch(query, maxResults);

      this.logger.log(`Found ${relevantDocs.length} relevant documents`);

      // Step 2: Prepare context from retrieved documents
      const context = relevantDocs.map((doc, index) => `[${index + 1}] ${doc.pageContent}`).join('\n\n');

      // Step 3: Generate answer using LLM with context
      const prompt =
        systemPrompt ||
        `You are a helpful assistant that answers questions based on the provided context. If the context doesn't contain enough information to answer the question, say so clearly.

Context:
${context}

Question: ${query}

Answer based only on the context provided above. If the context doesn't contain the answer, say "I don't have enough information to answer this question based on the available context."`;

      const answer = await this.llmService.generateText(prompt);

      this.logger.log(`Generated answer for query: "${query.substring(0, 50)}..."`);

      return {
        answer,
        sources: relevantDocs.map((doc) => ({
          pageContent: doc.pageContent,
          metadata: doc.metadata,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to process RAG query: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Query the RAG system and return results with similarity scores
   * @param query - The user's question
   * @param maxResults - Maximum number of documents to retrieve (default: 5)
   * @param systemPrompt - Optional system prompt to customize the AI response
   * @returns Promise with answer and source documents with scores
   */
  async queryWithScores(
    query: string,
    maxResults: number = 5,
    systemPrompt?: string,
  ): Promise<{
    answer: string;
    sources: Array<{
      document: {
        pageContent: string;
        metadata: Record<string, any>;
      };
      score: number;
    }>;
  }> {
    try {
      this.logger.log(`Processing RAG query with scores: "${query}"`);

      // Step 1: Perform similarity search with scores to find relevant documents
      const relevantDocsWithScores = await this.vectorStoreService.similaritySearchWithScore(query, maxResults);

      this.logger.log(`Found ${relevantDocsWithScores.length} relevant documents with scores`);

      // Step 2: Prepare context from retrieved documents
      const context = relevantDocsWithScores.map((doc, index) => `[${index + 1}] ${doc[0].pageContent}`).join('\n\n');

      // Step 3: Generate answer using LLM with context
      const prompt =
        systemPrompt ||
        `You are a helpful assistant that answers questions based on the provided context. If the context doesn't contain enough information to answer the question, say so clearly.

Context:
${context}

Question: ${query}

Answer based only on the context provided above. If the context doesn't contain the answer, say "I don't have enough information to answer this question based on the available context."`;

      const answer = await this.llmService.generateText(prompt);

      this.logger.log(`Generated answer for query: "${query.substring(0, 50)}..."`);

      return {
        answer,
        sources: relevantDocsWithScores.map(([doc, score]) => ({
          document: {
            pageContent: doc.pageContent,
            metadata: doc.metadata,
          },
          score,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to process RAG query with scores: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Add text documents to the vector store for RAG
   * @param texts - Array of text strings to add
   * @param metadata - Optional metadata for each text
   * @param ids - Optional IDs for each text
   * @returns Promise<string[]> - Array of document IDs
   */
  async addTexts(texts: string[], metadata?: Record<string, any>[]): Promise<string[]> {
    try {
      const documentIds = await this.vectorStoreService.addTexts(texts, metadata);
      this.logger.log(`Added ${texts.length} text documents to RAG system`);
      return documentIds;
    } catch (error) {
      this.logger.error(`Failed to add texts to RAG system: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}
