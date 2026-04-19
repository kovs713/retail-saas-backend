import { PaginationResponse } from '@/common/dto';
import { LoggerService } from '@/core/logger/logger.service';
import { Product } from '@/modules/product/entities/product.entity';
import { ProductService } from '@/modules/product/product.service';
import { DocumentGroupDto, DocumentResponseDto } from './dto';
import { LLMService } from './llm/llm.service';
import { VectorStoreService } from './vector-store/vector-store.service';

import { Document } from '@langchain/core/documents';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RagService {
  private readonly logger: LoggerService = new LoggerService(RagService.name);
  private static readonly availabilityMarkers = [
    'in stock',
    'available',
    'avaliable',
    'inventory',
    'catalog',
    'catalogue',
    'is there any',
    'do you have',
    'what do you have',
    'what products',
    'what items',
    'what is available',
    'available in shop',
    'phone-related',
    'что есть',
    'какие товары',
    'в наличии',
    'ассортимент',
    'каталог',
    'налич',
  ];
  private static readonly ignoredQueryTerms = new Set([
    'is',
    'there',
    'any',
    'are',
    'in',
    'the',
    'shop',
    'right',
    'now',
    'what',
    'do',
    'you',
    'have',
    'items',
    'item',
    'thing',
    'things',
    'related',
    'products',
    'product',
    'available',
    'avaliable',
    'stock',
    'inventory',
    'catalog',
    'catalogue',
    'есть',
    'что',
    'какие',
    'товары',
    'товар',
    'магазине',
    'магазин',
    'наличии',
    'наличие',
    'наличии',
    'в',
  ]);
  private static readonly relatedTermExpansions: Record<string, string[]> = {
    phone: ['smartphone', 'iphone', 'mobile', 'cellphone', 'handset'],
    smartphone: ['phone', 'iphone', 'mobile', 'cellphone', 'handset'],
    accessory: ['accessories', 'charger', 'case', 'cable', 'headphone'],
    accessories: ['accessory', 'charger', 'case', 'cable', 'headphone'],
  };

  constructor(
    private readonly llmService: LLMService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly productService: ProductService,
  ) {}

  async getDocuments(
    shopId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResponse<DocumentResponseDto>> {
    const documents = await this.vectorStoreService.getDocuments(shopId);

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

  async getDocumentGroups(
    shopId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResponse<DocumentGroupDto>> {
    const documents = await this.vectorStoreService.getDocuments(shopId);

    const groupsMap = new Map<string, DocumentGroupDto>();
    for (const doc of documents) {
      const groupId = doc.metadata?.documentGroupId as string;
      if (!groupId) {
        continue;
      }

      if (!groupsMap.has(groupId)) {
        const source = (doc.metadata?.source as string) || (doc.metadata?.filename as string) || 'unknown';
        groupsMap.set(groupId, {
          documentGroupId: groupId,
          source,
          metadata: doc.metadata,
          totalChunks: 0,
          chunks: [],
        });
      }

      const group = groupsMap.get(groupId)!;
      group.chunks.push({
        pageContent: doc.pageContent,
        chunkIndex: doc.metadata?.chunkIndex as number,
        totalChunks: doc.metadata?.totalChunks as number,
      });
      group.totalChunks = group.chunks.length;
    }

    const groups = Array.from(groupsMap.values()).sort((a, b) => {
      const aTime = (a.metadata?.uploadedAt as string) || '';
      const bTime = (b.metadata?.uploadedAt as string) || '';
      return bTime.localeCompare(aTime);
    });

    const total = groups.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedGroups = groups.slice(startIndex, endIndex);

    return {
      success: true,
      data: paginatedGroups,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async addDocuments(documents: Document[], shopId: string): Promise<string[]> {
    const ids = await this.vectorStoreService.addDocuments(documents, shopId);
    return ids;
  }

  async clearDocuments(shopId: string): Promise<void> {
    await this.vectorStoreService.deleteDocuments(shopId);
    this.logger.warn('clearDocuments not fully implemented for LangChain Chroma wrapper');
  }

  async deleteDocumentGroup(documentGroupId: string, shopId: string): Promise<number> {
    const deletedCount = await this.vectorStoreService.deleteDocumentGroup(documentGroupId, shopId);
    this.logger.log(`Deleted ${deletedCount} chunks for documentGroupId: ${documentGroupId}`);
    return deletedCount;
  }

  private isAvailabilityQuery(query: string): boolean {
    const normalizedQuery = query.toLowerCase();

    return RagService.availabilityMarkers.some((marker) => normalizedQuery.includes(marker));
  }

  private extractQueryTerms(query: string): string[] {
    return query
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .map((term) => this.normalizeTerm(term))
      .filter((term) => term.length > 2)
      .filter((term) => !RagService.ignoredQueryTerms.has(term));
  }

  private expandQueryTerms(query: string, terms: string[]): string[] {
    const expandedTerms = new Set(terms);
    const normalizedQuery = query.toLowerCase();

    for (const term of terms) {
      for (const relatedTerm of RagService.relatedTermExpansions[term] ?? []) {
        expandedTerms.add(this.normalizeTerm(relatedTerm));
      }
    }

    if (normalizedQuery.includes('phone-related') || normalizedQuery.includes('related to phone')) {
      expandedTerms.add('accessory');
      expandedTerms.add('charger');
      expandedTerms.add('case');
    }

    return [...expandedTerms];
  }

  private normalizeTerm(term: string): string {
    if (term.endsWith('ies') && term.length > 4) {
      return `${term.slice(0, -3)}y`;
    }

    if (term.endsWith('s') && term.length > 3) {
      return term.slice(0, -1);
    }

    return term;
  }

  private tokenize(value?: string | null): string[] {
    if (!value) {
      return [];
    }

    return value
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .map((term) => this.normalizeTerm(term))
      .filter((term) => term.length > 1);
  }

  private filterProductsByQuery(products: Product[], query: string): Product[] {
    const terms = this.expandQueryTerms(query, this.extractQueryTerms(query));
    if (terms.length === 0) {
      return products;
    }

    const categoryMatches = products.filter((product) => {
      const categoryTerms = this.tokenize(product.category?.name);
      return terms.some((term) => categoryTerms.includes(term));
    });
    if (categoryMatches.length > 0) {
      return categoryMatches;
    }

    const identityMatches = products.filter((product) => {
      const identityTerms = new Set([...this.tokenize(product.name), ...this.tokenize(product.sku)]);
      return terms.some((term) => identityTerms.has(term));
    });
    if (identityMatches.length > 0) {
      return identityMatches;
    }

    const matchedProducts = products.filter((product) => {
      const haystackTerms = new Set([
        ...this.tokenize(product.name),
        ...this.tokenize(product.description),
        ...this.tokenize(product.sku),
        ...this.tokenize(product.category?.name),
      ]);

      return terms.some((term) => haystackTerms.has(term));
    });

    return matchedProducts.length > 0 ? matchedProducts : products;
  }

  private buildCatalogSummary(products: Product[]): string {
    if (products.length === 0) {
      return '## Catalog summary:\n\nIn-stock products: 0';
    }

    const categories = new Map<string, number>();
    let minPrice = products[0].price;
    let maxPrice = products[0].price;

    for (const product of products) {
      const categoryName = product.category?.name;
      if (categoryName) {
        categories.set(categoryName, (categories.get(categoryName) ?? 0) + 1);
      }

      minPrice = Math.min(minPrice, product.price);
      maxPrice = Math.max(maxPrice, product.price);
    }

    const parts = [`In-stock products: ${products.length}`, `Price range: ${minPrice}-${maxPrice}`];
    if (categories.size > 0) {
      parts.push(
        `Categories: ${Array.from(categories.entries())
          .map(([name, count]) => `${name} (${count})`)
          .join(', ')}`,
      );
    }

    return `## Catalog summary:\n\n${parts.join('\n')}`;
  }

  private buildProductContext(product: Product): string {
    const categoryName = product.category?.name;

    return [
      `Product: ${product.name}`,
      `SKU: ${product.sku}`,
      `Price: ${product.price}`,
      `Quantity: ${product.quantity}`,
      ...(categoryName ? [`Category: ${categoryName}`] : []),
      `Stock status: ${product.quantity > 0 ? 'in stock' : 'out of stock'}`,
      ...(product.description ? [`Description: ${product.description}`] : []),
      ...(product.barcode ? [`Barcode: ${product.barcode}`] : []),
    ].join('\n');
  }

  async getAvailableProducts(shopId: string, limit: number = 100): Promise<Product[]> {
    const result = await this.productService.findAll({ page: 1, limit }, shopId);

    return (result.data || [])
      .filter((product) => product.quantity > 0)
      .sort((left, right) => right.quantity - left.quantity);
  }

  private async buildCombinedContext(
    query: string,
    shopId: string,
    maxResults: number,
  ): Promise<{ context: string; sources: Array<{ pageContent: string; metadata: Record<string, any> }> }> {
    const [vectorDocs, productsSearchResult] = await Promise.all([
      this.vectorStoreService.similaritySearch(query, shopId, maxResults),
      this.productService.findAll({ page: 1, limit: 50, search: query }, shopId).catch(() => ({
        data: [],
        pagination: { total: 0 },
      })),
    ]);

    const isAvailabilityQuery = this.isAvailabilityQuery(query);
    let products = productsSearchResult.data || [];

    if (isAvailabilityQuery) {
      products = this.filterProductsByQuery(products, query);
      const fallbackProducts = await this.getAvailableProducts(shopId, 50).catch(() => []);
      const filteredFallbackProducts = this.filterProductsByQuery(fallbackProducts, query);
      if (filteredFallbackProducts.length > 0) {
        products = filteredFallbackProducts;
      }
    }

    this.logger.log(`Found ${vectorDocs.length} vector docs, ${products.length} products`);

    const sources: Array<{ pageContent: string; metadata: Record<string, any> }> = [];
    const productContextParts: string[] = [];
    const vectorContextParts: string[] = [];

    for (const product of products) {
      const productInfo = this.buildProductContext(product);
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
      parts.push(this.buildCatalogSummary(products));
      parts.push('## Products from catalog:\n\n' + productContextParts.join('\n\n'));
    }
    if (vectorContextParts.length > 0) {
      parts.push('## Additional context:\n\n' + vectorContextParts.join('\n\n'));
    }

    return { context: parts.join('\n\n'), sources };
  }

  async query(
    query: string,
    shopId: string,
    maxResults: number = 5,
    systemPrompt?: string,
  ): Promise<{
    answer: string;
    sources: Array<{
      pageContent: string;
      metadata: Record<string, any>;
    }>;
  }> {
    this.logger.log(`Processing RAG query: "${query}" for organization: ${shopId}`);

    const { context, sources } = await this.buildCombinedContext(query, shopId, maxResults);

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
    shopId: string,
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
    this.logger.log(`Processing RAG query with scores: "${query}" for organization: ${shopId}`);

    const [vectorDocsWithScores, { context, sources }] = await Promise.all([
      this.vectorStoreService.similaritySearchWithScore(query, shopId, maxResults),
      this.buildCombinedContext(query, shopId, maxResults),
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

  async addTexts(texts: string[], shopId: string, metadata?: Record<string, any>[]): Promise<string[]> {
    const documentIds = await this.vectorStoreService.addTexts(texts, shopId, metadata);
    return documentIds;
  }

  async *queryStream(
    query: string,
    shopId: string,
    maxResults: number = 5,
    systemPrompt?: string,
    retrievalQuery?: string,
  ): AsyncGenerator<
    | { type: 'chunk'; content: string }
    | { type: 'complete'; sources: Array<{ pageContent: string; metadata: Record<string, any> }> }
  > {
    this.logger.log(`Processing streaming RAG query: "${query}" for organization: ${shopId}`);

    const { context, sources } = await this.buildCombinedContext(retrievalQuery ?? query, shopId, maxResults);

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
