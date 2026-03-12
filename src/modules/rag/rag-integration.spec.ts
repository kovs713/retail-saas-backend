import { EmbeddingsService } from './embeddings/embeddings.service';
import { LLMService } from './llm/llm.service';
import { RagService } from './rag.service';
import { VectorStoreService } from './vector-store/vector-store.service';

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

describe('RAG Integration Test', () => {
  const mockTenantContext = { organizationId: 'test-org-id' };
  it('should run complete RAG workflow', async () => {
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

    const ragService = module.get<RagService>(RagService);

    // Test 1: Add sample documents
    const sampleDocs = [
      {
        pageContent:
          'NestJS is a progressive Node.js framework for building efficient and scalable server-side applications.',
        metadata: { source: 'nestjs-docs', topic: 'framework' },
      },
      {
        pageContent: 'LangChain is a framework for developing applications powered by language models.',
        metadata: { source: 'langchain-docs', topic: 'ai' },
      },
      {
        pageContent: 'ChromaDB is an open-source vector database designed for AI applications.',
        metadata: { source: 'chromadb-docs', topic: 'database' },
      },
    ];

    // Mock the vector store response
    mockVectorStoreService.addDocuments.mockResolvedValue(['doc1', 'doc2', 'doc3']);

    await ragService.addDocuments(sampleDocs, mockTenantContext);

    // Test 2: Query the system
    // Mock similarity search and LLM responses
    mockVectorStoreService.similaritySearch.mockResolvedValue([
      { pageContent: 'NestJS is a framework', metadata: { source: 'docs' } },
      { pageContent: 'It uses TypeScript', metadata: { source: 'docs' } },
    ]);
    mockLLMService.generateText.mockResolvedValue(
      'NestJS is a progressive Node.js framework for building efficient and scalable server-side applications using TypeScript.',
    );

    await ragService.query('What is NestJS?', mockTenantContext);

    // Test 3: Query with scores
    mockVectorStoreService.similaritySearchWithScore.mockResolvedValue([
      [{ pageContent: 'NestJS content', metadata: { source: 'docs' } }, 0.95],
      [{ pageContent: 'Framework info', metadata: { source: 'docs' } }, 0.87],
    ]);

    await ragService.queryWithScores('What is NestJS?', mockTenantContext);
  });
});
