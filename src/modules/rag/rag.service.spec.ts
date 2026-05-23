import { createMockTenantContext } from '@/common/utils';
import { LoggerService } from '@/core/logger/logger.service';
import { ProductService } from '@/modules/product/product.service';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { LLMService } from './llm/llm.service';
import { RagService } from './rag.service';
import { VectorStoreService } from './vector-store/vector-store.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Document } from '@langchain/core/documents';
import { Test, TestingModule } from '@nestjs/testing';

describe('RagService', () => {
  let service: RagService;
  let llmService: DeepMocked<LLMService>;
  let vectorStoreService: DeepMocked<VectorStoreService>;
  let productService: DeepMocked<ProductService>;

  const mockTenantContext = createMockTenantContext();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: EmbeddingsService,
          useValue: createMock<EmbeddingsService>(),
        },
        {
          provide: LLMService,
          useValue: createMock<LLMService>(),
        },
        {
          provide: VectorStoreService,
          useValue: createMock<VectorStoreService>(),
        },
        {
          provide: ProductService,
          useValue: createMock<ProductService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    llmService = module.get<DeepMocked<LLMService>>(LLMService);
    vectorStoreService =
      module.get<DeepMocked<VectorStoreService>>(VectorStoreService);
    productService = module.get<DeepMocked<ProductService>>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addDocuments', () => {
    it('should add documents successfully', async () => {
      const mockDocuments = [
        {
          pageContent: 'Test document content',
          metadata: { source: 'test' },
        },
      ];
      const mockIds = ['doc-1'];

      vectorStoreService.addDocuments.mockResolvedValue(mockIds);

      const result = await service.addDocuments(
        mockDocuments,
        mockTenantContext,
      );

      expect(result).toEqual(mockIds);
    });

    it('should handle errors when adding documents', async () => {
      const mockDocuments = [
        {
          pageContent: 'Test document content',
          metadata: { source: 'test' },
        },
      ];
      const mockError = new Error('Vector store error');

      vectorStoreService.addDocuments.mockRejectedValue(mockError);

      await expect(
        service.addDocuments(mockDocuments, mockTenantContext),
      ).rejects.toThrow('Vector store error');
    });
  });

  describe('getDocuments', () => {
    it('should return paginated documents', async () => {
      const mockDocuments = [
        {
          pageContent: 'Test document content',
          metadata: { source: 'test' },
        },
      ];

      vectorStoreService.getDocuments.mockResolvedValue(mockDocuments);

      const result = await service.getDocuments(mockTenantContext, 1, 10);

      expect(result).toEqual({
        success: true,
        data: [
          {
            pageContent: 'Test document content',
            metadata: { source: 'test' },
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
      expect(vectorStoreService.getDocuments).toHaveBeenCalledWith(
        mockTenantContext,
      );
    });

    it('should use default pagination values', async () => {
      vectorStoreService.getDocuments.mockResolvedValue([]);

      const result = await service.getDocuments(mockTenantContext);

      expect(result.pagination?.page).toBe(1);
      expect(result.pagination?.limit).toBe(10);
    });

    it('should hide indexed catalog product documents from admin listings', async () => {
      vectorStoreService.getDocuments.mockResolvedValue([
        {
          pageContent: 'Catalog product',
          metadata: { source: 'catalog', type: 'product' },
        },
        {
          pageContent: 'Uploaded FAQ',
          metadata: { source: 'upload' },
        },
      ]);

      const result = await service.getDocuments(mockTenantContext, 1, 10);

      expect(result.data).toEqual([
        {
          pageContent: 'Uploaded FAQ',
          metadata: { source: 'upload' },
        },
      ]);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('document groups', () => {
    it('should return group title from metadata in grouped listing', async () => {
      vectorStoreService.getDocuments.mockResolvedValue([
        {
          pageContent: 'FAQ content',
          metadata: {
            _id: 'chunk-1',
            shopId: mockTenantContext.shopId,
            documentGroupId: 'group-1',
            title: 'Delivery FAQ',
            source: 'upload',
            preprocess:
              '{"removeNoise":true,"normalizeWhitespace":true,"lowercase":false}',
            uploadedAt: '2024-01-01T00:00:00.000Z',
            locFrom: 1,
            locTo: 10,
            chunkIndex: 0,
            totalChunks: 1,
          },
        },
      ]);

      const result = await service.getDocumentGroups(
        mockTenantContext.shopId,
        1,
        10,
      );

      expect(result.data?.[0]).toMatchObject({
        documentGroupId: 'group-1',
        title: 'Delivery FAQ',
        source: 'upload',
        metadata: {
          source: 'upload',
          preprocess: {
            removeNoise: true,
            normalizeWhitespace: true,
            lowercase: false,
          },
          uploadedAt: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    it('should use filename as title fallback for groups without title', async () => {
      vectorStoreService.getDocuments.mockResolvedValue([
        {
          pageContent: 'FAQ content',
          metadata: {
            documentGroupId: 'group-1',
            filename: 'rag_test_garden_store.txt',
            source: 'upload',
            chunkIndex: 0,
            totalChunks: 1,
          },
        },
      ]);

      const result = await service.getDocumentGroups(
        mockTenantContext.shopId,
        1,
        10,
      );

      expect(result.data?.[0].title).toBe('rag_test_garden_store.txt');
    });

    it('should return group title from metadata by group id', async () => {
      vectorStoreService.getDocumentsByGroup.mockResolvedValue([
        {
          pageContent: 'FAQ content',
          metadata: {
            documentGroupId: 'group-1',
            title: 'Delivery FAQ',
            source: 'upload',
            chunkIndex: 0,
            totalChunks: 1,
          },
        },
      ]);

      const result = await service.getDocumentGroupById(
        'group-1',
        mockTenantContext.shopId,
      );

      expect(result).toMatchObject({
        documentGroupId: 'group-1',
        title: 'Delivery FAQ',
        source: 'upload',
      });
    });

    it('should persist and return title when creating a group', async () => {
      vectorStoreService.addDocumentsWithGroupId.mockResolvedValue({
        documentGroupId: 'group-1',
        chunkIds: ['chunk-1'],
        totalChunks: 1,
      });

      const result = await service.createDocumentGroup(
        {
          title: 'Delivery FAQ',
          source: 'manual-entry',
          chunks: [{ pageContent: 'FAQ content' }],
          metadata: { category: 'support' },
        },
        mockTenantContext.shopId,
      );

      expect(vectorStoreService.addDocumentsWithGroupId).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            metadata: expect.objectContaining({
              title: 'Delivery FAQ',
              category: 'support',
            }),
          }),
        ],
        mockTenantContext.shopId,
        expect.any(String),
      );
      expect(result.title).toBe('Delivery FAQ');
      expect(result.group.title).toBe('Delivery FAQ');
    });

    it('should persist and return title when uploading a group', async () => {
      vectorStoreService.addDocumentsWithGroupId.mockResolvedValue({
        documentGroupId: 'group-1',
        chunkIds: ['chunk-1'],
        totalChunks: 1,
      });

      const result = await service.uploadDocumentAsGroup(
        {
          pageContent: 'FAQ content',
          metadata: { title: 'Uploaded FAQ', source: 'upload' },
        },
        mockTenantContext.shopId,
      );

      expect(vectorStoreService.addDocumentsWithGroupId).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            metadata: expect.objectContaining({ title: 'Uploaded FAQ' }),
          }),
        ],
        mockTenantContext.shopId,
        expect.any(String),
      );
      expect(result.title).toBe('Uploaded FAQ');
      expect(result.group.title).toBe('Uploaded FAQ');
    });
  });

  describe('addTexts', () => {
    it('should add texts successfully', async () => {
      const mockTexts = ['Test text content'];
      const mockMetadatas = [{ source: 'test' }];
      const mockIds = ['text-1'];

      vectorStoreService.addTexts.mockResolvedValue(mockIds);

      const result = await service.addTexts(
        mockTexts,
        mockTenantContext,
        mockMetadatas,
      );

      expect(result).toEqual(mockIds);
    });
  });

  describe('rebuildCatalogIndex', () => {
    it('should delegate catalog reindex to product service', async () => {
      productService.rebuildCatalogIndex.mockResolvedValue(3);

      const result = await service.rebuildCatalogIndex(mockTenantContext);

      expect(productService.rebuildCatalogIndex).toHaveBeenCalledWith(
        mockTenantContext,
      );
      expect(result).toBe(3);
    });
  });

  describe('query', () => {
    it('should return answer for valid query', async () => {
      const mockQuery = 'What is NestJS?';
      const mockRelevantDocs = [
        {
          pageContent: 'NestJS is a Node.js framework',
          metadata: { source: 'docs' },
        },
      ];
      const mockAnswer =
        'NestJS is a progressive Node.js framework for building efficient and scalable server-side applications.';

      vectorStoreService.similaritySearch.mockResolvedValue(mockRelevantDocs);
      llmService.generateText.mockResolvedValue(mockAnswer);
      productService.findAll.mockResolvedValue({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      });

      const result = await service.query(mockQuery, mockTenantContext);

      expect(result).toEqual({
        answer: mockAnswer,
        sources: [
          {
            pageContent: 'NestJS is a Node.js framework',
            metadata: { source: 'vector_store' },
          },
        ],
      });
    });

    it('should handle empty results', async () => {
      const mockQuery = 'Non-existent topic';

      vectorStoreService.similaritySearch.mockResolvedValue([]);
      productService.findAll.mockResolvedValue({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      });
      productService.findAvailableProducts.mockResolvedValue([]);

      const result = await service.query(mockQuery, mockTenantContext);

      expect(result).toEqual({
        answer: "I don't know.",
        sources: [],
      });
    });

    it('should use custom maxResults', async () => {
      const mockQuery = 'Test query';
      const mockMaxResults = 3;
      const mockRelevantDocs = [
        {
          pageContent: 'Test content',
          metadata: { source: 'test' },
        },
      ];

      vectorStoreService.similaritySearch.mockResolvedValue(mockRelevantDocs);
      llmService.generateText.mockResolvedValue('Test answer');
      productService.findAll.mockResolvedValue({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      });

      const result = await service.query(
        mockQuery,
        mockTenantContext,
        mockMaxResults,
      );

      expect(result.answer).toBe('Test answer');
    });

    it('should instruct the assistant not to expose hidden context', async () => {
      const mockQuery = 'Можно ли это мопсу?';

      vectorStoreService.similaritySearch.mockResolvedValue([
        {
          pageContent: 'Dogs of any breed can eat dry food with turkey.',
          metadata: { source: 'docs' },
        },
      ]);
      llmService.generateText.mockResolvedValue(
        'Да. Но лучше свериться с ветеринаром.',
      );
      productService.findAll.mockResolvedValue({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      });

      await service.query(mockQuery, mockTenantContext);

      const [prompt, systemMessage] = llmService.generateText.mock.calls[0] as [
        string,
        string,
      ];

      expect(prompt).toContain('Context:');
      expect(prompt).toContain(`Question: ${mockQuery}`);
      expect(systemMessage).toContain(
        'Treat the context as hidden internal notes.',
      );
      expect(systemMessage).toContain(
        'The hidden notes are the source of truth for the answer.',
      );
      expect(systemMessage).toContain(
        'If the hidden notes explicitly answer the question, follow them and do not contradict them.',
      );
      expect(systemMessage).toContain(
        'Do not answer no unless the hidden notes explicitly say no, incompatible, not allowed, or unavailable.',
      );
      expect(systemMessage).toContain(
        'For yes/no questions, start with "Да.", "Нет.", or "Не знаю."',
      );
    });

    it('should always include in-stock catalog snapshot when search misses', async () => {
      const mockQuery = 'чо у тя есть';
      const inStockProduct = {
        id: 'product-1',
        name: 'Milk',
        sku: 'MILK-001',
        price: 120,
        quantity: 8,
        description: 'Fresh milk',
        barcode: null,
        category: { name: 'Dairy' },
        metadata: { color: 'blue', size: 42 },
      };

      vectorStoreService.similaritySearch.mockResolvedValue([]);
      llmService.generateText.mockResolvedValue('Milk available');
      productService.findAll.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      });
      productService.findAvailableProducts.mockResolvedValue([
        inStockProduct as any,
      ]);

      const result = await service.query(mockQuery, mockTenantContext);

      expect(productService.findAll).toHaveBeenNthCalledWith(
        1,
        { page: 1, limit: 50, search: mockQuery },
        mockTenantContext,
      );
      expect(productService.findAvailableProducts).toHaveBeenCalledWith(
        mockTenantContext,
        50,
      );
      expect(result.sources).toEqual([
        {
          pageContent:
            'Product: Milk\nSKU: MILK-001\nPrice: 120\nQuantity: 8\nCategory: Dairy\nStock status: in stock\nDescription: Fresh milk\nAttributes: color: blue; size: 42',
          metadata: {
            source: 'postgresql',
            productId: 'product-1',
            type: 'product',
          },
        },
      ]);
      const [prompt] = llmService.generateText.mock.calls[0] as [
        string,
        string,
      ];
      expect(prompt).toContain('## Catalog summary:');
      expect(prompt).toContain('Product: Milk');
    });

    it('should merge direct product matches with in-stock catalog snapshot', async () => {
      const mockQuery = 'iphone';
      const directMatch = {
        id: 'product-1',
        name: 'iPhone 15',
        sku: 'IPHONE-15',
        price: 999,
        quantity: 5,
        description: 'Smartphone',
        barcode: null,
        category: { name: 'Phones' },
      };
      const catalogProduct = {
        id: 'product-2',
        name: 'Wireless Charger',
        sku: 'CHARGER-01',
        price: 49,
        quantity: 12,
        description: 'Phone accessory charger',
        barcode: null,
        category: { name: 'Accessories' },
      };

      vectorStoreService.similaritySearch.mockResolvedValue([]);
      llmService.generateText.mockResolvedValue('iPhone 15 available');
      productService.findAll.mockResolvedValueOnce({
        success: true,
        data: [directMatch as any],
        pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
      });
      productService.findAvailableProducts.mockResolvedValue([
        catalogProduct as any,
        directMatch as any,
      ]);

      const result = await service.query(mockQuery, mockTenantContext);

      expect(result.sources).toEqual([
        {
          pageContent:
            'Product: iPhone 15\nSKU: IPHONE-15\nPrice: 999\nQuantity: 5\nCategory: Phones\nStock status: in stock\nDescription: Smartphone',
          metadata: {
            source: 'postgresql',
            productId: 'product-1',
            type: 'product',
          },
        },
        {
          pageContent:
            'Product: Wireless Charger\nSKU: CHARGER-01\nPrice: 49\nQuantity: 12\nCategory: Accessories\nStock status: in stock\nDescription: Phone accessory charger',
          metadata: {
            source: 'postgresql',
            productId: 'product-2',
            type: 'product',
          },
        },
      ]);
      const [prompt] = llmService.generateText.mock.calls[0] as [
        string,
        string,
      ];
      expect(prompt).toContain('Product: iPhone 15');
      expect(prompt).toContain('Product: Wireless Charger');
    });

    it('should provide the full catalog snapshot for follow-up product questions', async () => {
      const mockQuery = 'что у тебя есть в магазине\nкакие смартфоны есть';
      const iphone = {
        id: 'product-1',
        name: 'iPhone 15 Pro',
        sku: 'IPHONE-15-PRO',
        price: 1499,
        quantity: 4,
        category: { name: 'Audio' },
        description: 'Flagship Apple smartphone',
        barcode: null,
      };
      const galaxy = {
        id: 'product-2',
        name: 'Samsung Galaxy S24',
        sku: 'GALAXY-S24',
        price: 1299,
        quantity: 6,
        category: { name: 'Audio' },
        description: 'Android smartphone',
        barcode: null,
      };
      const airpods = {
        id: 'product-3',
        name: 'AirPods Pro',
        sku: 'AIRPODS-PRO',
        price: 299,
        quantity: 10,
        category: { name: 'Accessories' },
        description: 'Wireless earbuds',
        barcode: null,
      };

      vectorStoreService.similaritySearch.mockResolvedValue([]);
      llmService.generateText.mockResolvedValue(
        'Есть iPhone 15 Pro и Samsung Galaxy S24',
      );
      productService.findAll.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      });
      productService.findAvailableProducts.mockResolvedValue([
        iphone as any,
        galaxy as any,
        airpods as any,
      ]);

      await service.query(mockQuery, mockTenantContext);

      const [prompt] = llmService.generateText.mock.calls[0] as [
        string,
        string,
      ];
      expect(prompt).toContain(
        'Question: что у тебя есть в магазине\nкакие смартфоны есть',
      );
      expect(prompt).toContain('Product: Samsung Galaxy S24');
      expect(prompt).toContain('Product: iPhone 15 Pro');
      expect(prompt).toContain('Product: AirPods Pro');
    });

    it('should retry retrieval with normalized product terms for natural-language product questions', async () => {
      const mockQuery = 'можно ли этот сухой корм моему мопсу';
      const product = {
        id: 'product-1',
        name: 'Сухой корм для собак с индейкой',
        sku: 'DOG-FOOD-TR',
        price: 350,
        quantity: 5,
        category: { name: 'Pet food' },
        description: 'Полнорационный сухой корм',
        barcode: null,
      };

      vectorStoreService.similaritySearch.mockImplementation((searchQuery) => {
        if (searchQuery.includes('Сухой корм для собак с индейкой')) {
          return [
            {
              pageContent: 'собакам любой пароды можно сухой корм с индейкой.',
              metadata: { source: 'docs' },
            },
          ] satisfies Document[];
        }

        return [];
      });
      llmService.generateText.mockResolvedValue('Да.');
      productService.findAll
        .mockResolvedValueOnce({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: [product as any],
          pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
        });
      productService.findAvailableProducts.mockResolvedValue([product as any]);

      await service.query(mockQuery, mockTenantContext);

      expect(productService.findAll).toHaveBeenNthCalledWith(
        1,
        { page: 1, limit: 50, search: mockQuery },
        mockTenantContext,
      );
      expect(productService.findAll).toHaveBeenNthCalledWith(
        2,
        { page: 1, limit: 50, search: 'сухой корм мопсу' },
        mockTenantContext,
      );
      expect(vectorStoreService.similaritySearch).toHaveBeenCalledWith(
        expect.stringContaining('Сухой корм для собак с индейкой'),
        mockTenantContext,
        5,
      );

      const [prompt] = llmService.generateText.mock.calls[0] as [
        string,
        string,
      ];
      expect(prompt).toContain(
        'собакам любой пароды можно сухой корм с индейкой.',
      );
      expect(prompt).toContain('Product: Сухой корм для собак с индейкой');
    });
  });

  describe('getAvailableProducts', () => {
    it('should return only in-stock products sorted by quantity desc', async () => {
      const highStock = { id: 'product-2', name: 'Rice', quantity: 12 };
      const lowStock = { id: 'product-1', name: 'Milk', quantity: 3 };

      productService.findAvailableProducts.mockResolvedValue([
        lowStock as any,
        highStock as any,
      ]);

      const result = await service.getAvailableProducts(mockTenantContext);

      expect(productService.findAvailableProducts).toHaveBeenCalledWith(
        mockTenantContext,
        100,
      );
      expect(result).toEqual([highStock, lowStock]);
    });
  });

  describe('queryStream', () => {
    it('should use the same hidden-context instructions for streaming answers', async () => {
      const mockQuery = 'Подойдет ли корм мопсу?';

      vectorStoreService.similaritySearch.mockResolvedValue([
        {
          pageContent: 'Dogs of any breed can eat dry food with turkey.',
          metadata: { source: 'docs' },
        },
      ]);
      productService.findAll.mockResolvedValue({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      });
      productService.findAvailableProducts.mockResolvedValue([]);
      llmService.generateStream.mockImplementation(function* () {
        yield 'Не знаю';
      });

      for await (const chunk of service.queryStream(
        mockQuery,
        mockTenantContext,
      )) {
        void chunk;
      }

      const [prompt, systemMessage] = llmService.generateStream.mock
        .calls[0] as [string, string];

      expect(prompt).toContain(`Question: ${mockQuery}`);
      expect(systemMessage).toContain(
        'Treat the context as hidden internal notes.',
      );
      expect(systemMessage).toContain(
        'For yes/no questions, start with "Да.", "Нет.", or "Не знаю."',
      );
    });
  });

  describe('queryWithScores', () => {
    it('should return results with scores', async () => {
      const mockQuery = 'Test query';
      const mockDocument = {
        pageContent: 'Test content',
        metadata: { source: 'test' },
      };
      const mockDocsWithScores: [any, number][] = [[mockDocument, 0.95]];
      const mockAnswer = 'Test answer with scores';

      vectorStoreService.similaritySearchWithScore.mockResolvedValue(
        mockDocsWithScores,
      );
      vectorStoreService.similaritySearch.mockResolvedValue([mockDocument]);
      llmService.generateText.mockResolvedValue(mockAnswer);
      productService.findAll.mockResolvedValue({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      });

      const result = await service.queryWithScores(
        mockQuery,
        mockTenantContext,
      );

      expect(result).toEqual({
        answer: mockAnswer,
        sources: [
          {
            document: {
              pageContent: 'Test content',
              metadata: { source: 'vector_store' },
            },
            score: 0.95,
          },
        ],
      });
    });
  });
});
