/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductService } from '@/modules/product/product.service';
import { Product } from '@/app/modules/product/product.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { createProduct } from '../../../fixtures/product.factory';

jest.mock('@/common/logger/app-logger.service', () => ({
  AppLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
}));

describe('ProductService', () => {
  let service: ProductService;
  let repository: jest.Mocked<Repository<Product>>;

  const mockProduct: Product = createProduct({ id: 'prod_1', index: 1 });

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      count: jest.fn(),
      findOneBy: jest.fn(),
      findBy: jest.fn(),
      exists: jest.fn(),
      existsBy: jest.fn(),
      increment: jest.fn(),
      findAndCount: jest.fn(),
      target: Product,
      manager: {} as unknown as Repository<Product>['manager'],
      queryRunner: null,
    } as unknown as jest.Mocked<Repository<Product>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    repository = module.get(getRepositoryToken(Product));
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
      repository.existsBy.mockResolvedValue(false);
      repository.create.mockReturnValue(mockProduct);
      repository.save.mockResolvedValue(mockProduct);

      const result = await service.create(createDto);

      expect(repository.existsBy).toHaveBeenCalledWith({ sku: 'PROD-001' });
      expect(result).toEqual(mockProduct);
    });

    it('should throw ConflictException when SKU exists', async () => {
      repository.existsBy.mockResolvedValue(true);
      await expect(
        service.create({
          sku: 'PROD-001',
          name: 'Test',
          price: 99.99,
          quantity: 100,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      repository.findOne.mockResolvedValue(mockProduct);
      const result = await service.findOne('prod_1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      repository.findOne.mockResolvedValue(mockProduct);
      repository.existsBy.mockResolvedValue(false);
      repository.update.mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });
      repository.findOne.mockResolvedValue({ ...mockProduct, name: 'Updated' });

      const result = await service.update('prod_1', { name: 'Updated' });
      expect(repository.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException for non-existent product', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.update('non-existent', { name: 'Updated' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate SKU', async () => {
      repository.findOne.mockResolvedValue(mockProduct);
      repository.existsBy.mockResolvedValue(true);
      await expect(service.update('prod_1', { sku: 'EXISTING' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete a product', async () => {
      repository.findOne.mockResolvedValue(mockProduct);
      repository.softDelete.mockResolvedValue({ affected: 1 } as never);
      await service.remove('prod_1');
      expect(repository.softDelete).toHaveBeenCalledWith('prod_1');
    });

    it('should throw NotFoundException for non-existent product', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should restore a soft deleted product', async () => {
      repository.restore.mockResolvedValue({ affected: 1 } as never);
      const result = await service.restore('prod_1');
      expect(result.message).toBe('Product restored successfully');
    });

    it('should throw NotFoundException when nothing restored', async () => {
      repository.restore.mockResolvedValue({ affected: 0 } as never);
      await expect(service.restore('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStock', () => {
    it('should update stock quantity', async () => {
      repository.findOne.mockResolvedValue(mockProduct);
      repository.update.mockResolvedValue({ affected: 1 } as never);
      repository.findOne.mockResolvedValue({ ...mockProduct, quantity: 150 });

      const result = await service.updateStock('prod_1', 150);
      expect(result.quantity).toBe(150);
    });
  });

  describe('adjustStock', () => {
    it('should increase stock', async () => {
      repository.findOne.mockResolvedValue(mockProduct);
      repository.increment.mockResolvedValue({ affected: 1 } as never);
      repository.findOne.mockResolvedValue({ ...mockProduct, quantity: 150 });

      const result = await service.adjustStock('prod_1', 50);
      expect(result.quantity).toBe(150);
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      repository.findAndCount.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by category', async () => {
      repository.findAndCount.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        category: 'Electronics',
      });
      expect(result.data).toHaveLength(1);
    });

    it('should search by name', async () => {
      repository.findAndCount.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'Test',
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOneBySku', () => {
    it('should return a product by SKU', async () => {
      const productWithSku = createProduct({
        index: 1,
        overrides: { sku: 'TEST-001' },
      });
      repository.findOne.mockResolvedValue(productWithSku);
      const result = await service.findOneBySku('TEST-001');
      expect(result.sku).toBe('TEST-001');
    });

    it('should throw NotFoundException for non-existent SKU', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOneBySku('NON-EXISTENT')).rejects.toThrow(NotFoundException);
    });
  });

  describe('count', () => {
    it('should return total product count', async () => {
      repository.count.mockResolvedValue(50);
      const result = await service.count();
      expect(result).toBe(50);
    });
  });

  describe('countByCategory', () => {
    it('should return count for specific category', async () => {
      repository.count.mockResolvedValue(25);
      const result = await service.countByCategory('Electronics');
      expect(result).toBe(25);
    });
  });

  describe('findByBarcode', () => {
    it('should find product by barcode', async () => {
      const productWithBarcode = createProduct({
        index: 1,
        overrides: { barcode: '5901234123457' },
      });
      repository.findOne.mockResolvedValue(productWithBarcode);
      const result = await service.findByBarcode('5901234123457');
      expect(result.barcode).toBe('5901234123457');
    });

    it('should throw NotFoundException for invalid barcode', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findByBarcode('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findLowStock', () => {
    it('should return products below threshold', async () => {
      const lowStockProduct = createProduct({
        index: 1,
        overrides: { quantity: 5 },
      });
      repository.find.mockResolvedValue([lowStockProduct]);

      const result = await service.findLowStock(10);
      expect(result).toHaveLength(1);
    });
  });
});
