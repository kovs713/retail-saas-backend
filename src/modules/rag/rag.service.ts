import { PaginationResponse } from '@/common/dto';
import { TenantContext } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import { ProductService } from '@/modules/product/product.service';
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
    private readonly productService: ProductService,
  ) {}

  async getDocuments(
    tenantContext: TenantContext,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResponse<DocumentResponseDto>> {
    const documents = await this.vectorStoreService.getDocuments(tenantContext);

    const total = documents.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDocuments = documents.slice(startIndex, endIndex);

    return {
      success: true,
      data: paginatedDocuments.map((doc) => ({
        pageContent: doc.pageContent,
        metadata: doc.metadata,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async addDocuments(documents: Document[], tenantContext: TenantContext): Promise<string[]> {
    const ids = await this.vectorStoreService.addDocuments(documents, tenantContext);
    return ids;
  }

  clearDocuments(): void {
    this.logger.warn('clearDocuments not fully implemented for LangChain Chroma wrapper');
  }

  private async buildCombinedContext(
    query: string,
    tenantContext: TenantContext,
    maxResults: number,
  ): Promise<{ context: string; sources: Array<{ pageContent: string; metadata: Record<string, any> }> }> {
    const [vectorDocs, productsResult] = await Promise.all([
      this.vectorStoreService.similaritySearch(query, tenantContext, maxResults),
      this.productService.findAll({ page: 1, limit: 50, search: query }, tenantContext).catch(() => ({
        data: [],
        pagination: { total: 0 },
      })),
    ]);

    this.logger.log(`Found ${vectorDocs.length} vector docs, ${productsResult.data?.length || 0} products`);

    const sources: Array<{ pageContent: string; metadata: Record<string, any> }> = [];
    const productContextParts: string[] = [];
    const vectorContextParts: string[] = [];

    for (const product of productsResult.data || []) {
      const productInfo = [
        `Product: ${product.name}`,
        `SKU: ${product.sku}`,
        `Price: ${product.price}`,
        `Quantity: ${product.quantity}`,
        ...(product.description ? [`Description: ${product.description}`] : []),
        ...(product.barcode ? [`Barcode: ${product.barcode}`] : []),
      ].join('\n');
      productContextParts.push(productInfo);
      sources.push({
        pageContent: productInfo,
        metadata: { source: 'postgresql', productId: product.id, type: 'product' },
      });
    }

    for (let i = 0; i < vectorDocs.length; i++) {
      const doc = vectorDocs[i];
      vectorContextParts.push(`[${i + 1}] ${doc.pageContent}`);
      sources.push({
        pageContent: doc.pageContent,
        metadata: { ...doc.metadata, source: 'vector_store' },
      });
    }

    const parts: string[] = [];
    if (productContextParts.length > 0) {
      parts.push('## Products from catalog:\n\n' + productContextParts.join('\n\n'));
    }
    if (vectorContextParts.length > 0) {
      parts.push('## Additional context:\n\n' + vectorContextParts.join('\n\n'));
    }

    return { context: parts.join('\n\n'), sources };
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

    const { context, sources } = await this.buildCombinedContext(query, tenantContext, maxResults);

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

    return { answer, sources };
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

    const [vectorDocsWithScores, { context, sources }] = await Promise.all([
      this.vectorStoreService.similaritySearchWithScore(query, tenantContext, maxResults),
      this.buildCombinedContext(query, tenantContext, maxResults),
    ]);

    this.logger.log(`Found ${vectorDocsWithScores.length} vector documents with scores`);

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
      sources: sources.map((src, idx) => ({
        document: { pageContent: src.pageContent, metadata: src.metadata },
        score: idx < vectorDocsWithScores.length ? vectorDocsWithScores[idx][1] : 0,
      })),
    };
  }

  async addTexts(texts: string[], tenantContext: TenantContext, metadata?: Record<string, any>[]): Promise<string[]> {
    const documentIds = await this.vectorStoreService.addTexts(texts, tenantContext, metadata);
    return documentIds;
  }

  async *queryStream(
    query: string,
    tenantContext: TenantContext,
    maxResults: number = 5,
    systemPrompt?: string,
  ): AsyncGenerator<
    | { type: 'chunk'; content: string }
    | { type: 'complete'; sources: Array<{ pageContent: string; metadata: Record<string, any> }> }
  > {
    this.logger.log(`Processing streaming RAG query: "${query}" for organization: ${tenantContext.shopId}`);

    const { context, sources } = await this.buildCombinedContext(query, tenantContext, maxResults);

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

    for await (const chunk of this.llmService.generateStream(prompt)) {
      yield { type: 'chunk', content: chunk };
    }

    this.logger.log(`Generated streaming answer for query: "${query.substring(0, 50)}..."`);

    yield { type: 'complete', sources };
  }
}
