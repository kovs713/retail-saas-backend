import { RagController } from '@/api/rag/rag.controller';
import { RagService } from '@/modules/rag/rag.service';
import { Document } from '@langchain/core/documents';
import { Test, TestingModule } from '@nestjs/testing';

describe('RagController', () => {
  let controller: RagController;
  let ragService: jest.Mocked<RagService>;

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
    }).compile();

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

      const querySpy = jest.spyOn(ragService, 'query').mockResolvedValue(mockResponse);

      const chatRequest = {
        message: 'Test message',
        maxResults: 5,
        systemPrompt: 'Test prompt',
      };

      const result = await controller.chat(chatRequest);

      expect(querySpy).toHaveBeenCalledWith(chatRequest.message, chatRequest.maxResults, chatRequest.systemPrompt);
      expect(result).toEqual({
        answer: mockResponse.answer,
        sources: [
          {
            content: mockDocument.pageContent,
            metadata: mockDocument.metadata,
          },
        ],
        timestamp: expect.any(String) as unknown,
      });
    });
  });

  describe('addDocuments endpoint', () => {
    it('should call RagService.addDocuments with correct parameters', async () => {
      const mockDocIds = ['doc-1', 'doc-2'];
      const addDocumentsSpy = jest.spyOn(ragService, 'addDocuments').mockResolvedValue(mockDocIds);

      const addRequest = {
        documents: [
          { content: 'Document 1', metadata: { source: 'test' } },
          { content: 'Document 2', metadata: { source: 'test' } },
        ],
        source: 'api',
      };

      const result = await controller.addDocuments(addRequest);

      expect(addDocumentsSpy).toHaveBeenCalled();
      expect(result.documentIds).toEqual(mockDocIds);
      expect(result.count).toBe(2);
      expect(result.timestamp).toBeDefined();
    });
  });
});
