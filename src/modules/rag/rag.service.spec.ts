import { createMockTenantContext } from '@/common/utils';
import { LoggerService } from '@/core/logger/logger.service';
import { ProductService } from '@/modules/product/product.service';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { LLMService } from './llm/llm.service';
import { RagService } from './rag.service';
import { VectorStoreService } from './vector-store/vector-store.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
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
      const mockEmptyAnswer =
        "I don't have enough information to answer this question based on the available context.";

      vectorStoreService.similaritySearch.mockResolvedValue([]);
      llmService.generateText.mockResolvedValue(mockEmptyAnswer);
      productService.findAll.mockResolvedValue({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      });

      const result = await service.query(mockQuery, mockTenantContext);

      expect(result).toEqual({
        answer: mockEmptyAnswer,
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
      expect(llmService.generateText).toHaveBeenCalledWith(
        expect.stringContaining('## Catalog summary:'),
      );
      expect(llmService.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Product: Milk'),
      );
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
      expect(llmService.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Product: iPhone 15'),
      );
      expect(llmService.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Product: Wireless Charger'),
      );
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

      expect(llmService.generateText).toHaveBeenCalledWith(
        expect.stringContaining(
          'Question: что у тебя есть в магазине\nкакие смартфоны есть',
        ),
      );
      expect(llmService.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Product: Samsung Galaxy S24'),
      );
      expect(llmService.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Product: iPhone 15 Pro'),
      );
      expect(llmService.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Product: AirPods Pro'),
      );
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
