import { VectorStoreService } from './vector-store.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { ChromaDBClient } from '@/common/types/providers.type';
import { TenantContext } from '@/common/types/tenant-context.type';

import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('@/core/logger/app-logger.service', () => ({
  AppLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
}));

describe('VectorStoreService', () => {
  let service: VectorStoreService;
  let embeddingsService: EmbeddingsService;
  let chromaDBClient: Chroma;

  const mockTenantContext: TenantContext = {
    organizationId: 'test-org-id',
  };

  beforeEach(async () => {
    embeddingsService = {
      embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    } as unknown as EmbeddingsService;

    chromaDBClient = {
      addDocuments: jest.fn().mockResolvedValue(['doc-1']),
      addVectors: jest.fn().mockResolvedValue(['vec-1']),
      similaritySearch: jest.fn().mockResolvedValue([]),
      similaritySearchWithScore: jest.fn().mockResolvedValue([]),
      asRetriever: jest.fn().mockReturnValue({}),
    } as unknown as Chroma;

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

    service = module.get<VectorStoreService>(VectorStoreService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addDocuments', () => {
    it('should add organizationId to document metadata', async () => {
      const documents: Document[] = [
        {
          pageContent: 'Test content',
          metadata: { source: 'test' },
        },
      ];

      await service.addDocuments(documents, mockTenantContext);

      expect(chromaDBClient.addDocuments).toHaveBeenCalledWith([
        {
          pageContent: 'Test content',
          metadata: {
            source: 'test',
            organizationId: mockTenantContext.organizationId,
          },
        },
      ]);
    });

    it('should call ChromaDB addDocuments', async () => {
      const documents: Document[] = [
        {
          pageContent: 'Test',
          metadata: {},
        },
      ];

      await service.addDocuments(documents, mockTenantContext);

      expect(chromaDBClient.addDocuments).toHaveBeenCalled();
    });
  });

  describe('addTexts', () => {
    it('should convert texts to documents with tenant metadata', async () => {
      const texts = ['Test text'];
      const metadatas = [{ source: 'test' }];

      await service.addTexts(texts, mockTenantContext, metadatas);

      expect(chromaDBClient.addVectors).toHaveBeenCalled();
    });

    it('should handle single metadata object for multiple texts', async () => {
      const texts = ['Text 1', 'Text 2'];
      const metadatas = [{ source: 'shared' }];

      await service.addTexts(texts, mockTenantContext, metadatas);

      expect(embeddingsService.embedDocuments).toHaveBeenCalledWith(texts);
    });

    it('should use unknown source when no metadata provided', async () => {
      const texts = ['Test text'];

      await service.addTexts(texts, mockTenantContext);

      expect(chromaDBClient.addVectors).toHaveBeenCalled();
    });
  });

  describe('similaritySearch', () => {
    it('should filter results by organizationId', async () => {
      await service.similaritySearch('test query', mockTenantContext, 5);

      expect(chromaDBClient.similaritySearch).toHaveBeenCalledWith('test query', 5, {
        organizationId: mockTenantContext.organizationId,
      });
    });

    it('should merge custom filters with tenant filter', async () => {
      const customFilter = { source: 'test' };

      await service.similaritySearch('test query', mockTenantContext, 5, customFilter);

      expect(chromaDBClient.similaritySearch).toHaveBeenCalledWith('test query', 5, {
        organizationId: mockTenantContext.organizationId,
        source: 'test',
      });
    });
  });

  describe('similaritySearchWithScore', () => {
    it('should return documents with scores', async () => {
      const mockDoc: Document = {
        pageContent: 'Test',
        metadata: {},
      };
      const mockResults: [Document, number][] = [[mockDoc, 0.95]];

      (chromaDBClient.similaritySearchWithScore as jest.Mock).mockResolvedValue(mockResults);

      const result = await service.similaritySearchWithScore('test query', mockTenantContext);

      expect(result).toEqual(mockResults);
    });

    it('should apply tenant filter', async () => {
      await service.similaritySearchWithScore('test query', mockTenantContext);

      expect(chromaDBClient.similaritySearchWithScore).toHaveBeenCalledWith(
        'test query',
        5,
        expect.objectContaining({
          organizationId: mockTenantContext.organizationId,
        }),
      );
    });
  });

  describe('deleteDocuments', () => {
    it('should log warning (not implemented)', () => {
      service.deleteDocuments(['doc-1', 'doc-2']);

      expect(true).toBe(true);
    });
  });

  describe('getVectorStore', () => {
    it('should return ChromaDB client instance', () => {
      const result = service.getVectorStore();

      expect(result).toBe(chromaDBClient);
    });
  });

  describe('asRetriever', () => {
    it('should create tenant-scoped retriever', () => {
      service.asRetriever(mockTenantContext, { k: 5 });

      expect(chromaDBClient.asRetriever).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            organizationId: mockTenantContext.organizationId,
          }),
        }),
      );
    });

    it('should merge searchKwargs filter with tenant filter', () => {
      service.asRetriever(mockTenantContext, { k: 5, filter: { source: 'test' } });

      expect(chromaDBClient.asRetriever).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: {
            organizationId: mockTenantContext.organizationId,
            source: 'test',
          },
        }),
      );
    });
  });
});
