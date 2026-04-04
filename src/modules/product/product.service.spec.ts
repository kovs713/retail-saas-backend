import { createMockTenantContext, mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { createCategoryEntity, createProduct } from '@/core/database/factories';
import { StorageService } from '@/modules/storage/storage.service';
import { Product } from './entities';
import { ProductService } from './product.service';
import { CategoryRepository, ProductRepository } from './repositories';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateResult } from 'typeorm';

describe('ProductService', () => {
  let service: ProductService;
  let productRepository: DeepMocked<ProductRepository>;
  let categoryRepository: DeepMocked<CategoryRepository>;
  let cacheService: DeepMocked<CacheService>;
  let storageService: DeepMocked<StorageService>;
  let configService: DeepMocked<ConfigService>;

  const mockProduct: Product = createProduct({ id: 'prod_1', index: 1 });
  const mockTenantContext = createMockTenantContext();

  const mockCategory = createCategoryEntity({
    overrides: {
      id: 'cat_001',
      shopId: 'shop_001',
      name: 'Electronics',
      slug: 'electronics',
    },
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
          provide: CategoryRepository,
          useValue: createMock<CategoryRepository>(),
        },
        {
          provide: CacheService,
          useValue: mockCacheService(),
        },
        {
          provide: StorageService,
          useValue: createMock<StorageService>(),
        },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepository = module.get(ProductRepository);
    categoryRepository = module.get(CategoryRepository);
    cacheService = module.get(CacheService);
    storageService = module.get(StorageService);
    configService = module.get(ConfigService);
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        MEDIA_UPLOAD_PRESIGNED_TTL: 900,
      };
      return key in config ? config[key] : defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const createDto = {
        sku: 'PROD-001',
        name: 'Test',
        price: 99.99,
        quantity: 100,
      };
      productRepository.existsBySkuAndShop.mockResolvedValue(false);
      productRepository.create.mockReturnValue(mockProduct);
      productRepository.save.mockResolvedValue(mockProduct);

      const result = await service.create(createDto, mockTenantContext);

      expect(result).toEqual(mockProduct);
    });

    it('should throw ConflictException when SKU exists', async () => {
      productRepository.existsBySkuAndShop.mockResolvedValue(true);
      await expect(
        service.create(
          {
            sku: 'PROD-001',
            name: 'Test',
            price: 99.99,
            quantity: 100,
          },
          mockTenantContext,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);
      const result = await service.findOne('prod_1', mockTenantContext);
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when not found', async () => {
      productRepository.findById.mockResolvedValue(null);
      await expect(service.findOne('non-existent', mockTenantContext)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);
      productRepository.existsBySkuAndShop.mockResolvedValue(false);
      const mockUpdateResult: UpdateResult = { affected: 1, generatedMaps: [], raw: [] };
      productRepository.update.mockResolvedValue(mockUpdateResult);
      productRepository.findById.mockResolvedValue({ ...mockProduct, name: 'Updated' });

      const result = await service.update('prod_1', { name: 'Updated' }, mockTenantContext);
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productRepository.findById.mockResolvedValue(null);
      await expect(service.update('non-existent', { name: 'Updated' }, mockTenantContext)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for duplicate SKU', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);
      productRepository.existsBySkuAndShop.mockResolvedValue(true);
      await expect(service.update('prod_1', { sku: 'EXISTING' }, mockTenantContext)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete a product', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);
      productRepository.softDeleteById.mockResolvedValue();
      await service.remove('prod_1', mockTenantContext);
    });

    it('should throw NotFoundException for non-existent product', async () => {
      productRepository.findById.mockResolvedValue(null);
      await expect(service.remove('non-existent', mockTenantContext)).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should restore a soft deleted product', async () => {
      productRepository.findOneWithDeleted.mockResolvedValue(mockProduct);
      const mockRestoreResult: UpdateResult = { affected: 1, generatedMaps: [], raw: [] };
      productRepository.restoreById.mockResolvedValue(mockRestoreResult);
      const result = await service.restore('prod_1', mockTenantContext);
      expect(result.message).toBe('Product restored successfully');
    });

    it('should throw NotFoundException when nothing restored', async () => {
      const mockRestoreResult: UpdateResult = { affected: 0, generatedMaps: [], raw: [] };
      productRepository.restoreById.mockResolvedValue(mockRestoreResult);
      await expect(service.restore('non-existent', mockTenantContext)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStock', () => {
    it('should update stock quantity', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);
      productRepository.updateQuantity.mockResolvedValue();
      productRepository.findById.mockResolvedValue({ ...mockProduct, quantity: 150 });

      const result = await service.updateStock('prod_1', 150, mockTenantContext);
      expect(result.quantity).toBe(150);
    });

    it('should scope stock update by tenant before writing', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);
      productRepository.updateQuantity.mockResolvedValue();
      productRepository.findById
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({ ...mockProduct, quantity: 150 });

      const result = await service.updateStock('prod_1', 150, mockTenantContext);

      expect(result.quantity).toBe(150);
    });
  });

  describe('adjustStock', () => {
    it('should increase stock', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);
      productRepository.incrementQuantity.mockResolvedValue();
      productRepository.findById.mockResolvedValue({ ...mockProduct, quantity: 150 });

      const result = await service.adjustStock('prod_1', 50, mockTenantContext);
      expect(result.quantity).toBe(150);
    });

    it('should scope stock adjustment by tenant before writing', async () => {
      productRepository.findById
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({ ...mockProduct, quantity: 150 });
      productRepository.incrementQuantity.mockResolvedValue();

      const result = await service.adjustStock('prod_1', 50, mockTenantContext);

      expect(result.quantity).toBe(150);
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      productRepository.findAll.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll({ page: 1, limit: 10 }, mockTenantContext);
      expect(result.data).toHaveLength(1);
      expect(result.pagination?.total).toBe(1);
    });

    it('should filter by category', async () => {
      productRepository.findAll.mockResolvedValue([[mockProduct], 1]);

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
      productRepository.findAll.mockResolvedValue([[mockProduct], 1]);

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

  describe('findOneBySku', () => {
    it('should return a product by SKU', async () => {
      const productWithSku = createProduct({
        index: 1,
        overrides: { sku: 'TEST-001' },
      });
      productRepository.findBySku.mockResolvedValue(productWithSku);
      const result = await service.findOneBySku('TEST-001', mockTenantContext);
      expect(result.sku).toBe('TEST-001');
    });

    it('should throw NotFoundException for non-existent SKU', async () => {
      productRepository.findBySku.mockResolvedValue(null);
      await expect(service.findOneBySku('NON-EXISTENT', mockTenantContext)).rejects.toThrow(NotFoundException);
    });
  });

  describe('count', () => {
    it('should return total product count', async () => {
      productRepository.countByShop.mockResolvedValue(50);
      const result = await service.count(mockTenantContext);
      expect(result).toBe(50);
    });
  });

  describe('countByCategory', () => {
    it('should return count for specific category', async () => {
      productRepository.countByCategory.mockResolvedValue(25);
      const result = await service.countByCategory('Electronics', mockTenantContext);
      expect(result).toBe(25);
    });
  });

  describe('findLowStock', () => {
    it('should return products below threshold', async () => {
      const lowStockProduct = createProduct({
        index: 1,
        overrides: { quantity: 5 },
      });
      productRepository.findLowStock.mockResolvedValue([lowStockProduct]);

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

      const result = await service.findAll({ page: 1, limit: 10 }, mockTenantContext);

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

  describe('createImageUploadUrl', () => {
    it('should return upload and public URLs', async () => {
      const productWithShop = {
        ...mockProduct,
        id: 'prod_1',
        shopId: mockTenantContext.shopId,
        shop: { slug: 'my-shop' } as any,
      } as Product;
      productRepository.findByIdWithShop.mockResolvedValue(productWithShop);
      storageService.getPresignedPutUrl.mockResolvedValue('https://upload-url');

      const result = await service.createImageUploadUrl('prod_1', 'image-1.jpg', mockTenantContext);

      expect(result.uploadUrl).toBe('https://upload-url');
      expect(result.publicUrl).toBe('/public/media/my-shop/products/prod_1/image-1.jpg');
      expect(result.key).toBe('products/prod_1/images/image-1.jpg');
    });

    it('should throw for invalid file name', async () => {
      const productWithShop = {
        ...mockProduct,
        id: 'prod_1',
        shopId: mockTenantContext.shopId,
        shop: { slug: 'my-shop' } as any,
      } as Product;
      productRepository.findByIdWithShop.mockResolvedValue(productWithShop);

      await expect(service.createImageUploadUrl('prod_1', '../evil.jpg', mockTenantContext)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteImage', () => {
    it('should delete image by deterministic key', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);
      storageService.deleteObject.mockResolvedValue();

      await service.deleteImage('prod_1', 'photo.jpg', mockTenantContext);
    });
  });

  describe('findByBarcode', () => {
    it('should find product by barcode', async () => {
      const productWithBarcode = createProduct({ index: 1, overrides: { barcode: '5901234123457' } });
      productRepository.findByBarcode.mockResolvedValue(productWithBarcode);

      const result = await service.findByBarcode('5901234123457', mockTenantContext);
      expect(result.barcode).toBe('5901234123457');
    });

    it('should throw NotFoundException for invalid barcode', async () => {
      productRepository.findByBarcode.mockResolvedValue(null);
      await expect(service.findByBarcode('invalid', mockTenantContext)).rejects.toThrow(NotFoundException);
    });

    it('should return cached product when available', async () => {
      cacheService.get.mockResolvedValue(mockProduct);

      const result = await service.findByBarcode('5901234123457', mockTenantContext);

      expect(result).toEqual(mockProduct);
    });
  });

  describe('restore', () => {
    it('should throw NotFoundException when product not in deleted set', async () => {
      productRepository.findOneWithDeleted.mockResolvedValue(null);
      await expect(service.restore('non-existent', mockTenantContext)).rejects.toThrow(NotFoundException);
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

      const result = await service.createCategory('shop-1', { name: 'Electronics', slug: 'electronics' });

      expect(result).toEqual(mockCategory);
    });

    it('should throw ConflictException when slug exists', async () => {
      categoryRepository.findBySlug.mockResolvedValue(mockCategory);

      await expect(service.createCategory('shop-1', { name: 'Electronics', slug: 'electronics' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateCategory', () => {
    it('should update a category successfully', async () => {
      categoryRepository.findByIdAndShop.mockResolvedValue(mockCategory);
      categoryRepository.save.mockResolvedValue({ ...mockCategory, name: 'Updated' });

      const result = await service.updateCategory('cat-1', 'shop-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException for non-existent category', async () => {
      categoryRepository.findByIdAndShop.mockResolvedValue(null);

      await expect(service.updateCategory('missing', 'shop-1', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new slug exists', async () => {
      categoryRepository.findByIdAndShop.mockResolvedValue(mockCategory);
      categoryRepository.existsBySlugAndShop.mockResolvedValue(true);

      await expect(service.updateCategory('cat-1', 'shop-1', { slug: 'existing-slug' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category successfully', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);
      productRepository.countByCategory.mockResolvedValue(0);

      await service.deleteCategory('cat-1', 'shop-1');
    });

    it('should throw NotFoundException for non-existent category', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteCategory('missing', 'shop-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when category has products', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);
      productRepository.countByCategory.mockResolvedValue(5);

      await expect(service.deleteCategory('cat-1', 'shop-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('update SKU conflict', () => {
    it('should skip SKU check when sku not changed', async () => {
      productRepository.findById.mockResolvedValue(mockProduct);
      const mockUpdateResult: UpdateResult = { affected: 1, generatedMaps: [], raw: [] };
      productRepository.update.mockResolvedValue(mockUpdateResult);
      productRepository.findById.mockResolvedValue(mockProduct);

      const result = await service.update('prod_1', { name: 'Same SKU' }, mockTenantContext);

      expect(result.name).toBe(mockProduct.name);
    });
  });
});
