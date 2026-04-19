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
    vectorStoreService = module.get<DeepMocked<VectorStoreService>>(VectorStoreService);
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

      const result = await service.addDocuments(mockDocuments, mockTenantContext);

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

      await expect(service.addDocuments(mockDocuments, mockTenantContext)).rejects.toThrow('Vector store error');
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
      expect(vectorStoreService.getDocuments).toHaveBeenCalledWith(mockTenantContext);
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

      const result = await service.addTexts(mockTexts, mockTenantContext, mockMetadatas);

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
      const mockEmptyAnswer = "I don't have enough information to answer this question based on the available context.";

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

      const result = await service.query(mockQuery, mockTenantContext, mockMaxResults);

      expect(result.answer).toBe('Test answer');
    });

    it('should fall back to in-stock catalog for generic availability queries', async () => {
      const mockQuery = 'Что есть в магазине какие товары в наличии';
      const inStockProduct = {
        id: 'product-1',
        name: 'Milk',
        sku: 'MILK-001',
        price: 120,
        quantity: 8,
        description: 'Fresh milk',
        barcode: null,
        category: { name: 'Dairy' },
      };

      vectorStoreService.similaritySearch.mockResolvedValue([]);
      llmService.generateText.mockResolvedValue('Milk available');
      productService.findAll
        .mockResolvedValueOnce({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: [inStockProduct as any, { ...inStockProduct, id: 'product-2', quantity: 0 }],
          pagination: { total: 2, page: 1, limit: 50, totalPages: 1 },
        });

      const result = await service.query(mockQuery, mockTenantContext);

      expect(productService.findAll).toHaveBeenNthCalledWith(
        1,
        { page: 1, limit: 50, search: mockQuery },
        mockTenantContext,
      );
      expect(productService.findAll).toHaveBeenNthCalledWith(2, { page: 1, limit: 50 }, mockTenantContext);
      expect(result.sources).toEqual([
        {
          pageContent:
            'Product: Milk\nSKU: MILK-001\nPrice: 120\nQuantity: 8\nCategory: Dairy\nStock status: in stock\nDescription: Fresh milk',
          metadata: { source: 'postgresql', productId: 'product-1', type: 'product' },
        },
      ]);
      expect(llmService.generateText).toHaveBeenCalledWith(expect.stringContaining('## Catalog summary:'));
      expect(llmService.generateText).toHaveBeenCalledWith(expect.stringContaining('In-stock products: 1'));
      expect(llmService.generateText).toHaveBeenCalledWith(expect.stringContaining('Categories: Dairy (1)'));
      expect(llmService.generateText).toHaveBeenCalledWith(expect.stringContaining('Price range: 120-120'));
      expect(llmService.generateText).toHaveBeenCalledWith(expect.stringContaining('Product: Milk'));
      expect(llmService.generateText).toHaveBeenCalledWith(expect.not.stringContaining('Quantity: 0'));
    });

    it('should detect english availability phrasing and use in-stock fallback', async () => {
      const mockQuery = 'What items are available in shop right now?';
      const inStockProduct = {
        id: 'product-1',
        name: 'Bread',
        sku: 'BREAD-001',
        price: 90,
        quantity: 4,
        description: null,
        barcode: null,
        category: null,
      };

      vectorStoreService.similaritySearch.mockResolvedValue([]);
      llmService.generateText.mockResolvedValue('Bread available');
      productService.findAll
        .mockResolvedValueOnce({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: [inStockProduct as any],
          pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
        });

      const result = await service.query(mockQuery, mockTenantContext);

      expect(productService.findAll).toHaveBeenNthCalledWith(2, { page: 1, limit: 50 }, mockTenantContext);
      expect(result.sources[0]).toEqual({
        pageContent: 'Product: Bread\nSKU: BREAD-001\nPrice: 90\nQuantity: 4\nStock status: in stock',
        metadata: { source: 'postgresql', productId: 'product-1', type: 'product' },
      });
    });

    it('should handle typoed availability query and keep matching phone products only', async () => {
      const mockQuery = 'is there any phones avaliable';
      const phoneProduct = {
        id: 'product-1',
        name: 'iPhone 15',
        sku: 'IPHONE-15',
        price: 999,
        quantity: 5,
        description: 'Smartphone',
        barcode: null,
        category: { name: 'Phones' },
      };
      const nonPhoneProduct = {
        id: 'product-2',
        name: 'Gaming Laptop',
        sku: 'LAPTOP-01',
        price: 1999,
        quantity: 2,
        description: 'Laptop',
        barcode: null,
        category: { name: 'Computers' },
      };

      vectorStoreService.similaritySearch.mockResolvedValue([]);
      llmService.generateText.mockResolvedValue('iPhone 15 available');
      productService.findAll
        .mockResolvedValueOnce({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: [phoneProduct as any, nonPhoneProduct as any],
          pagination: { total: 2, page: 1, limit: 50, totalPages: 1 },
        });

      const result = await service.query(mockQuery, mockTenantContext);

      expect(productService.findAll).toHaveBeenNthCalledWith(2, { page: 1, limit: 50 }, mockTenantContext);
      expect(result.sources).toEqual([
        {
          pageContent:
            'Product: iPhone 15\nSKU: IPHONE-15\nPrice: 999\nQuantity: 5\nCategory: Phones\nStock status: in stock\nDescription: Smartphone',
          metadata: { source: 'postgresql', productId: 'product-1', type: 'product' },
        },
      ]);
      expect(llmService.generateText).toHaveBeenCalledWith(expect.stringContaining('Product: iPhone 15'));
      expect(llmService.generateText).toHaveBeenCalledWith(expect.not.stringContaining('Gaming Laptop'));
    });

    it('should ignore accessory-only search hits and fall back to matching phones', async () => {
      const mockQuery = 'is there any phones avaliable';
      const accessoryProduct = {
        id: 'product-1',
        name: 'Phone Case',
        sku: 'CASE-001',
        price: 39,
        quantity: 12,
        description: 'Case for phones',
        barcode: null,
        category: { name: 'Accessories' },
      };
      const phoneProduct = {
        id: 'product-2',
        name: 'iPhone 15',
        sku: 'IPHONE-15',
        price: 999,
        quantity: 5,
        description: 'Smartphone',
        barcode: null,
        category: { name: 'Phones' },
      };

      vectorStoreService.similaritySearch.mockResolvedValue([]);
      llmService.generateText.mockResolvedValue('iPhone 15 available');
      productService.findAll
        .mockResolvedValueOnce({
          success: true,
          data: [accessoryProduct as any],
          pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: [accessoryProduct as any, phoneProduct as any],
          pagination: { total: 2, page: 1, limit: 50, totalPages: 1 },
        });

      const result = await service.query(mockQuery, mockTenantContext);

      expect(productService.findAll).toHaveBeenNthCalledWith(
        1,
        { page: 1, limit: 50, search: mockQuery },
        mockTenantContext,
      );
      expect(productService.findAll).toHaveBeenNthCalledWith(2, { page: 1, limit: 50 }, mockTenantContext);
      expect(result.sources).toEqual([
        {
          pageContent:
            'Product: iPhone 15\nSKU: IPHONE-15\nPrice: 999\nQuantity: 5\nCategory: Phones\nStock status: in stock\nDescription: Smartphone',
          metadata: { source: 'postgresql', productId: 'product-2', type: 'product' },
        },
      ]);
      expect(llmService.generateText).toHaveBeenCalledWith(expect.stringContaining('Product: iPhone 15'));
      expect(llmService.generateText).toHaveBeenCalledWith(expect.not.stringContaining('Phone Case'));
    });

    it('should match smartphones and phone accessories for phone-related query', async () => {
      const mockQuery = 'is there any phones or phone-related things';
      const smartphoneProduct = {
        id: 'product-1',
        name: 'iPhone 15',
        sku: 'IPHONE-15',
        price: 999,
        quantity: 5,
        description: 'Smartphone',
        barcode: null,
        category: { name: 'Smartphones' },
      };
      const accessoryProduct = {
        id: 'product-2',
        name: 'Wireless Charger',
        sku: 'CHARGER-01',
        price: 49,
        quantity: 12,
        description: 'Phone accessory charger',
        barcode: null,
        category: { name: 'Accessories' },
      };
      const unrelatedProduct = {
        id: 'product-3',
        name: 'Gaming Mouse',
        sku: 'MOUSE-01',
        price: 79,
        quantity: 4,
        description: 'Mouse',
        barcode: null,
        category: { name: 'Peripherals' },
      };

      vectorStoreService.similaritySearch.mockResolvedValue([]);
      llmService.generateText.mockResolvedValue('iPhone 15 and charger available');
      productService.findAll
        .mockResolvedValueOnce({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: [smartphoneProduct as any, accessoryProduct as any, unrelatedProduct as any],
          pagination: { total: 3, page: 1, limit: 50, totalPages: 1 },
        });

      const result = await service.query(mockQuery, mockTenantContext);

      expect(result.sources).toEqual([
        {
          pageContent:
            'Product: Wireless Charger\nSKU: CHARGER-01\nPrice: 49\nQuantity: 12\nCategory: Accessories\nStock status: in stock\nDescription: Phone accessory charger',
          metadata: { source: 'postgresql', productId: 'product-2', type: 'product' },
        },
        {
          pageContent:
            'Product: iPhone 15\nSKU: IPHONE-15\nPrice: 999\nQuantity: 5\nCategory: Smartphones\nStock status: in stock\nDescription: Smartphone',
          metadata: { source: 'postgresql', productId: 'product-1', type: 'product' },
        },
      ]);
      expect(llmService.generateText).toHaveBeenCalledWith(expect.stringContaining('Product: Wireless Charger'));
      expect(llmService.generateText).toHaveBeenCalledWith(expect.stringContaining('Product: iPhone 15'));
      expect(llmService.generateText).toHaveBeenCalledWith(expect.not.stringContaining('Gaming Mouse'));
    });
  });

  describe('getAvailableProducts', () => {
    it('should return only in-stock products sorted by quantity desc', async () => {
      const highStock = { id: 'product-2', name: 'Rice', quantity: 12 };
      const lowStock = { id: 'product-1', name: 'Milk', quantity: 3 };

      productService.findAll.mockResolvedValue({
        success: true,
        data: [lowStock as any, { id: 'product-3', name: 'Sugar', quantity: 0 } as any, highStock as any],
        pagination: { total: 3, page: 1, limit: 100, totalPages: 1 },
      });

      const result = await service.getAvailableProducts(mockTenantContext);

      expect(productService.findAll).toHaveBeenCalledWith({ page: 1, limit: 100 }, mockTenantContext);
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

      vectorStoreService.similaritySearchWithScore.mockResolvedValue(mockDocsWithScores);
      vectorStoreService.similaritySearch.mockResolvedValue([mockDocument]);
      llmService.generateText.mockResolvedValue(mockAnswer);
      productService.findAll.mockResolvedValue({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      });

      const result = await service.queryWithScores(mockQuery, mockTenantContext);

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
