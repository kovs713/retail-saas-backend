import { AuthGuard } from '@/common/guards';
import { createMockTenantContext } from '@/common/utils';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

import { createMock } from '@golevelup/ts-jest';
import { Document } from '@langchain/core/documents';
import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('RagController', () => {
  let controller: RagController;
  let ragService: ReturnType<typeof createMock<RagService>>;

  const tenantContext = createMockTenantContext();

  beforeEach(async () => {
    const mockRagService = {
      query: jest.fn(),
      queryWithScores: jest.fn(),
      addDocuments: jest.fn(),
      addTexts: jest.fn(),
      clearDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RagController],
      providers: [
        {
          provide: RagService,
          useValue: mockRagService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { organizationId: 'test-org-id' };
          return true;
        },
      })
      .compile();

    controller = module.get<RagController>(RagController);
    ragService = module.get(RagService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('chat endpoint', () => {
    it('should call RagService.query with correct parameters', async () => {
      const mockDocument = new Document({
        pageContent: 'Test source content',
        metadata: { source: 'test' },
      });

      const mockResponse = {
        answer: 'Test answer',
        sources: [mockDocument],
      };

      ragService.query.mockResolvedValue(mockResponse);

      const chatRequest = {
        message: 'Test message',
        maxResults: 5,
        systemPrompt: 'Test prompt',
      };

      const result = await controller.chat(chatRequest, tenantContext);

      expect(ragService.query).toHaveBeenCalledWith(
        chatRequest.message,
        tenantContext,
        chatRequest.maxResults,
        chatRequest.systemPrompt,
      );
      expect(result.success).toBe(true);
      expect(result.data?.answer).toBe(mockResponse.answer);
      expect(result.data?.sources).toHaveLength(1);
      expect(result.data?.sources[0].content).toBe(mockDocument.pageContent);
      expect(result.data?.sources[0].metadata).toEqual(mockDocument.metadata);
      expect(result.data?.timestamp).toBeDefined();
    });
  });

  describe('addDocuments endpoint', () => {
    it('should call RagService.addDocuments with correct parameters', async () => {
      const mockDocIds = ['doc-1', 'doc-2'];
      ragService.addDocuments.mockResolvedValue(mockDocIds);

      const addRequest = {
        documents: [
          { content: 'Document 1', metadata: { source: 'test' } },
          { content: 'Document 2', metadata: { source: 'test' } },
        ],
        source: 'api',
      };

      const result = await controller.addDocuments(addRequest, tenantContext);

      expect(ragService.addDocuments).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data?.documentIds).toEqual(mockDocIds);
      expect(result.data?.count).toBe(2);
      expect(result.data?.timestamp).toBeDefined();
    });
  });

  describe('chatWithScores endpoint', () => {
    it('should call RagService.queryWithScores with correct parameters', async () => {
      const mockDocument = new Document({
        pageContent: 'Test source content',
        metadata: { source: 'test' },
      });

      const mockResponse = {
        answer: 'Test answer with scores',
        sources: [
          {
            document: mockDocument,
            score: 0.95,
          },
        ],
      };

      ragService.queryWithScores.mockResolvedValue(mockResponse);

      const chatRequest = {
        message: 'Test message',
        maxResults: 5,
        systemPrompt: 'Test prompt',
      };

      const result = await controller.chatWithScores(chatRequest, tenantContext);

      expect(ragService.queryWithScores).toHaveBeenCalledWith(
        chatRequest.message,
        tenantContext,
        chatRequest.maxResults,
        chatRequest.systemPrompt,
      );
      expect(result.success).toBe(true);
      expect(result.data?.answer).toBe(mockResponse.answer);
      expect(result.data?.sources).toHaveLength(1);
      expect(result.data?.sources[0].score).toBe(0.95);
      expect(result.data?.timestamp).toBeDefined();
    });

    it('should handle service errors', async () => {
      ragService.queryWithScores.mockRejectedValue(new Error('Service error'));

      const chatRequest = {
        message: 'Test message',
        maxResults: 5,
      };

      await expect(controller.chatWithScores(chatRequest, tenantContext)).rejects.toThrow('Service error');
    });
  });

  describe('addTexts endpoint', () => {
    it('should call RagService.addTexts with correct parameters', async () => {
      const mockTextIds = ['text-1', 'text-2'];
      ragService.addTexts.mockResolvedValue(mockTextIds);

      const addRequest = {
        texts: ['Text 1', 'Text 2'],
        metadata: [{ source: 'test' }],
      };

      const result = await controller.addTexts(addRequest, tenantContext);

      expect(ragService.addTexts).toHaveBeenCalledWith(addRequest.texts, tenantContext, addRequest.metadata);
      expect(result.success).toBe(true);
      expect(result.data?.textIds).toEqual(mockTextIds);
      expect(result.data?.count).toBe(2);
      expect(result.data?.timestamp).toBeDefined();
    });

    it('should handle empty texts array', async () => {
      const mockTextIds: string[] = [];
      ragService.addTexts.mockResolvedValue(mockTextIds);

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
      jest.spyOn(ragService, 'clearDocuments').mockImplementation(() => {
        throw new Error('Clear failed');
      });

      expect(() => controller.clearDocuments()).toThrow('Clear failed');
    });
  });
});
