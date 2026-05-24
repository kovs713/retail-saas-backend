import { createCategory, createProduct } from '@/core/database/factories';
import { VectorStoreService } from '@/modules/rag/vector-store/vector-store.service';
import { ProductRepository } from './repositories';
import { CatalogIndexService } from './catalog-index.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'node:crypto';

describe('CatalogIndexService', () => {
  let service: CatalogIndexService;
  let vectorStoreService: DeepMocked<VectorStoreService>;
  let productRepository: DeepMocked<ProductRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogIndexService,
        {
          provide: VectorStoreService,
          useValue: createMock<VectorStoreService>(),
        },
        {
          provide: ProductRepository,
          useValue: createMock<ProductRepository>(),
        },
      ],
    }).compile();

    service = module.get(CatalogIndexService);
    vectorStoreService = module.get(VectorStoreService);
    productRepository = module.get(ProductRepository);
    productRepository.update.mockResolvedValue({ affected: 1 } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('indexes a normal catalog product with name', async () => {
    const product = createProduct({
      id: 'product-1',
      shopId: 'shop-1',
      sku: 'SKU-001',
      name: 'Nike Air Max',
      description: 'Blue running shoes',
      barcode: '1234567890',
      metadata: { color: 'blue', size: 42, brand: 'Nike' },
      category: createCategory({ name: 'Shoes', slug: 'shoes' }),
    });

    await service.upsertProduct(product);

    expect(vectorStoreService.deleteDocumentsByFilter).toHaveBeenCalledWith(
      'shop-1',
      { type: 'product', productId: 'product-1' },
    );
    expect(vectorStoreService.addTexts).toHaveBeenCalledWith(
      [expect.stringContaining('Product: Nike Air Max')],
      'shop-1',
      [
        expect.objectContaining({
          source: 'catalog',
          type: 'product',
          productId: 'product-1',
          sku: 'SKU-001',
        }),
      ],
    );
    expect(vectorStoreService.addTexts).toHaveBeenCalledWith(
      [
        expect.stringContaining(
          'Attributes: color: blue; size: 42; brand: Nike',
        ),
      ],
      'shop-1',
      expect.any(Array),
    );
    expect(productRepository.update).toHaveBeenCalled();
  });

  it('removes indexed catalog chunks for a product', async () => {
    await service.removeProduct('product-1', 'shop-1');

    expect(vectorStoreService.deleteDocumentsByFilter).toHaveBeenCalledWith(
      'shop-1',
      { type: 'product', productId: 'product-1' },
    );
  });

  it('skips sell_document product', async () => {
    const product = createProduct({
      id: 'product-2',
      name: 'Test Item',
      metadata: { evotor: { source: 'sell_document' } },
    });

    await service.upsertProduct(product);

    expect(vectorStoreService.addTexts).not.toHaveBeenCalled();
    expect(productRepository.update).not.toHaveBeenCalled();
  });

  it('skips product with empty name', async () => {
    const product = createProduct({ id: 'product-3', name: '' });

    await service.upsertProduct(product);

    expect(vectorStoreService.addTexts).not.toHaveBeenCalled();
  });

  it('skips deleted product', async () => {
    const product = createProduct({
      id: 'product-4',
      deletedAt: new Date(),
    });

    await service.upsertProduct(product);

    expect(vectorStoreService.addTexts).not.toHaveBeenCalled();
  });

  it('skips hidden storefront product', async () => {
    const product = createProduct({
      id: 'product-hidden',
      name: 'Hidden Product',
      metadata: {
        storefront: { publicationStatus: 'HIDDEN' },
      },
    });

    await service.upsertProduct(product);

    expect(vectorStoreService.addTexts).not.toHaveBeenCalled();
    expect(vectorStoreService.deleteDocumentsByFilter).toHaveBeenCalledWith(
      product.shopId,
      { type: 'product', productId: 'product-hidden' },
    );
  });

  it('skips re-index when content unchanged (same hash)', async () => {
    const product = createProduct({
      id: 'product-5',
      name: 'Unchanged Product',
      metadata: { color: 'red' },
    });
    const text = (service as any).buildProductText(product);
    const hash = createHash('sha256').update(text).digest('hex');
    (product.metadata as any).rag = { contentHash: hash };

    await service.upsertProduct(product);

    expect(vectorStoreService.addTexts).not.toHaveBeenCalled();
  });

  it('re-indexes when description changed', async () => {
    const hash =
      '0000000000000000000000000000000000000000000000000000000000000000';
    const product = createProduct({
      id: 'product-6',
      name: 'Changed Product',
      description: 'New description',
      metadata: { rag: { contentHash: hash } },
    });

    await service.upsertProduct(product);

    expect(vectorStoreService.addTexts).toHaveBeenCalled();
  });

  it('removes from Chroma when product is not indexable anymore', async () => {
    const product = createProduct({
      id: 'product-7',
      name: 'Removed',
      shopId: 'shop-1',
    });
    await service.upsertProduct(product);
    expect(vectorStoreService.addTexts).toHaveBeenCalled();
    expect(vectorStoreService.deleteDocumentsByFilter).toHaveBeenCalledWith(
      'shop-1',
      { type: 'product', productId: 'product-7' },
    );
  });
});
