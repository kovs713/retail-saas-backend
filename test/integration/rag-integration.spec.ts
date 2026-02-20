import { EmbeddingsService } from '@/modules/rag/embeddings/embeddings.service';
import { LLMService } from '@/modules/rag/llm/llm.service';
import { RagService } from '@/modules/rag/rag.service';
import { VectorStoreService } from '@/modules/rag/vector-store/vector-store.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

// Jest test
describe('RAG Integration Test', () => {
  it('should run complete RAG workflow', async () => {
    // Create mock services
    const mockLLMService = {
      generateText: jest.fn(),
    };

    const mockVectorStoreService = {
      addDocuments: jest.fn(),
      similaritySearch: jest.fn(),
      similaritySearchWithScore: jest.fn(),
    };

    const mockEmbeddingsService = {
      embedQuery: jest.fn(),
      embedDocuments: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string): string | undefined => {
        const config: Record<string, string> = {
          GROQ_API_KEY: 'mock-api-key',
          VECTOR_COLLECTION_NAME: 'test-collection',
        };
        return config[key];
      }),
    };

    let ragService: RagService;
    try {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RagService,
          {
            provide: LLMService,
            useValue: mockLLMService,
          },
          {
            provide: VectorStoreService,
            useValue: mockVectorStoreService,
          },
          {
            provide: EmbeddingsService,
            useValue: mockEmbeddingsService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      ragService = module.get<RagService>(RagService);

      // Test 1: Add sample documents
      console.log('Test 1: Adding sample documents...');
      const sampleDocs = [
        {
          pageContent:
            'NestJS is a progressive Node.js framework for building efficient and scalable server-side applications.',
          metadata: { source: 'nestjs-docs', topic: 'framework' },
        },
        {
          pageContent:
            'LangChain is a framework for developing applications powered by language models.',
          metadata: { source: 'langchain-docs', topic: 'ai' },
        },
        {
          pageContent:
            'ChromaDB is an open-source vector database designed for AI applications.',
          metadata: { source: 'chromadb-docs', topic: 'database' },
        },
      ];

      // Mock the vector store response
      mockVectorStoreService.addDocuments.mockResolvedValue([
        'doc1',
        'doc2',
        'doc3',
      ]);

      const ids = await ragService.addDocuments(sampleDocs);
      console.log(`Added ${ids.length} documents with IDs: ${ids.join(', ')}`);

      // Test 2: Query the system
      console.log('\nTest 2: Testing queries...');

      // Mock similarity search and LLM responses
      mockVectorStoreService.similaritySearch.mockResolvedValue([
        { pageContent: 'NestJS is a framework', metadata: { source: 'docs' } },
        { pageContent: 'It uses TypeScript', metadata: { source: 'docs' } },
      ]);
      mockLLMService.generateText.mockResolvedValue(
        'NestJS is a progressive Node.js framework for building efficient and scalable server-side applications using TypeScript.',
      );

      const result = await ragService.query('What is NestJS?');
      console.log(`Answer: ${result.answer.substring(0, 100)}...`);
      console.log(`Sources: ${result.sources.length}`);

      // Test 3: Query with scores
      console.log('\nTest 3: Testing query with scores...');

      mockVectorStoreService.similaritySearchWithScore.mockResolvedValue([
        [{ pageContent: 'NestJS content', metadata: { source: 'docs' } }, 0.95],
        [{ pageContent: 'Framework info', metadata: { source: 'docs' } }, 0.87],
      ]);

      const scoredResult = await ragService.queryWithScores('What is NestJS?');
      console.log(`Answer: ${scoredResult.answer.substring(0, 100)}...`);
      console.log(`Sources with scores: ${scoredResult.sources.length}`);

      console.log('\nAll RAG integration tests passed!');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Test failed:', errorMessage);
      throw error;
    }
  });
});
