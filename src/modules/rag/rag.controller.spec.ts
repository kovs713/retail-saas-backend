import { AuthGuard } from '@/core/auth/guards/auth.guard';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { createMockTenantContext } from '@/common/test-utils';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import { Document } from '@langchain/core/documents';
import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';

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
});
