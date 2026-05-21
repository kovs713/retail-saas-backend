import { createMockTenantContext, mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { createCategory, createProduct } from '@/core/database/factories';
import { ObjectStorageService } from '@/core/object-storage/object-storage.service';
import { CatalogIndexService } from './catalog-index.service';
import { Product, ProductImage } from './entities';
import { ProductService } from './product.service';
import {
  CategoryRepository,
  ProductImageRepository,
  ProductRepository,
} from './repositories';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateResult } from 'typeorm';

describe('ProductService', () => {
  let service: ProductService;
  let productRepository: DeepMocked<ProductRepository>;
  let productImageRepository: DeepMocked<ProductImageRepository>;
  let categoryRepository: DeepMocked<CategoryRepository>;
  let cacheService: DeepMocked<CacheService>;
  let storageService: DeepMocked<ObjectStorageService>;
  let catalogIndexService: DeepMocked<CatalogIndexService>;

  const mockProduct: Product = createProduct({ id: 'prod_1', index: 1 });
  const mockTenantContext = createMockTenantContext();

  const mockCategory = createCategory({
    id: 'cat_001',
    shopId: 'shop_001',
    name: 'Electronics',
    slug: 'electronics',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useValue: createMock<ProductRepository>(),
        },
        {
          provide: ProductImageRepository,
          useValue: createMock<ProductImageRepository>(),
        },
        {
          provide: CategoryRepository,
          useValue: createMock<CategoryRepository>(),
        },
        {
          provide: CacheService,
          useValue: mockCacheService(),
        },
        {
          provide: ObjectStorageService,
          useValue: createMock<ObjectStorageService>(),
        },
        {
          provide: CatalogIndexService,
          useValue: createMock<CatalogIndexService>(),
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepository = module.get(ProductRepository);
    productImageRepository = module.get(ProductImageRepository);
    categoryRepository = module.get(CategoryRepository);
    cacheService = module.get(CacheService);
    storageService = module.get(ObjectStorageService);
    catalogIndexService = module.get(CatalogIndexService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      productRepository.findSyncedById.mockResolvedValue(mockProduct);
      const result = await service.findOne('prod_1', mockTenantContext);
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when not found', async () => {
      productRepository.findSyncedById.mockResolvedValue(null);
      await expect(
        service.findOne('non-existent', mockTenantContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      productRepository.findSyncedById
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({
          ...mockProduct,
          name: 'Updated',
        });
      const mockUpdateResult: UpdateResult = {
        affected: 1,
        generatedMaps: [],
        raw: [],
      };
      productRepository.update.mockResolvedValue(mockUpdateResult);

      const result = await service.update(
        'prod_1',
        { name: 'Updated' },
        mockTenantContext,
      );
      expect(result.name).toBe('Updated');
      expect(catalogIndexService.upsertProduct).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'prod_1', name: 'Updated' }),
      );
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productRepository.findSyncedById.mockResolvedValue(null);
      await expect(
        service.update('non-existent', { name: 'Updated' }, mockTenantContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify category belongs to shop', async () => {
      productRepository.findSyncedById
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({
          ...mockProduct,
          categoryId: mockCategory.id,
        });
      categoryRepository.findByIdAndShop.mockResolvedValue(mockCategory);
      productRepository.update.mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });

      const result = await service.update(
        'prod_1',
        { categoryId: mockCategory.id },
        mockTenantContext.shopId,
      );

      expect(categoryRepository.findByIdAndShop).toHaveBeenCalledWith(
        mockCategory.id,
        mockTenantContext.shopId,
      );
      expect(result.categoryId).toBe(mockCategory.id);
    });

    it('should reject category from another shop', async () => {
      productRepository.findSyncedById.mockResolvedValue(mockProduct);
      categoryRepository.findByIdAndShop.mockResolvedValue(null);

      await expect(
        service.update(
          'prod_1',
          { categoryId: '123e4567-e89b-12d3-a456-426614174000' },
          mockTenantContext.shopId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return existing product for empty local update', async () => {
      productRepository.findSyncedById.mockResolvedValue(mockProduct);

      const result = await service.update(
        'prod_1',
        {},
        mockTenantContext.shopId,
      );

      expect(result).toEqual(mockProduct);
      expect(productRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      productRepository.findSyncedAll.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll(
        { page: 1, limit: 10 },
        mockTenantContext,
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination?.total).toBe(1);
    });

    it('should filter by category', async () => {
      productRepository.findSyncedAll.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll(
        {
          page: 1,
          limit: 10,
          category: 'Electronics',
        },
        mockTenantContext,
      );
      expect(result.data).toHaveLength(1);
    });

    it('should search by name', async () => {
      productRepository.findSyncedAll.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll(
        {
          page: 1,
          limit: 10,
          search: 'Test',
        },
        mockTenantContext,
      );
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findAvailableProducts', () => {
    it('should return only in-stock products from the repository', async () => {
      const availableProducts = [
        createProduct({ id: 'prod_2', quantity: 7 }),
        createProduct({ id: 'prod_1', quantity: 3 }),
      ];
      productRepository.findSyncedAvailableByShop.mockResolvedValue(
        availableProducts,
      );

      const result = await service.findAvailableProducts(
        mockTenantContext.shopId,
        25,
      );

      expect(productRepository.findSyncedAvailableByShop).toHaveBeenCalledWith(
        mockTenantContext.shopId,
        25,
      );
      expect(result).toEqual(availableProducts);
    });
  });

  describe('rebuildCatalogIndex', () => {
    it('should clear catalog docs and reindex all active products', async () => {
      const firstProduct = createProduct({ id: 'prod_1', shopId: 'shop-1' });
      const secondProduct = createProduct({ id: 'prod_2', shopId: 'shop-1' });
      productRepository.findSyncedActiveByShop.mockResolvedValue([
        firstProduct,
        secondProduct,
      ]);

      const result = await service.rebuildCatalogIndex('shop-1');

      expect(catalogIndexService.clearCatalog).toHaveBeenCalledWith('shop-1');
      expect(catalogIndexService.upsertProduct).toHaveBeenNthCalledWith(
        1,
        firstProduct,
      );
      expect(catalogIndexService.upsertProduct).toHaveBeenNthCalledWith(
        2,
        secondProduct,
      );
      expect(result).toBe(2);
    });
  });

  describe('findOneBySku', () => {
    it('should return a product by SKU', async () => {
      const productWithSku = createProduct({
        index: 1,
        sku: 'TEST-001',
      });
      productRepository.findSyncedBySku.mockResolvedValue(productWithSku);
      const result = await service.findOneBySku('TEST-001', mockTenantContext);
      expect(result.sku).toBe('TEST-001');
    });

    it('should throw NotFoundException for non-existent SKU', async () => {
      productRepository.findSyncedBySku.mockResolvedValue(null);
      await expect(
        service.findOneBySku('NON-EXISTENT', mockTenantContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('count', () => {
    it('should return total product count', async () => {
      productRepository.countSyncedByShop.mockResolvedValue(50);
      const result = await service.count(mockTenantContext);
      expect(result).toBe(50);
    });
  });

  describe('countByCategory', () => {
    it('should return count for specific category', async () => {
      productRepository.countSyncedByCategory.mockResolvedValue(25);
      const result = await service.countByCategory(
        'Electronics',
        mockTenantContext.shopId,
      );
      expect(result).toBe(25);
    });
  });

  describe('findLowStock', () => {
    it('should return products below threshold', async () => {
      const lowStockProduct = createProduct({
        index: 1,
        quantity: 5,
      });
      productRepository.findSyncedLowStock.mockResolvedValue([lowStockProduct]);

      const result = await service.findLowStock(10, mockTenantContext);
      expect(result).toHaveLength(1);
    });

    it('should return cached result when available', async () => {
      const cached = [createProduct({ index: 1 })];
      cacheService.get.mockResolvedValue(cached);

      const result = await service.findLowStock(10, mockTenantContext);

      expect(result).toEqual(cached);
    });
  });

  describe('findAll cache', () => {
    it('should return cached result when available', async () => {
      const cached = {
        success: true,
        data: [mockProduct],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      cacheService.get.mockResolvedValue(cached);

      const result = await service.findAll(
        { page: 1, limit: 10 },
        mockTenantContext,
      );

      expect(result).toEqual(cached);
    });
  });

  describe('findOne cache', () => {
    it('should return cached product when available', async () => {
      cacheService.get.mockResolvedValue(mockProduct);

      const result = await service.findOne('prod_1', mockTenantContext);

      expect(result).toEqual(mockProduct);
    });
  });

  describe('findOneBySku cache', () => {
    it('should return cached product when available', async () => {
      cacheService.get.mockResolvedValue(mockProduct);

      const result = await service.findOneBySku('TEST-001', mockTenantContext);

      expect(result).toEqual(mockProduct);
    });
  });

  describe('uploadProductImage', () => {
    it('should upload image and create ProductImage entity', async () => {
      const productWithShop = {
        ...mockProduct,
        id: 'prod_1',
        shopId: mockTenantContext.shopId,
        shop: { slug: 'my-shop' } as any,
      } as Product;

      const mockImage = {
        id: 'img_1',
        productId: 'prod_1',
        shopId: mockTenantContext.shopId,
        s3Key: 'products/prod_1/images/photo.jpg',
        publicUrl: '/public/media/my-shop/products/prod_1/photo.jpg',
        isPrimary: true,
        sortOrder: 0,
        contentType: 'image/jpeg',
        size: 1024,
      } as ProductImage;

      productRepository.findSyncedByIdWithShop.mockResolvedValue(
        productWithShop,
      );
      productImageRepository.countByProductId.mockResolvedValue(0);
      storageService.putObject.mockResolvedValue('etag-1');
      productImageRepository.create.mockReturnValue(mockImage);
      productImageRepository.save.mockResolvedValue(mockImage);

      const file = {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('image-data'),
      } as Express.Multer.File;

      const result = await service.uploadProductImage(
        'prod_1',
        file,
        mockTenantContext.shopId,
      );

      expect(storageService.putObject).toHaveBeenCalledWith(
        'products/prod_1/images/photo.jpg',
        file.buffer,
        file.size,
        expect.objectContaining({
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        }),
      );
      expect(productImageRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isPrimary: true,
          sortOrder: 0,
        }),
      );
      expect(result).toEqual(mockImage);
    });

    it('should throw BadRequestException when max images reached', async () => {
      const productWithShop = {
        ...mockProduct,
        id: 'prod_1',
        shopId: mockTenantContext.shopId,
        shop: { slug: 'my-shop' } as any,
      } as Product;

      productRepository.findSyncedByIdWithShop.mockResolvedValue(
        productWithShop,
      );
      productImageRepository.countByProductId.mockResolvedValue(10);

      const file = {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('image-data'),
      } as Express.Multer.File;

      await expect(
        service.uploadProductImage('prod_1', file, mockTenantContext.shopId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set isPrimary false for subsequent images', async () => {
      const productWithShop = {
        ...mockProduct,
        id: 'prod_1',
        shopId: mockTenantContext.shopId,
        shop: { slug: 'my-shop' } as any,
      } as Product;

      const mockImage = {
        id: 'img_2',
        productId: 'prod_1',
        shopId: mockTenantContext.shopId,
        s3Key: 'products/prod_1/images/photo2.jpg',
        publicUrl: '/public/media/my-shop/products/prod_1/photo2.jpg',
        isPrimary: false,
        sortOrder: 1,
        contentType: 'image/jpeg',
        size: 2048,
      } as ProductImage;

      productRepository.findSyncedByIdWithShop.mockResolvedValue(
        productWithShop,
      );
      productImageRepository.countByProductId.mockResolvedValue(1);
      storageService.putObject.mockResolvedValue('etag-2');
      productImageRepository.create.mockReturnValue(mockImage);
      productImageRepository.save.mockResolvedValue(mockImage);

      const file = {
        originalname: 'photo2.jpg',
        mimetype: 'image/jpeg',
        size: 2048,
        buffer: Buffer.from('image-data'),
      } as Express.Multer.File;

      const result = await service.uploadProductImage(
        'prod_1',
        file,
        mockTenantContext.shopId,
      );

      expect(result.isPrimary).toBe(false);
      expect(result.sortOrder).toBe(1);
    });
  });

  describe('deleteImage', () => {
    it('should delete image from S3 and database', async () => {
      const mockImage = {
        id: 'img_1',
        productId: 'prod_1',
        shopId: mockTenantContext.shopId,
        s3Key: 'products/prod_1/images/photo.jpg',
        product: { externalSource: 'evotor' },
      } as ProductImage;

      productImageRepository.findWithProductById.mockResolvedValue(mockImage);
      storageService.deleteObject.mockResolvedValue();
      productImageRepository.hardDeleteById.mockResolvedValue();

      await service.deleteImage('img_1', mockTenantContext.shopId);

      expect(storageService.deleteObject).toHaveBeenCalledWith(
        'products/prod_1/images/photo.jpg',
      );
      expect(productImageRepository.hardDeleteById).toHaveBeenCalledWith(
        'img_1',
        mockTenantContext.shopId,
      );
    });

    it('should throw NotFoundException when image not found', async () => {
      productImageRepository.findWithProductById.mockResolvedValue(null);

      await expect(
        service.deleteImage('non-existent', mockTenantContext.shopId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderImage', () => {
    it('should update sortOrder', async () => {
      const mockImage = {
        id: 'img_1',
        productId: 'prod_1',
        shopId: mockTenantContext.shopId,
        sortOrder: 0,
        product: { externalSource: 'evotor' },
      } as ProductImage;

      productImageRepository.findWithProductById.mockResolvedValue(mockImage);
      productImageRepository.save.mockResolvedValue({
        ...mockImage,
        sortOrder: 5,
      });

      const result = await service.reorderImage(
        'img_1',
        5,
        mockTenantContext.shopId,
      );

      expect(result.sortOrder).toBe(5);
    });

    it('should throw NotFoundException when image not found', async () => {
      productImageRepository.findWithProductById.mockResolvedValue(null);

      await expect(
        service.reorderImage('non-existent', 5, mockTenantContext.shopId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setPrimaryImage', () => {
    it('should set image as primary and unset others', async () => {
      const mockImage = {
        id: 'img_1',
        productId: 'prod_1',
        shopId: mockTenantContext.shopId,
        isPrimary: false,
        product: { externalSource: 'evotor' },
      } as ProductImage;

      productImageRepository.findWithProductById.mockResolvedValue(mockImage);
      productImageRepository.update.mockResolvedValue({
        affected: 1,
      } as UpdateResult);
      productImageRepository.save.mockResolvedValue({
        ...mockImage,
        isPrimary: true,
      });

      const result = await service.setPrimaryImage(
        'img_1',
        mockTenantContext.shopId,
      );

      expect(productImageRepository.update).toHaveBeenCalledWith(
        {
          productId: 'prod_1',
          shopId: mockTenantContext.shopId,
          isPrimary: true,
        },
        { isPrimary: false },
      );
      expect(result.isPrimary).toBe(true);
    });

    it('should throw NotFoundException when image not found', async () => {
      productImageRepository.findWithProductById.mockResolvedValue(null);

      await expect(
        service.setPrimaryImage('non-existent', mockTenantContext.shopId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findImagesByProductId', () => {
    it('should return all images for product', async () => {
      const mockImages = [
        { id: 'img_1', sortOrder: 0 } as ProductImage,
        { id: 'img_2', sortOrder: 1 } as ProductImage,
      ];

      productImageRepository.findAllByProductId.mockResolvedValue(mockImages);
      productRepository.findSyncedById.mockResolvedValue(mockProduct);

      const result = await service.findImagesByProductId(
        'prod_1',
        mockTenantContext.shopId,
      );

      expect(result).toEqual(mockImages);
    });
  });

  describe('deleteAllProductImages', () => {
    it('should delete all images from S3 and database', async () => {
      const mockImages = [
        { id: 'img_1', s3Key: 'key1' } as ProductImage,
        { id: 'img_2', s3Key: 'key2' } as ProductImage,
      ];

      productImageRepository.findAllByProductId.mockResolvedValue(mockImages);
      storageService.deleteObject.mockResolvedValue();
      productImageRepository.hardDeleteByProductId.mockResolvedValue();

      await service.deleteAllProductImages('prod_1', mockTenantContext.shopId);

      expect(storageService.deleteObject).toHaveBeenCalledTimes(2);
      expect(productImageRepository.hardDeleteByProductId).toHaveBeenCalledWith(
        'prod_1',
        mockTenantContext.shopId,
      );
    });

    it('should do nothing when no images exist', async () => {
      productImageRepository.findAllByProductId.mockResolvedValue([]);

      await service.deleteAllProductImages('prod_1', mockTenantContext.shopId);

      expect(storageService.deleteObject).not.toHaveBeenCalled();
    });
  });

  describe('findByBarcode', () => {
    it('should find product by barcode', async () => {
      const productWithBarcode = createProduct({
        index: 1,
        barcode: '5901234123457',
      });
      productRepository.findSyncedByBarcode.mockResolvedValue(
        productWithBarcode,
      );

      const result = await service.findByBarcode(
        '5901234123457',
        mockTenantContext,
      );
      expect(result.barcode).toBe('5901234123457');
    });

    it('should throw NotFoundException for invalid barcode', async () => {
      productRepository.findSyncedByBarcode.mockResolvedValue(null);
      await expect(
        service.findByBarcode('invalid', mockTenantContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return cached product when available', async () => {
      cacheService.get.mockResolvedValue(mockProduct);

      const result = await service.findByBarcode(
        '5901234123457',
        mockTenantContext,
      );

      expect(result).toEqual(mockProduct);
    });
  });

  describe('getCategories', () => {
    it('should return categories for shop', async () => {
      categoryRepository.findAllByShop.mockResolvedValue([mockCategory]);

      const result = await service.getCategories('shop-1');

      expect(result).toEqual([mockCategory]);
    });

    it('should return cached categories when available', async () => {
      cacheService.get.mockResolvedValue([mockCategory]);

      const result = await service.getCategories('shop-1');

      expect(result).toEqual([mockCategory]);
    });
  });

  describe('createCategory', () => {
    it('should create a category successfully', async () => {
      categoryRepository.findBySlug.mockResolvedValue(null);
      categoryRepository.create.mockReturnValue(mockCategory);
      categoryRepository.save.mockResolvedValue(mockCategory);

      const result = await service.createCategory('shop-1', {
        name: 'Electronics',
        slug: 'electronics',
      });

      expect(result).toEqual(mockCategory);
    });

    it('should throw ConflictException when slug exists', async () => {
      categoryRepository.findBySlug.mockResolvedValue(mockCategory);

      await expect(
        service.createCategory('shop-1', {
          name: 'Electronics',
          slug: 'electronics',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateCategory', () => {
    it('should update a category successfully', async () => {
      categoryRepository.findByIdAndShop.mockResolvedValue(mockCategory);
      categoryRepository.save.mockResolvedValue({
        ...mockCategory,
        name: 'Updated',
      });

      const result = await service.updateCategory('cat-1', 'shop-1', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException for non-existent category', async () => {
      categoryRepository.findByIdAndShop.mockResolvedValue(null);

      await expect(
        service.updateCategory('missing', 'shop-1', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new slug exists', async () => {
      categoryRepository.findByIdAndShop.mockResolvedValue(mockCategory);
      categoryRepository.existsBySlugAndShop.mockResolvedValue(true);

      await expect(
        service.updateCategory('cat-1', 'shop-1', { slug: 'existing-slug' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category successfully', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);
      productRepository.countSyncedByCategory.mockResolvedValue(0);

      await service.deleteCategory('cat-1', 'shop-1');
    });

    it('should throw NotFoundException for non-existent category', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteCategory('missing', 'shop-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when category has products', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);
      productRepository.countSyncedByCategory.mockResolvedValue(5);

      await expect(service.deleteCategory('cat-1', 'shop-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
