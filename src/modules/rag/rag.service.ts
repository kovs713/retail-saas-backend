import { PaginationResponse } from '@/common/dto';
import { TenantContext } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import { DocumentResponseDto } from './dto';
import { LLMService } from './llm/llm.service';
import { VectorStoreService } from './vector-store/vector-store.service';

import { Document } from '@langchain/core/documents';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RagService {
  private readonly logger: LoggerService = new LoggerService(RagService.name);

  constructor(
    private readonly llmService: LLMService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async getDocuments(
    tenantContext: TenantContext,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResponse<DocumentResponseDto>> {
    const result = await this.vectorStoreService.getDocuments(tenantContext, page, limit);
    return result;
  }

  async addDocuments(documents: Document[], tenantContext: TenantContext): Promise<string[]> {
    const ids = await this.vectorStoreService.addDocuments(documents, tenantContext);
    return ids;
  }

  clearDocuments(): void {
    this.logger.warn('clearDocuments not fully implemented for LangChain Chroma wrapper');
  }

  async query(
    query: string,
    tenantContext: TenantContext,
    maxResults: number = 5,
    systemPrompt?: string,
  ): Promise<{
    answer: string;
    sources: Array<{
      pageContent: string;
      metadata: Record<string, any>;
    }>;
  }> {
    this.logger.log(`Processing RAG query: "${query}" for organization: ${tenantContext.shopId}`);

    const relevantDocs = await this.vectorStoreService.similaritySearch(query, tenantContext, maxResults);

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

  async queryWithScores(
    query: string,
    tenantContext: TenantContext,
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
    this.logger.log(`Processing RAG query with scores: "${query}" for organization: ${tenantContext.shopId}`);

    const relevantDocsWithScores = await this.vectorStoreService.similaritySearchWithScore(
      query,
      tenantContext,
      maxResults,
    );

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

  async addTexts(texts: string[], tenantContext: TenantContext, metadata?: Record<string, any>[]): Promise<string[]> {
    const documentIds = await this.vectorStoreService.addTexts(texts, tenantContext, metadata);
    return documentIds;
  }
}
