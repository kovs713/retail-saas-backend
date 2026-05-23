import { PaginationResponse } from '@/common/dto';
import { LoggerService } from '@/core/logger/logger.service';
import { Product } from '@/modules/product/entities/product.entity';
import { ProductService } from '@/modules/product/product.service';
import {
  CreateRagDocumentDto,
  DocumentChunkDto,
  DocumentGroupDto,
  DocumentResponseDto,
  RagDocumentGroupResponseDto,
  UpdateRagDocumentDto,
} from './dto';
import { LLMService } from './llm/llm.service';
import { VectorStoreService } from './vector-store/vector-store.service';

import { Document } from '@langchain/core/documents';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RagService {
  private readonly logger: LoggerService = new LoggerService(RagService.name);
  private static readonly hiddenGroupMetadataKeys = new Set([
    '_id',
    'shopId',
    'documentGroupId',
    'chunkIndex',
    'totalChunks',
    'locFrom',
    'locTo',
    'title',
  ]);
  private static readonly catalogContextLimit = 50;
  private static readonly retrievalStopWords = new Set([
    'a',
    'an',
    'are',
    'can',
    'for',
    'is',
    'my',
    'the',
    'this',
    'what',
    'with',
    'без',
    'был',
    'бы',
    'в',
    'во',
    'для',
    'есть',
    'же',
    'и',
    'или',
    'к',
    'как',
    'какая',
    'какие',
    'какой',
    'какую',
    'ли',
    'мне',
    'моего',
    'моей',
    'моем',
    'моему',
    'моим',
    'мой',
    'моя',
    'может',
    'можно',
    'мою',
    'мы',
    'на',
    'наш',
    'наша',
    'не',
    'но',
    'о',
    'об',
    'он',
    'она',
    'они',
    'с',
    'со',
    'такой',
    'твоя',
    'твой',
    'тебе',
    'у',
    'этим',
    'это',
    'этого',
    'этой',
    'этом',
    'этот',
    'эту',
    'я',
  ]);

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
    const documents = (
      await this.vectorStoreService.getDocuments(shopId)
    ).filter((doc) => !this.isCatalogDocument(doc));

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
    const documents = (
      await this.vectorStoreService.getDocuments(shopId)
    ).filter((doc) => !this.isCatalogDocument(doc));

    const groupsMap = new Map<string, DocumentGroupDto>();
    for (const doc of documents) {
      const groupId = doc.metadata?.documentGroupId as string;
      if (!groupId) {
        continue;
      }

      if (!groupsMap.has(groupId)) {
        const source =
          (doc.metadata?.source as string) ||
          (doc.metadata?.filename as string) ||
          'unknown';
        groupsMap.set(groupId, {
          documentGroupId: groupId,
          title: this.getDocumentTitle(doc.metadata),
          source,
          metadata: this.getGroupMetadata(doc.metadata),
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
    const result = await this.vectorStoreService.addDocuments(
      documents,
      shopId,
    );
    return result;
  }

  async uploadDocumentAsGroup(
    document: Document,
    shopId: string,
  ): Promise<RagDocumentGroupResponseDto> {
    const result = await this.vectorStoreService.addDocumentsWithGroupId(
      [document],
      shopId,
      crypto.randomUUID(),
    );

    const group: DocumentGroupDto = {
      documentGroupId: result.documentGroupId,
      title: this.getDocumentTitle(document.metadata),
      source:
        (document.metadata?.source as string) ||
        (document.metadata?.filename as string) ||
        'upload',
      metadata: this.getGroupMetadata(document.metadata),
      totalChunks: result.totalChunks,
      chunks:
        document.pageContent.match(/[\s\S]{1,1000}/g)?.map((chunk, index) => ({
          pageContent: chunk,
          chunkIndex: index,
          totalChunks: result.totalChunks,
        })) ?? [],
    };

    return {
      documentGroupId: result.documentGroupId,
      title: this.getDocumentTitle(document.metadata),
      totalChunks: result.totalChunks,
      timestamp: new Date().toISOString(),
      group,
    };
  }

  async rebuildCatalogIndex(shopId: string): Promise<number> {
    return this.productService.rebuildCatalogIndex(shopId);
  }

  async clearDocuments(shopId: string): Promise<void> {
    await this.vectorStoreService.deleteDocuments(shopId);
    this.logger.log(`Cleared all documents for organization: ${shopId}`);
  }

  async deleteDocumentGroup(
    documentGroupId: string,
    shopId: string,
  ): Promise<number> {
    const deletedCount = await this.vectorStoreService.deleteDocumentGroup(
      documentGroupId,
      shopId,
    );
    this.logger.log(
      `Deleted ${deletedCount} chunks for documentGroupId: ${documentGroupId}`,
    );
    return deletedCount;
  }

  async getDocumentGroupById(
    documentGroupId: string,
    shopId: string,
  ): Promise<DocumentGroupDto | null> {
    const documents = await this.vectorStoreService.getDocumentsByGroup(
      documentGroupId,
      shopId,
    );

    if (documents.length === 0) {
      return null;
    }

    const filteredDocs = documents.filter(
      (doc) => !this.isCatalogDocument(doc),
    );

    if (filteredDocs.length === 0) {
      return null;
    }

    const source =
      (filteredDocs[0].metadata?.source as string) ||
      (filteredDocs[0].metadata?.filename as string) ||
      'unknown';

    const group: DocumentGroupDto = {
      documentGroupId,
      title: this.getDocumentTitle(filteredDocs[0].metadata),
      source,
      metadata: this.getGroupMetadata(filteredDocs[0].metadata),
      totalChunks: filteredDocs.length,
      chunks: filteredDocs.map((doc) => ({
        pageContent: doc.pageContent,
        chunkIndex: doc.metadata?.chunkIndex as number,
        totalChunks: doc.metadata?.totalChunks as number,
      })),
    };

    return group;
  }

  async createDocumentGroup(
    dto: CreateRagDocumentDto,
    shopId: string,
  ): Promise<RagDocumentGroupResponseDto> {
    const title = this.getDocumentTitle(
      dto.title !== undefined
        ? { ...dto.metadata, title: dto.title }
        : dto.metadata,
    );
    const timestamp = new Date().toISOString();
    const documents = dto.chunks.map((chunk) => ({
      pageContent: chunk.pageContent,
      metadata: {
        ...dto.metadata,
        ...(title !== undefined ? { title } : {}),
        source: dto.source,
        timestamp,
      },
    }));

    const result = await this.vectorStoreService.addDocumentsWithGroupId(
      documents,
      shopId,
      crypto.randomUUID(),
    );

    const group: DocumentGroupDto = {
      documentGroupId: result.documentGroupId,
      title,
      source: dto.source,
      metadata: this.getGroupMetadata({
        ...dto.metadata,
        ...(title !== undefined ? { title } : {}),
        source: dto.source,
        timestamp,
      }),
      totalChunks: result.totalChunks,
      chunks: dto.chunks.map((chunk, index) => ({
        pageContent: chunk.pageContent,
        chunkIndex: index,
        totalChunks: result.totalChunks,
      })),
    };

    return {
      documentGroupId: result.documentGroupId,
      title,
      totalChunks: result.totalChunks,
      timestamp: new Date().toISOString(),
      group,
    };
  }

  async updateDocumentGroup(
    documentGroupId: string,
    shopId: string,
    dto: UpdateRagDocumentDto,
  ): Promise<RagDocumentGroupResponseDto | null> {
    const existingGroup = await this.getDocumentGroupById(
      documentGroupId,
      shopId,
    );

    if (!existingGroup) {
      return null;
    }

    const chunksToUpdate: DocumentChunkDto[] = dto.chunks
      ? dto.chunks.map((c) => ({
          pageContent: c.pageContent ?? '',
          chunkIndex: c.pageOrder,
          totalChunks: dto.chunks?.length ?? existingGroup.totalChunks,
        }))
      : existingGroup.chunks;
    const source = dto.source ?? existingGroup.source;
    const metadata = {
      ...existingGroup.metadata,
      ...(existingGroup.title !== undefined
        ? { title: existingGroup.title }
        : {}),
      ...dto.metadata,
      ...(dto.title !== undefined ? { title: dto.title } : {}),
    };
    const fallbackContent = existingGroup.chunks[0]?.pageContent ?? '';
    const title = this.getDocumentTitle(metadata);

    const documents: Document[] = chunksToUpdate.map((chunk) => ({
      pageContent: chunk.pageContent ?? fallbackContent,
      metadata: {
        ...metadata,
        source,
        timestamp: new Date().toISOString(),
      },
    }));

    const totalChunks = await this.vectorStoreService.updateDocumentGroup(
      documentGroupId,
      shopId,
      documents,
    );

    const updatedGroup: DocumentGroupDto = {
      documentGroupId,
      title,
      source,
      metadata: this.getGroupMetadata(metadata),
      totalChunks,
      chunks: chunksToUpdate.map((chunk, index) => ({
        pageContent:
          chunk.pageContent ?? existingGroup.chunks[index]?.pageContent ?? '',
        chunkIndex: index,
        totalChunks,
      })),
    };

    return {
      documentGroupId,
      title,
      totalChunks,
      timestamp: new Date().toISOString(),
      group: updatedGroup,
    };
  }

  private getDocumentTitle(
    metadata?: Record<string, unknown>,
  ): string | undefined {
    const title = this.getNonEmptyString(metadata?.title);
    if (title) {
      return title;
    }

    return this.getNonEmptyString(metadata?.filename);
  }

  private getGroupMetadata(
    metadata?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const groupMetadata: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata ?? {})) {
      if (RagService.hiddenGroupMetadataKeys.has(key)) {
        continue;
      }

      groupMetadata[key] =
        key === 'preprocess' ? this.parsePreprocessMetadata(value) : value;
    }

    return Object.keys(groupMetadata).length > 0 ? groupMetadata : undefined;
  }

  private parsePreprocessMetadata(value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  private getNonEmptyString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  private mergeProducts(
    searchProducts: Product[],
    availableProducts: Product[],
  ): Product[] {
    const mergedProducts = new Map<string, Product>();

    for (const product of [...searchProducts, ...availableProducts]) {
      if (!mergedProducts.has(product.id)) {
        mergedProducts.set(product.id, product);
      }
    }

    return [...mergedProducts.values()];
  }

  private deduplicateVectorDocs(documents: Document[]): Document[] {
    const uniqueDocuments = new Map<string, Document>();

    for (const document of documents) {
      const key = `${document.pageContent}::${JSON.stringify(document.metadata ?? {})}`;
      if (!uniqueDocuments.has(key)) {
        uniqueDocuments.set(key, document);
      }
    }

    return [...uniqueDocuments.values()];
  }

  private normalizeRetrievalQuery(query: string): string | null {
    const tokens: string[] = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    if (tokens.length == 0) {
      return null;
    }

    const normalizedTokens = tokens.filter(
      (token) => token.length > 2 && !RagService.retrievalStopWords.has(token),
    );

    if (normalizedTokens.length === 0) {
      return null;
    }

    const normalizedQuery = [...new Set(normalizedTokens)].join(' ');
    return normalizedQuery === query.trim().toLowerCase()
      ? null
      : normalizedQuery;
  }

  private buildVectorSearchQueries(
    query: string,
    normalizedQuery: string | null,
    matchedProducts: Product[],
  ): string[] {
    const queries: string[] = [];
    const productHints = matchedProducts
      .slice(0, 3)
      .map((product) =>
        [product.name, product.description].filter(Boolean).join('\n'),
      )
      .filter(Boolean)
      .join('\n\n');

    if (productHints) {
      queries.push(`${query}\n\nProduct hints:\n${productHints}`);
      if (normalizedQuery) {
        queries.push(`${normalizedQuery}\n\nProduct hints:\n${productHints}`);
      }
    }

    queries.push(query);
    if (normalizedQuery) {
      queries.push(normalizedQuery);
    }

    return [...new Set(queries.map((value) => value.trim()).filter(Boolean))];
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

    const parts = [
      `In-stock products: ${products.length}`,
      `Price range: ${minPrice}-${maxPrice}`,
    ];
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
    const attributes = this.formatProductMetadata(product.metadata);

    return [
      `Product: ${product.name}`,
      `SKU: ${product.sku}`,
      `Price: ${product.price}`,
      `Quantity: ${product.quantity}`,
      ...(categoryName ? [`Category: ${categoryName}`] : []),
      `Stock status: ${product.quantity > 0 ? 'in stock' : 'out of stock'}`,
      ...(product.description ? [`Description: ${product.description}`] : []),
      ...(attributes ? [`Attributes: ${attributes}`] : []),
      ...(product.barcode ? [`Barcode: ${product.barcode}`] : []),
    ].join('\n');
  }

  async getAvailableProducts(
    shopId: string,
    limit: number = 100,
  ): Promise<Product[]> {
    const products = await this.productService.findAvailableProducts(
      shopId,
      limit,
    );

    return products.sort((left, right) => right.quantity - left.quantity);
  }

  private async buildCombinedContext(
    query: string,
    shopId: string,
    maxResults: number,
  ): Promise<{
    context: string;
    sources: Array<{ pageContent: string; metadata: Record<string, any> }>;
  }> {
    const normalizedQuery = this.normalizeRetrievalQuery(query);
    const [productsSearchResult, availableProducts] = await Promise.all([
      this.productService
        .findAll(
          {
            page: 1,
            limit: RagService.catalogContextLimit,
            search: query,
          },
          shopId,
        )
        .catch(() => ({
          data: [],
          pagination: { total: 0 },
        })),
      this.productService
        .findAvailableProducts(shopId, RagService.catalogContextLimit)
        .catch(() => []),
    ]);

    let matchedProducts = Array.isArray(productsSearchResult.data)
      ? productsSearchResult.data
      : [];
    if (matchedProducts.length === 0 && normalizedQuery) {
      const normalizedProductsSearchResult = await this.productService
        .findAll(
          {
            page: 1,
            limit: RagService.catalogContextLimit,
            search: normalizedQuery,
          },
          shopId,
        )
        .catch(() => ({
          data: [],
          pagination: { total: 0 },
        }));

      matchedProducts = Array.isArray(normalizedProductsSearchResult.data)
        ? normalizedProductsSearchResult.data
        : [];
    }

    const catalogProducts = this.mergeProducts(
      matchedProducts,
      availableProducts,
    );
    const vectorSearchQueries = this.buildVectorSearchQueries(
      query,
      normalizedQuery,
      matchedProducts,
    );
    const vectorSearchResults = await Promise.all(
      vectorSearchQueries.map(async (searchQuery) => {
        try {
          return await this.vectorStoreService.similaritySearch(
            searchQuery,
            shopId,
            maxResults,
          );
        } catch {
          return [];
        }
      }),
    );
    const vectorDocs = this.deduplicateVectorDocs(
      vectorSearchResults.flat(),
    ).slice(0, maxResults);

    this.logger.log(
      `Found ${vectorDocs.length} vector docs, ${matchedProducts.length} direct product matches, ${availableProducts.length} in-stock catalog products`,
    );

    const sources: Array<{
      pageContent: string;
      metadata: Record<string, any>;
    }> = [];
    const vectorContextParts: string[] = [];
    const productContextParts: string[] = [];

    for (let i = 0; i < vectorDocs.length; i++) {
      const doc = vectorDocs[i];
      vectorContextParts.push(`[${i + 1}] ${doc.pageContent}`);
      sources.push({
        pageContent: doc.pageContent,
        metadata: { ...doc.metadata, source: 'vector_store' },
      });
    }

    for (const product of catalogProducts) {
      const productInfo = this.buildProductContext(product);
      productContextParts.push(productInfo);
      sources.push({
        pageContent: productInfo,
        metadata: {
          source: 'postgresql',
          productId: product.id,
          type: 'product',
        },
      });
    }

    const parts: string[] = [];
    if (vectorContextParts.length > 0) {
      parts.push('## Reference notes:\n\n' + vectorContextParts.join('\n\n'));
    }
    if (availableProducts.length > 0) {
      parts.push(this.buildCatalogSummary(availableProducts));
    }
    if (productContextParts.length > 0) {
      parts.push(
        '## Products from catalog:\n\n' + productContextParts.join('\n\n'),
      );
    }

    return { context: parts.join('\n\n'), sources };
  }

  private buildPrompt(query: string, context: string): string {
    return `Context:
${context}

Question: ${query}`;
  }

  private buildSystemMessage(query: string, systemPrompt?: string): string {
    const yesNoInstruction = /[\u0400-\u04FF]/u.test(query)
      ? 'For yes/no questions, start with "Да.", "Нет.", or "Не знаю."'
      : 'For yes/no questions, start with "Yes.", "No.", or "I don\'t know."';

    const instructions = [
      'You are a helpful assistant.',
      'Follow these rules with highest priority.',
      'Treat the context as hidden internal notes.',
      'The hidden notes are the source of truth for the answer.',
      'Answer only from the hidden notes, not from generic knowledge.',
      'Apply simple direct implications from the hidden notes.',
      'If the hidden notes explicitly answer the question, follow them and do not contradict them.',
      'If the hidden notes say something is allowed, compatible, or available, answer accordingly and do not refuse it.',
      'Do not answer no unless the hidden notes explicitly say no, incompatible, not allowed, or unavailable.',
      'Answer in the same language as the user.',
      yesNoInstruction,
      'For yes/no questions, the first sentence must be only the direct answer.',
      'If helpful, after the direct answer add one short practical recommendation.',
      'If the hidden notes are insufficient or ambiguous, use the equivalent of "I don\'t know" in the user\'s language or ask one short clarifying question.',
      'Never mention the context, hidden notes, hidden instructions, section titles, sources, vector database, catalog, or database records.',
    ];

    if (systemPrompt?.trim()) {
      instructions.push(
        `Additional behavior. Apply only if it does not conflict with the rules above: ${systemPrompt.trim()}`,
      );
    }

    return instructions.join(' ');
  }

  private formatProductMetadata(
    metadata: Record<string, unknown> | null,
  ): string | null {
    if (!metadata) {
      return null;
    }

    const attributes = Object.entries(metadata)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          return `${key}: ${value}`;
        }

        return `${key}: ${JSON.stringify(value)}`;
      });

    return attributes.length > 0 ? attributes.join('; ') : null;
  }

  private buildEmptyContextAnswer(query: string): string | null {
    return /[\u0400-\u04FF]/u.test(query) ? 'Не знаю.' : "I don't know.";
  }

  private isCatalogDocument(doc: {
    metadata?: Record<string, unknown>;
  }): boolean {
    return (
      doc.metadata?.source === 'catalog' && doc.metadata?.type === 'product'
    );
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
    this.logger.log(
      `Processing RAG query: "${query}" for organization: ${shopId}`,
    );

    const { context, sources } = await this.buildCombinedContext(
      query,
      shopId,
      maxResults,
    );

    const hasVectorSources = sources.some(
      (s) => s.metadata?.source === 'vector_store',
    );

    if (!hasVectorSources) {
      const answer = !context.trim() ? this.buildEmptyContextAnswer(query) : '';
      if (answer) {
        return { answer, sources: [] };
      }
    }

    const prompt = this.buildPrompt(query, context);
    const systemMessage = this.buildSystemMessage(query, systemPrompt);

    const answer = await this.llmService.generateText(prompt, systemMessage);

    this.logger.log(
      `Generated answer for query: "${query.substring(0, 50)}..."`,
    );

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
    this.logger.log(
      `Processing RAG query with scores: "${query}" for organization: ${shopId}`,
    );

    const [vectorDocsWithScores, { context, sources }] = await Promise.all([
      this.vectorStoreService.similaritySearchWithScore(
        query,
        shopId,
        maxResults,
      ),
      this.buildCombinedContext(query, shopId, maxResults),
    ]);

    this.logger.log(
      `Found ${vectorDocsWithScores.length} vector documents with scores`,
    );

    const hasVectorSources = sources.some(
      (s) => s.metadata?.source === 'vector_store',
    );

    if (!hasVectorSources && !context.trim()) {
      const fallbackAnswer = this.buildEmptyContextAnswer(query);
      return { answer: fallbackAnswer ?? '', sources: [] };
    }

    const prompt = this.buildPrompt(query, context);
    const systemMessage = this.buildSystemMessage(query, systemPrompt);

    const answer = await this.llmService.generateText(prompt, systemMessage);

    this.logger.log(
      `Generated answer for query: "${query.substring(0, 50)}..."`,
    );

    return {
      answer,
      sources: sources.map((src, idx) => ({
        document: { pageContent: src.pageContent, metadata: src.metadata },
        score:
          idx < vectorDocsWithScores.length ? vectorDocsWithScores[idx][1] : 0,
      })),
    };
  }

  async addTexts(
    texts: string[],
    shopId: string,
    metadata?: Record<string, any>[],
  ): Promise<string[]> {
    const documentIds = await this.vectorStoreService.addTexts(
      texts,
      shopId,
      metadata,
    );
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
    | {
        type: 'complete';
        sources: Array<{ pageContent: string; metadata: Record<string, any> }>;
      }
  > {
    this.logger.log(
      `Processing streaming RAG query: "${query}" for organization: ${shopId}`,
    );

    const { context, sources } = await this.buildCombinedContext(
      retrievalQuery ?? query,
      shopId,
      maxResults,
    );

    const hasVectorSources = sources.some(
      (s) => s.metadata?.source === 'vector_store',
    );

    if (!hasVectorSources && !context.trim()) {
      const answer = this.buildEmptyContextAnswer(query);
      yield { type: 'chunk', content: answer ?? '' };
      yield { type: 'complete', sources: [] };
      return;
    }

    const prompt = this.buildPrompt(query, context);
    const systemMessage = this.buildSystemMessage(query, systemPrompt);

    for await (const chunk of this.llmService.generateStream(
      prompt,
      systemMessage,
    )) {
      yield { type: 'chunk', content: chunk };
    }

    this.logger.log(
      `Generated streaming answer for query: "${query.substring(0, 50)}..."`,
    );

    yield { type: 'complete', sources };
  }
}
