import { AppLogger } from '@/app/core/logger/app-logger.service';
import { LLMService } from './llm/llm.service';
import { VectorStoreService } from './vector-store/vector-store.service';

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
    const ids = await this.vectorStoreService.addDocuments(documents);
    this.logger.log(`Added ${documents.length} documents to RAG system`);
    return ids;
  }

  clearDocuments(): void {
    this.logger.warn('clearDocuments not fully implemented for LangChain Chroma wrapper');
  }

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
    this.logger.log(`Processing RAG query: "${query}"`);

    const relevantDocs = await this.vectorStoreService.similaritySearch(query, maxResults);

    this.logger.log(`Found ${relevantDocs.length} relevant documents`);

    const context = relevantDocs.map((doc, index) => `[${index + 1}] ${doc.pageContent}`).join('\n\n');

    const baseInstructions =
      'If the context does not contain enough information to answer the question, say so clearly. Answer based only on the context provided above.';

    let prompt: string;
    if (systemPrompt) {
      prompt = `${systemPrompt}

Context:
${context}

Question: ${query}

${baseInstructions}`;
    } else {
      prompt = `You are a helpful assistant that answers questions based on the provided context. ${baseInstructions}

Context:
${context}

Question: ${query}`;
    }

    const answer = await this.llmService.generateText(prompt);

    this.logger.log(`Generated answer for query: "${query.substring(0, 50)}..."`);

    return {
      answer,
      sources: relevantDocs.map((doc) => ({
        pageContent: doc.pageContent,
        metadata: doc.metadata,
      })),
    };
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
    this.logger.log(`Processing RAG query with scores: "${query}"`);

    const relevantDocsWithScores = await this.vectorStoreService.similaritySearchWithScore(query, maxResults);

    this.logger.log(`Found ${relevantDocsWithScores.length} relevant documents with scores`);

    const context = relevantDocsWithScores.map((doc, index) => `[${index + 1}] ${doc[0].pageContent}`).join('\n\n');

    const baseInstructions =
      'If the context does not contain enough information to answer the question, say so clearly. Answer based only on the context provided above.';

    let prompt: string;
    if (systemPrompt) {
      prompt = `${systemPrompt}

Context:
${context}

Question: ${query}

${baseInstructions}`;
    } else {
      prompt = `You are a helpful assistant that answers questions based on the provided context. ${baseInstructions}

Context:
${context}

Question: ${query}`;
    }

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
  }

  /**
   * Add text documents to the vector store for RAG
   * @param texts - Array of text strings to add
   * @param metadata - Optional metadata for each text
   * @param ids - Optional IDs for each text
   * @returns Promise<string[]> - Array of document IDs
   */
  async addTexts(texts: string[], metadata?: Record<string, any>[]): Promise<string[]> {
    const documentIds = await this.vectorStoreService.addTexts(texts, metadata);
    this.logger.log(`Added ${texts.length} text documents to RAG system`);
    return documentIds;
  }
}
