import { AuthGuard } from '@/common/guards';
import { createMockTenantContext, mockAuthGuard } from '@/common/utils';
import { DocPreprocessorService } from '@/modules/doc-preprocessor/doc-preprocessor.service';
import { ProductDto } from '@/modules/product/dto/product.dto';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

describe('RagController', () => {
  let controller: RagController;
  let service: DeepMocked<RagService>;
  let docPreprocessorService: DeepMocked<DocPreprocessorService>;

  const tenantContext = createMockTenantContext();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RagService,
          useValue: createMock<RagService>(),
        },
        {
          provide: DocPreprocessorService,
          useValue: createMock<DocPreprocessorService>(),
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('5') },
        },
      ],
      controllers: [RagController],
    })
      .overrideGuard(AuthGuard)
      .useValue(
        mockAuthGuard({
          sub: 'user-123',
          email: 'test@example.com',
          shopId: 'shop-456',
          role: 'owner',
        }),
      )
      .compile();

    controller = module.get<RagController>(RagController);
    service = module.get(RagService);
    docPreprocessorService = module.get(DocPreprocessorService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDocuments endpoint', () => {
    it('should return paginated documents', async () => {
      const mockResult = {
        success: true,
        data: [
          {
            pageContent: 'Document 1',
            metadata: { source: 'test', _id: 'doc-1' },
          },
          {
            pageContent: 'Document 2',
            metadata: { source: 'test', _id: 'doc-2' },
          },
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      service.getDocuments.mockResolvedValue(mockResult);

      const result = await controller.getDocuments(
        { page: 1, limit: 10 },
        tenantContext,
      );

      expect(service.getDocuments).toHaveBeenCalledWith(
        tenantContext.shopId,
        1,
        10,
      );
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].pageContent).toBe('Document 1');
      expect(result.data?.[1].pageContent).toBe('Document 2');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('should use default pagination when not provided', async () => {
      const mockResult = {
        success: true,
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      service.getDocuments.mockResolvedValue(mockResult);

      const result = await controller.getDocuments({}, tenantContext);

      expect(service.getDocuments).toHaveBeenCalledWith(
        tenantContext.shopId,
        1,
        10,
      );
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe('getAvailableProducts endpoint', () => {
    it('should return in-stock products for tenant shop', async () => {
      const products = [
        {
          id: 'product-1',
          sku: 'MILK-001',
          name: 'Milk',
          description: 'Fresh milk',
          price: 120,
          cost: null,
          quantity: 8,
          category: 'Dairy',
          barcode: null,
          images: null,
          metadata: null,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ];
      service.getAvailableProducts.mockResolvedValue(products as any);

      const result = await controller.getAvailableProducts(tenantContext);

      expect(service.getAvailableProducts).toHaveBeenCalledWith(
        tenantContext.shopId,
      );
      expect(result).toEqual({
        success: true,
        data: ProductDto.fromEntities(products as any),
      });
    });
  });

  describe('addDocuments endpoint', () => {
    it('should call RagService.addDocuments with correct parameters', async () => {
      const mockDocIds = ['doc-1', 'doc-2'];
      service.addDocuments.mockResolvedValue(mockDocIds);

      const addRequest = {
        documents: [
          { content: 'Document 1', metadata: { source: 'test' } },
          { content: 'Document 2', metadata: { source: 'test' } },
        ],
        source: 'api',
      };

      const result = await controller.addDocuments(addRequest, tenantContext);

      expect(service.addDocuments).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data?.documentIds).toEqual(mockDocIds);
      expect(result.data?.count).toBe(2);
      expect(result.data?.timestamp).toBeDefined();
    });
  });

  describe('uploadDocument endpoint', () => {
    it('should preprocess uploaded file and ingest into RAG', async () => {
      docPreprocessorService.preprocess.mockResolvedValue({
        buffer: Buffer.from(
          JSON.stringify({
            text: 'Normalized text',
          }),
        ),
        contentType: 'application/json',
        contentDisposition: 'attachment; filename="sample.json"',
      });
      service.addDocuments.mockResolvedValue(['doc-1']);

      const file = {
        originalname: 'sample.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('raw'),
      } as Express.Multer.File;

      const result = await controller.uploadDocument(
        file,
        { removeNoise: true },
        tenantContext,
      );

      expect(docPreprocessorService.preprocess).toHaveBeenCalledWith(
        file,
        expect.objectContaining({ removeNoise: true }),
      );
      expect(service.addDocuments).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            pageContent: 'Normalized text',
            metadata: expect.objectContaining({
              filename: 'sample.pdf',
              source: 'upload',
              origin: 'doc-preprocessor',
            }),
          }),
        ],
        tenantContext.shopId,
      );
      expect(result.success).toBe(true);
      expect(result.data?.documentIds).toEqual(['doc-1']);
    });

    it('should reject unsupported file type', async () => {
      const file = {
        originalname: 'malware.exe',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('raw'),
      } as Express.Multer.File;

      await expect(
        controller.uploadDocument(file, {}, tenantContext),
      ).rejects.toThrow('Unsupported file type');
    });
  });

  describe('addTexts endpoint', () => {
    it('should call RagService.addTexts with correct parameters', async () => {
      const mockTextIds = ['text-1', 'text-2'];
      service.addTexts.mockResolvedValue(mockTextIds);

      const addRequest = {
        texts: ['Text 1', 'Text 2'],
        metadata: [{ source: 'test' }],
      };

      const result = await controller.addTexts(addRequest, tenantContext);

      expect(service.addTexts).toHaveBeenCalledWith(
        addRequest.texts,
        tenantContext.shopId,
        addRequest.metadata,
      );
      expect(result.success).toBe(true);
      expect(result.data?.textIds).toEqual(mockTextIds);
      expect(result.data?.count).toBe(2);
      expect(result.data?.timestamp).toBeDefined();
    });

    it('should handle empty texts array', async () => {
      const mockTextIds: string[] = [];
      service.addTexts.mockResolvedValue(mockTextIds);

      const addRequest = {
        texts: [],
        metadata: [],
      };

      const result = await controller.addTexts(addRequest, tenantContext);

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(0);
      expect(result.data?.timestamp).toBeDefined();
    });
  });

  describe('clearDocuments endpoint', () => {
    it('should call RagService.clearDocuments', async () => {
      const result = await controller.clearDocuments(tenantContext);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Documents cleared successfully');
    });

    it('should handle service errors', async () => {
      jest.spyOn(service, 'clearDocuments').mockImplementation(() => {
        throw new Error('Clear failed');
      });

      await expect(controller.clearDocuments(tenantContext)).rejects.toThrow(
        'Clear failed',
      );
    });
  });
});
