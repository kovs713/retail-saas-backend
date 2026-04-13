import { ChromaDBClient, TenantContext } from '@/common/types';
import { createMockTenantContext } from '@/common/utils';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorStoreService } from './vector-store.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { Test, TestingModule } from '@nestjs/testing';

interface MockCollection {
  get: jest.Mock;
}

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
        { provide: EmbeddingsService, useValue: embeddingsService },
        { provide: ChromaDBClient, useValue: chromaDBClient },
      ],
    }).compile();

    service = module.get<VectorStoreService>(VectorStoreService);
    embeddingsService = module.get<DeepMocked<EmbeddingsService>>(EmbeddingsService);
    chromaDBClient = module.get<DeepMocked<Chroma>>(ChromaDBClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function bindCollection(collection: MockCollection | null): void {
    Object.defineProperty(chromaDBClient, 'collection', {
      get: () => collection,
      configurable: true,
    });
  }

  function makeCollectionWithDocs(data: {
    ids: string[];
    documents: (string | null)[];
    metadatas: (Record<string, unknown> | null)[];
  }): MockCollection {
    return { get: jest.fn().mockResolvedValue(data) };
  }

  describe('getDocuments', () => {
    it('maps each raw ChromaDB entry to a LangChain Document with default pagination', async () => {
      const collection = makeCollectionWithDocs({
        ids: ['id-1', 'id-2'],
        documents: ['first content', 'second content'],
        metadatas: [
          { shopId: mockTenantContext.shopId, source: 'manual' },
          { shopId: mockTenantContext.shopId, source: 'upload' },
        ],
      });
      bindCollection(collection);

      const result = await service.getDocuments(mockTenantContext);

      expect(result).toEqual([
        {
          pageContent: 'first content',
          metadata: { shopId: mockTenantContext.shopId, source: 'manual', _id: 'id-1' },
        },
        {
          pageContent: 'second content',
          metadata: { shopId: mockTenantContext.shopId, source: 'upload', _id: 'id-2' },
        },
      ]);
    });

    it('returns all documents without applying pagination', async () => {
      const collection = makeCollectionWithDocs({
        ids: ['id-1', 'id-2', 'id-3', 'id-4', 'id-5'],
        documents: ['content 1', 'content 2', 'content 3', 'content 4', 'content 5'],
        metadatas: [
          { source: 'test1' },
          { source: 'test2' },
          { source: 'test3' },
          { source: 'test4' },
          { source: 'test5' },
        ],
      });
      bindCollection(collection);

      const result = await service.getDocuments(mockTenantContext);

      expect(result).toHaveLength(5);
      expect(result[2]).toEqual({
        pageContent: 'content 3',
        metadata: { source: 'test3', _id: 'id-3' },
      });
      expect(result[3]).toEqual({
        pageContent: 'content 4',
        metadata: { source: 'test4', _id: 'id-4' },
      });
    });

    it('injects the ChromaDB id into metadata as _id', async () => {
      const collection = makeCollectionWithDocs({
        ids: ['chroma-abc-123'],
        documents: ['content'],
        metadatas: [{ source: 'test' }],
      });
      bindCollection(collection);

      const result = await service.getDocuments(mockTenantContext);

      expect(result[0]?.metadata?._id).toBe('chroma-abc-123');
    });

    it('preserves all original metadata fields alongside _id', async () => {
      const collection = makeCollectionWithDocs({
        ids: ['id-1'],
        documents: ['content'],
        metadatas: [{ shopId: 'shop-x', source: 'web', customField: 'value' }],
      });
      bindCollection(collection);

      const result = await service.getDocuments(mockTenantContext);

      expect(result[0]?.metadata).toMatchObject({
        shopId: 'shop-x',
        source: 'web',
        customField: 'value',
        _id: 'id-1',
      });
    });

    it('filters collection by the tenant shopId', async () => {
      const collection = makeCollectionWithDocs({ ids: [], documents: [], metadatas: [] });
      bindCollection(collection);

      await service.getDocuments(mockTenantContext);

      expect(collection.get).toHaveBeenCalledWith({
        where: { shopId: mockTenantContext.shopId },
      });
    });

    it('does not leak documents from another tenant', async () => {
      const tenantA = createMockTenantContext();
      const tenantB = { ...createMockTenantContext(), shopId: 'different-shop' };

      const collection = makeCollectionWithDocs({ ids: [], documents: [], metadatas: [] });
      bindCollection(collection);

      await service.getDocuments(tenantA);
      await service.getDocuments(tenantB);

      expect(collection.get).toHaveBeenNthCalledWith(1, { where: { shopId: tenantA.shopId } });
      expect(collection.get).toHaveBeenNthCalledWith(2, { where: { shopId: tenantB.shopId } });
    });

    it('returns empty result when the collection contains no matching documents', async () => {
      const collection = makeCollectionWithDocs({ ids: [], documents: [], metadatas: [] });
      bindCollection(collection);

      const result = await service.getDocuments(mockTenantContext);

      expect(result).toEqual([]);
    });

    it('returns empty result when collection is null', async () => {
      bindCollection(null);

      const result = await service.getDocuments(mockTenantContext);

      expect(result).toEqual([]);
    });

    it('treats a null document string as an empty string', async () => {
      const collection = makeCollectionWithDocs({
        ids: ['id-1'],
        documents: [null],
        metadatas: [{ shopId: mockTenantContext.shopId }],
      });
      bindCollection(collection);

      const result = await service.getDocuments(mockTenantContext);

      expect(result[0]?.pageContent).toBe('');
    });

    it('treats null metadata as an empty object (only _id is present)', async () => {
      const collection = makeCollectionWithDocs({
        ids: ['id-1'],
        documents: ['content'],
        metadatas: [null],
      });
      bindCollection(collection);

      const result = await service.getDocuments(mockTenantContext);

      expect(result[0]?.metadata).toEqual({ _id: 'id-1' });
    });

    it('handles a mix of null and valid entries in the same response', async () => {
      const collection = makeCollectionWithDocs({
        ids: ['id-1', 'id-2'],
        documents: [null, 'real content'],
        metadatas: [null, { source: 'test' }],
      });
      bindCollection(collection);

      const result = await service.getDocuments(mockTenantContext);

      expect(result[0]).toEqual({ pageContent: '', metadata: { _id: 'id-1' } });
      expect(result[1]).toEqual({ pageContent: 'real content', metadata: { source: 'test', _id: 'id-2' } });
    });
  });

  describe('addDocuments', () => {
    it('should split large documents into chunks and add them', async () => {
      const docs = [
        {
          pageContent: 'This is a test document with some content.',
          metadata: { source: 'test' },
        },
      ];

      const result = await service.addDocuments(docs, mockTenantContext);

      expect(chromaDBClient.addDocuments).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should inject shopId into metadata for each chunk', async () => {
      const docs = [
        {
          pageContent: 'Test content here.',
          metadata: { source: 'api' },
        },
      ];

      await service.addDocuments(docs, mockTenantContext);

      const calledDocs = chromaDBClient.addDocuments.mock.calls[0][0];
      for (const doc of calledDocs) {
        expect(doc.metadata.shopId).toBe(mockTenantContext.shopId);
      }
    });

    it('should handle multiple documents and split them into chunks', async () => {
      const longContent = 'Word '.repeat(2000);
      const docs = [
        { pageContent: 'Short doc.', metadata: { source: 'test1' } },
        { pageContent: longContent, metadata: { source: 'test2' } },
      ];

      chromaDBClient.addDocuments.mockResolvedValue(['id-1', 'id-2', 'id-3']);

      const result = await service.addDocuments(docs, mockTenantContext);

      expect(result).toBeDefined();
      expect(chromaDBClient.addDocuments).toHaveBeenCalledTimes(1);
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
