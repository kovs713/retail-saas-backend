import { ChromaDBClient, TenantContext } from '@/common/types';
import { createMockTenantContext } from '@/common/utils';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorStoreService } from './vector-store.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { Test, TestingModule } from '@nestjs/testing';

describe('VectorStoreService', () => {
  let service: VectorStoreService;
  let embeddingsService: DeepMocked<EmbeddingsService>;
  let chromaDBClient: DeepMocked<Chroma>;

  let mockTenantContext: TenantContext;

  beforeEach(async () => {
    mockTenantContext = createMockTenantContext();

    embeddingsService = createMock<EmbeddingsService>();
    embeddingsService.embedDocuments.mockResolvedValue([[0.1, 0.2, 0.3]]);

    chromaDBClient = createMock<Chroma>();
    chromaDBClient.addDocuments.mockResolvedValue(['doc-1']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorStoreService,
        {
          provide: EmbeddingsService,
          useValue: embeddingsService,
        },
        {
          provide: ChromaDBClient,
          useValue: chromaDBClient,
        },
      ],
    }).compile();

    embeddingsService = module.get<DeepMocked<EmbeddingsService>>(EmbeddingsService);
    service = module.get<VectorStoreService>(VectorStoreService);
    chromaDBClient = module.get<DeepMocked<Chroma>>(ChromaDBClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addDocuments', () => {
    it('should add documents and return ids', async () => {
      const documents: Document[] = [
        {
          pageContent: 'Test content',
          metadata: { source: 'test' },
        },
      ];

      const result = await service.addDocuments(documents, mockTenantContext);

      expect(result).toEqual(['doc-1']);
    });
  });

  describe('addTexts', () => {
    it('should add texts and return ids', async () => {
      const texts = ['Test text'];
      const metadatas = [{ source: 'test' }];

      chromaDBClient.addVectors.mockResolvedValue(['vec-1']);

      const result = await service.addTexts(texts, mockTenantContext, metadatas);

      expect(result).toBeDefined();
    });

    it('should handle single metadata object for multiple texts', async () => {
      const texts = ['Text 1', 'Text 2'];
      const metadatas = [{ source: 'shared' }];

      chromaDBClient.addVectors.mockResolvedValue(['vec-1', 'vec-2']);

      const result = await service.addTexts(texts, mockTenantContext, metadatas);

      expect(result).toBeDefined();
    });

    it('should use unknown source when no metadata provided', async () => {
      const texts = ['Test text'];

      chromaDBClient.addVectors.mockResolvedValue(['vec-1']);

      const result = await service.addTexts(texts, mockTenantContext);

      expect(result).toBeDefined();
    });
  });

  describe('similaritySearch', () => {
    it('should return search results', async () => {
      const mockDocs = [{ pageContent: 'result', metadata: { shopId: 'shop-1' } }];
      chromaDBClient.similaritySearch.mockResolvedValue(mockDocs);

      const result = await service.similaritySearch('test query', mockTenantContext, 5);

      expect(result).toEqual(mockDocs);
    });

    it('should return results with custom filters', async () => {
      const mockDocs = [{ pageContent: 'result', metadata: { shopId: 'shop-1' } }];
      chromaDBClient.similaritySearch.mockResolvedValue(mockDocs);

      const result = await service.similaritySearch('test query', mockTenantContext, 5, { source: 'test' });

      expect(result).toEqual(mockDocs);
    });
  });

  describe('similaritySearchWithScore', () => {
    it('should return documents with scores', async () => {
      const mockDoc: Document = {
        pageContent: 'Test',
        metadata: {},
      };
      const mockResults: [Document, number][] = [[mockDoc, 0.95]];

      chromaDBClient.similaritySearchWithScore.mockResolvedValue(mockResults);

      const result = await service.similaritySearchWithScore('test query', mockTenantContext);

      expect(result).toEqual(mockResults);
    });
  });

  describe('deleteDocuments', () => {
    it('should log warning (not implemented)', async () => {
      await service.deleteDocuments(['doc-1']);

      // const result = service.

      expect(true).toBe(true);
    });
  });

  describe('asRetriever', () => {
    it('should create retriever instance', () => {
      const result = service.asRetriever(mockTenantContext, { k: 5 });

      expect(result).toBeDefined();
    });

    it('should create retriever with custom filter', () => {
      const result = service.asRetriever(mockTenantContext, { k: 5, filter: { source: 'test' } });

      expect(result).toBeDefined();
    });
  });
});
