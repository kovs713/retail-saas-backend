import { createMockTenantContext } from '@/common/test-utils';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { LLMService } from './llm/llm.service';
import { RagService } from './rag.service';
import { VectorStoreService } from './vector-store/vector-store.service';

import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('@/core/logger/app-logger.service', () => ({
  AppLogger: jest.fn().mockImplementation((context?: string) => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    context: context || 'AppLogger',
  })),
}));

describe('RagService', () => {
  let service: RagService;
  let llmService: ReturnType<typeof createMock<LLMService>>;
  let vectorStoreService: ReturnType<typeof createMock<VectorStoreService>>;

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
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    llmService = module.get(LLMService);
    vectorStoreService = module.get(VectorStoreService);
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

      expect(vectorStoreService.addDocuments).toHaveBeenCalledWith(mockDocuments, mockTenantContext);
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

  describe('addTexts', () => {
    it('should add texts successfully', async () => {
      const mockTexts = ['Test text content'];
      const mockMetadatas = [{ source: 'test' }];
      const mockIds = ['text-1'];

      vectorStoreService.addTexts.mockResolvedValue(mockIds);

      const result = await service.addTexts(mockTexts, mockTenantContext, mockMetadatas);

      expect(vectorStoreService.addTexts).toHaveBeenCalledWith(mockTexts, mockTenantContext, mockMetadatas);
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

      const result = await service.query(mockQuery, mockTenantContext);

      expect(vectorStoreService.similaritySearch).toHaveBeenCalledWith(mockQuery, mockTenantContext, 5);
      expect(llmService.generateText).toHaveBeenCalled();
      expect(result).toEqual({
        answer: mockAnswer,
        sources: mockRelevantDocs,
      });
    });

    it('should handle empty results', async () => {
      const mockQuery = 'Non-existent topic';
      const mockEmptyAnswer = "I don't have enough information to answer this question based on the available context.";

      vectorStoreService.similaritySearch.mockResolvedValue([]);
      llmService.generateText.mockResolvedValue(mockEmptyAnswer);

      const result = await service.query(mockQuery, mockTenantContext);

      expect(result).toEqual({
        answer: mockEmptyAnswer,
        sources: [],
      });
      expect(llmService.generateText).toHaveBeenCalled();
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

      await service.query(mockQuery, mockTenantContext, mockMaxResults);

      expect(vectorStoreService.similaritySearch).toHaveBeenCalledWith(mockQuery, mockTenantContext, mockMaxResults);
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
      llmService.generateText.mockResolvedValue(mockAnswer);

      const result = await service.queryWithScores(mockQuery, mockTenantContext);

      expect(result).toEqual({
        answer: mockAnswer,
        sources: [
          {
            document: mockDocument,
            score: 0.95,
          },
        ],
      });
    });
  });
});
