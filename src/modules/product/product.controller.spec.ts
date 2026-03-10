import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { createProduct } from './util/product.factory';

import { NotFoundException } from '@nestjs/common';
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

describe('ProductController', () => {
  let controller: ProductController;
  let service: jest.Mocked<ProductService>;

  const mockProduct = createProduct({
    id: 'prod_1',
    index: 1,
    includeOptional: true,
  });

  beforeEach(async () => {
    const mockProductService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneBySku: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      restore: jest.fn(),
      updateStock: jest.fn(),
      adjustStock: jest.fn(),
      count: jest.fn(),
      findByBarcode: jest.fn(),
      findLowStock: jest.fn(),
    } as unknown as jest.Mocked<ProductService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: mockProductService }],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      service.create.mockResolvedValue(mockProduct);
      const result = await controller.create({
        sku: 'PROD-001',
        name: 'Test',
        price: 99.99,
        quantity: 100,
      });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.sku).toBe(mockProduct.sku);
      expect(result.message).toBe('Product created successfully');
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      service.findAll.mockResolvedValue({
        data: [mockProduct],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
      const result = await controller.findAll({});
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      service.findOne.mockResolvedValue(mockProduct);
      const result = await controller.findOne('prod_1');
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(mockProduct.id);
    });

    it('should handle NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException('Product not found'));
      await expect(controller.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneBySku', () => {
    it('should return a product by SKU', async () => {
      service.findOneBySku.mockResolvedValue(mockProduct);
      const result = await controller.findOneBySku(mockProduct.sku);
      expect(result.data).toBeDefined();
      expect(result.data.sku).toBe(mockProduct.sku);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      service.update.mockResolvedValue({ ...mockProduct, name: 'Updated' });
      const result = await controller.update('prod_1', { name: 'Updated' });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.message).toBe('Product updated successfully');
    });

    it('should handle NotFoundException', async () => {
      service.update.mockRejectedValue(new NotFoundException('Product not found'));
      await expect(controller.update('non-existent', { name: 'Updated' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a product', async () => {
      service.remove.mockResolvedValue(undefined);
      const result = await controller.remove('prod_1');
      expect(result.success).toBe(true);
    });
  });

  describe('restore', () => {
    it('should restore a product', async () => {
      service.restore.mockResolvedValue({
        message: 'Product restored successfully',
      });
      const result = await controller.restore('prod_1');
      expect(result.data).toBeDefined();
      expect(result.data.message).toBe('Product restored successfully');
    });
  });

  describe('updateStock', () => {
    it('should update stock', async () => {
      service.updateStock.mockResolvedValue({ ...mockProduct, quantity: 150 });
      const result = await controller.updateStock('prod_1', { quantity: 150 });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.data.quantity).toBe(150);
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock', async () => {
      service.adjustStock.mockResolvedValue({ ...mockProduct, quantity: 150 });
      const result = await controller.adjustStock('prod_1', { adjustment: 50 });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('findByBarcode', () => {
    it('should find product by barcode', async () => {
      service.findByBarcode.mockResolvedValue(mockProduct);
      const barcode = mockProduct.barcode ?? 'test-barcode';
      const result = await controller.findByBarcode(barcode);
      expect(result.data).toBeDefined();
      expect(result.data.barcode).toBeDefined();
    });

    it('should handle NotFoundException', async () => {
      service.findByBarcode.mockRejectedValue(new NotFoundException('Product not found'));
      await expect(controller.findByBarcode('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      service.count.mockResolvedValue(100);
      service.findLowStock.mockResolvedValue([mockProduct]);
      const result = await controller.getStats();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.totalProducts).toBe(100);
      expect(result.data.lowStockCount).toBe(1);
    });
  });

  describe('getLowStock', () => {
    it('should return low stock products', async () => {
      service.findLowStock.mockResolvedValue([mockProduct]);
      const result = await controller.getLowStock(50);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});
