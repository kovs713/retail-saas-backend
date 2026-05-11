import { createCategory, createProduct } from '@/core/database/factories';
import { VectorStoreService } from '@/modules/rag/vector-store/vector-store.service';
import { CatalogIndexService } from './catalog-index.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('CatalogIndexService', () => {
  let service: CatalogIndexService;
  let vectorStoreService: DeepMocked<VectorStoreService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogIndexService,
        {
          provide: VectorStoreService,
          useValue: createMock<VectorStoreService>(),
        },
      ],
    }).compile();

    service = module.get(CatalogIndexService);
    vectorStoreService = module.get(VectorStoreService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('replaces indexed catalog chunks for a product with semantic product text', async () => {
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
  });

  it('removes indexed catalog chunks for a product', async () => {
    await service.removeProduct('product-1', 'shop-1');

    expect(vectorStoreService.deleteDocumentsByFilter).toHaveBeenCalledWith(
      'shop-1',
      { type: 'product', productId: 'product-1' },
    );
  });
});
