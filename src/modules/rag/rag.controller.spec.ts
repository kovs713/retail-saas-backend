import { AuthGuard } from '@/common/guards';
import { createMockTenantContext, mockAuthGuard } from '@/common/utils';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('RagController', () => {
  let controller: RagController;
  let service: DeepMocked<RagService>;

  const tenantContext = createMockTenantContext();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RagService,
          useValue: createMock<RagService>(),
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

      const result = await controller.getDocuments({ page: 1, limit: 10 }, tenantContext);

      expect(service.getDocuments).toHaveBeenCalledWith(tenantContext, 1, 10);
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

      expect(service.getDocuments).toHaveBeenCalledWith(tenantContext, 1, 10);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
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

  describe('addTexts endpoint', () => {
    it('should call RagService.addTexts with correct parameters', async () => {
      const mockTextIds = ['text-1', 'text-2'];
      service.addTexts.mockResolvedValue(mockTextIds);

      const addRequest = {
        texts: ['Text 1', 'Text 2'],
        metadata: [{ source: 'test' }],
      };

      const result = await controller.addTexts(addRequest, tenantContext);

      expect(service.addTexts).toHaveBeenCalledWith(addRequest.texts, tenantContext, addRequest.metadata);
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
    it('should call RagService.clearDocuments', () => {
      const result = controller.clearDocuments();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Documents cleared successfully');
    });

    it('should handle service errors', () => {
      jest.spyOn(service, 'clearDocuments').mockImplementation(() => {
        throw new Error('Clear failed');
      });

      expect(() => controller.clearDocuments()).toThrow('Clear failed');
    });
  });
});
