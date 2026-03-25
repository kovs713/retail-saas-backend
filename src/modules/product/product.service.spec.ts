import { createMockTenantContext, mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { Product } from './entities';
import { ProductService } from './product.service';
import { CategoryRepository, ProductRepository } from './repositories';
import { createProduct } from './util/product.factory';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateResult } from 'typeorm';

describe('ProductService', () => {
  let service: ProductService;
  let productRepository: DeepMocked<ProductRepository>;

  const mockProduct: Product = createProduct({ id: 'prod_1', index: 1 });
  const mockTenantContext = createMockTenantContext();

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
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepository = module.get(ProductRepository);
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

      expect(productRepository.existsBySkuAndShop).toHaveBeenCalledWith('PROD-001', mockTenantContext.shopId);
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
      expect(productRepository.update).toHaveBeenCalled();
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
      expect(productRepository.softDeleteById).toHaveBeenCalledWith('prod_1');
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
      productRepository.updateQuantity.mockResolvedValue();
      productRepository.findById.mockResolvedValue({ ...mockProduct, quantity: 150 });

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

  describe('findByBarcode', () => {
    it('should find product by barcode', async () => {
      const productWithBarcode = createProduct({
        index: 1,
        overrides: { barcode: '5901234123457' },
      });
      productRepository.findByBarcode.mockResolvedValue(productWithBarcode);
      const result = await service.findByBarcode('5901234123457', mockTenantContext);
      expect(result.barcode).toBe('5901234123457');
    });

    it('should throw NotFoundException for invalid barcode', async () => {
      productRepository.findByBarcode.mockResolvedValue(null);
      await expect(service.findByBarcode('invalid', mockTenantContext)).rejects.toThrow(NotFoundException);
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
  });
});
