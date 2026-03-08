import { EmbeddingsService } from '@/modules/rag/embeddings/embeddings.service';
import { LLMService } from '@/modules/rag/llm/llm.service';
import { RagService } from '@/modules/rag/rag.service';
import { VectorStoreService } from '@/modules/rag/vector-store/vector-store.service';
import { Test, TestingModule } from '@nestjs/testing';

// Mock AppLogger globally for all tests
jest.mock('@/common/logger/app-logger.service', () => ({
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
  let llmService: jest.Mocked<LLMService>;
  let vectorStoreService: jest.Mocked<VectorStoreService>;

  beforeEach(async () => {
    const mockEmbeddingsService = {
      embedQuery: jest.fn(),
      embedDocuments: jest.fn(),
      getEmbeddings: jest.fn(),
    };

    const mockLLMService = {
      generateText: jest.fn(),
      generateWithMessages: jest.fn(),
      getLLM: jest.fn(),
    };

    const mockVectorStoreService = {
      addDocuments: jest.fn(),
      addTexts: jest.fn(),
      similaritySearch: jest.fn(),
      similaritySearchWithScore: jest.fn(),
      getVectorStore: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: EmbeddingsService,
          useValue: mockEmbeddingsService,
        },
        {
          provide: LLMService,
          useValue: mockLLMService,
        },
        {
          provide: VectorStoreService,
          useValue: mockVectorStoreService,
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

      const addDocumentsSpy = jest.spyOn(vectorStoreService, 'addDocuments').mockResolvedValue(mockIds);

      const result = await service.addDocuments(mockDocuments);

      expect(addDocumentsSpy).toHaveBeenCalledWith(mockDocuments);
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

      await expect(service.addDocuments(mockDocuments)).rejects.toThrow('Vector store error');
    });
  });

  describe('addTexts', () => {
    it('should add texts successfully', async () => {
      const mockTexts = ['Test text content'];
      const mockMetadatas = [{ source: 'test' }];
      const mockIds = ['text-1'];

      const addTextsSpy = jest.spyOn(vectorStoreService, 'addTexts').mockResolvedValue(mockIds);

      const result = await service.addTexts(mockTexts, mockMetadatas);

      expect(addTextsSpy).toHaveBeenCalledWith(mockTexts, mockMetadatas);
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

      const similaritySearchSpy = jest
        .spyOn(vectorStoreService, 'similaritySearch')
        .mockResolvedValue(mockRelevantDocs);
      const generateTextSpy = jest.spyOn(llmService, 'generateText').mockResolvedValue(mockAnswer);

      const result = await service.query(mockQuery);

      expect(similaritySearchSpy).toHaveBeenCalledWith(mockQuery, 5);
      expect(generateTextSpy).toHaveBeenCalled();
      expect(result).toEqual({
        answer: mockAnswer,
        sources: mockRelevantDocs,
      });
    });

    it('should handle empty results', async () => {
      const mockQuery = 'Non-existent topic';
      const mockEmptyAnswer = "I don't have enough information to answer this question based on the available context.";

      jest.spyOn(vectorStoreService, 'similaritySearch').mockResolvedValue([]);
      jest.spyOn(llmService, 'generateText').mockResolvedValue(mockEmptyAnswer);

      const result = await service.query(mockQuery);

      expect(result).toEqual({
        answer: mockEmptyAnswer,
        sources: [],
      });
      const generateTextSpy = jest.spyOn(llmService, 'generateText');
      expect(generateTextSpy).toHaveBeenCalled();
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

      const similaritySearchSpy = jest
        .spyOn(vectorStoreService, 'similaritySearch')
        .mockResolvedValue(mockRelevantDocs);
      jest.spyOn(llmService, 'generateText').mockResolvedValue('Test answer');

      await service.query(mockQuery, mockMaxResults);

      expect(similaritySearchSpy).toHaveBeenCalledWith(mockQuery, mockMaxResults);
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

      const result = await service.queryWithScores(mockQuery);

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
