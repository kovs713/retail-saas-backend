import { Product } from '@/modules/product/entities/product.entity';
import { ProductService } from '@/modules/product/product.service';

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * Integration tests for ProductService with TypeORM repository
 * NOTE: These tests use mocked TypeORM - they are NOT true integration tests.
 * This file serves as a contract test verifying service-repository interaction.
 * True integration tests would require a real database connection.
 */

jest.mock('@/core/logger/app-logger.service', () => ({
  AppLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
}));

describe('ProductService Integration', () => {
  let service: ProductService;
  let repository: jest.Mocked<Repository<Product>>;

  const sampleProducts = [
    {
      id: 'prod_001',
      sku: 'ELEC-001',
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse',
      price: 29.99,
      cost: 15.0,
      quantity: 150,
      category: 'Electronics',
      barcode: '5901234123457',
      images: ['https://example.com/mouse.jpg'],
      metadata: { brand: 'TechBrand' },
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      deletedAt: null,
    },
    {
      id: 'prod_002',
      sku: 'ELEC-002',
      name: 'Mechanical Keyboard',
      price: 89.99,
      quantity: 75,
      category: 'Electronics',
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16'),
      deletedAt: null,
    },
  ];

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
      existsBy: jest.fn(),
      increment: jest.fn(),
      findAndCount: jest.fn(),
      target: Product,
      manager: {} as unknown as Repository<Product>['manager'],
      queryRunner: null,
    } as unknown as jest.Mocked<Repository<Product>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductService, { provide: getRepositoryToken(Product), useValue: mockRepository }],
    }).compile();

    service = module.get<ProductService>(ProductService);
    repository = module.get(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Product CRUD Operations', () => {
    describe('create', () => {
      it('should create a product with all fields', async () => {
        const newProduct = {
          sku: 'NEW-001',
          name: 'New Product',
          price: 59.99,
          quantity: 50,
        };
        const created = {
          ...newProduct,
          id: 'prod_003',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };

        repository.existsBy.mockResolvedValue(false);
        repository.create.mockReturnValue(created as Product);
        repository.save.mockResolvedValue(created as Product);

        const result = await service.create(newProduct);
        expect(result.sku).toBe('NEW-001');
        expect(result.id).toBe('prod_003');
      });

      it('should prevent duplicate SKU', async () => {
        repository.existsBy.mockResolvedValue(true);
        await expect(
          service.create({
            sku: 'ELEC-001',
            name: 'Duplicate',
            price: 39.99,
            quantity: 20,
          }),
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('findAll', () => {
      it('should return paginated products', async () => {
        repository.findAndCount.mockResolvedValue([sampleProducts as Product[], sampleProducts.length]);

        const result = await service.findAll({ page: 1, limit: 10 });
        expect(result.data).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.totalPages).toBe(1);
      });

      it('should filter by category', async () => {
        repository.findAndCount.mockResolvedValue([sampleProducts as Product[], sampleProducts.length]);
        const result = await service.findAll({
          page: 1,
          limit: 10,
          category: 'Electronics',
        });
        expect(result.data).toHaveLength(2);
      });

      it('should handle empty results', async () => {
        repository.findAndCount.mockResolvedValue([[], 0]);
        const result = await service.findAll({ page: 1, limit: 10 });
        expect(result.data).toHaveLength(0);
        expect(result.total).toBe(0);
      });
    });

    describe('findOne', () => {
      it('should return product by ID', async () => {
        repository.findOne.mockResolvedValue(sampleProducts[0] as Product);
        const result = await service.findOne('prod_001');
        expect(result.sku).toBe('ELEC-001');
      });

      it('should throw NotFoundException for non-existent ID', async () => {
        repository.findOne.mockResolvedValue(null);
        await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      });
    });

    describe('update', () => {
      it('should update product fields', async () => {
        repository.findOne.mockResolvedValue(sampleProducts[0] as Product);
        repository.existsBy.mockResolvedValue(false);
        repository.update.mockResolvedValue({
          affected: 1,
          generatedMaps: [],
          raw: [],
        });
        repository.findOne.mockResolvedValue({
          ...sampleProducts[0],
          name: 'Updated',
        } as Product);

        const result = await service.update('prod_001', { name: 'Updated' });
        expect(result.name).toBe('Updated');
      });

      it('should prevent updating to existing SKU', async () => {
        repository.findOne.mockResolvedValue(sampleProducts[0] as Product);
        repository.existsBy.mockResolvedValue(true);
        await expect(service.update('prod_001', { sku: 'ELEC-002' })).rejects.toThrow(ConflictException);
      });
    });

    describe('remove', () => {
      it('should soft delete a product', async () => {
        repository.findOne.mockResolvedValue(sampleProducts[0] as Product);
        repository.softDelete.mockResolvedValue({ affected: 1 } as never);
        await service.remove('prod_001');
        expect(repository.softDelete).toHaveBeenCalledWith('prod_001');
      });
    });
  });

  describe('Stock Management', () => {
    describe('updateStock', () => {
      it('should update stock quantity', async () => {
        repository.findOne.mockResolvedValue(sampleProducts[0] as Product);
        repository.update.mockResolvedValue({ affected: 1 } as never);
        repository.findOne.mockResolvedValue({
          ...sampleProducts[0],
          quantity: 200,
        } as Product);

        const result = await service.updateStock('prod_001', 200);
        expect(result.quantity).toBe(200);
      });
    });

    describe('adjustStock', () => {
      it('should increase stock', async () => {
        repository.findOne.mockResolvedValue(sampleProducts[0] as Product);
        repository.increment.mockResolvedValue({ affected: 1 } as never);
        repository.findOne.mockResolvedValue({
          ...sampleProducts[0],
          quantity: 200,
        } as Product);

        const result = await service.adjustStock('prod_001', 50);
        expect(result.quantity).toBe(200);
      });

      it('should decrease stock', async () => {
        repository.findOne.mockResolvedValue(sampleProducts[0] as Product);
        repository.increment.mockResolvedValue({ affected: 1 } as never);
        repository.findOne.mockResolvedValue({
          ...sampleProducts[0],
          quantity: 100,
        } as Product);

        const result = await service.adjustStock('prod_001', -50);
        expect(result.quantity).toBe(100);
      });
    });

    describe('findLowStock', () => {
      it('should return products below threshold', async () => {
        repository.find.mockResolvedValue([sampleProducts[1]] as Product[]);
        const result = await service.findLowStock(100);
        expect(result).toHaveLength(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in product name', async () => {
      const specialProduct = {
        sku: 'SPEC-001',
        name: 'Product with "quotes"',
        price: 19.99,
        quantity: 10,
      };
      const created = {
        ...specialProduct,
        id: 'prod_spec',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      repository.existsBy.mockResolvedValue(false);
      repository.create.mockReturnValue(created as Product);
      repository.save.mockResolvedValue(created as Product);

      const result = await service.create(specialProduct);
      expect(result.name).toContain('quotes');
    });

    it('should handle zero quantity', async () => {
      const zeroProduct = {
        sku: 'ZERO-001',
        name: 'Out of Stock',
        price: 29.99,
        quantity: 0,
      };
      const created = {
        ...zeroProduct,
        id: 'prod_zero',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      repository.existsBy.mockResolvedValue(false);
      repository.create.mockReturnValue(created as Product);
      repository.save.mockResolvedValue(created as Product);

      const result = await service.create(zeroProduct);
      expect(result.quantity).toBe(0);
    });
  });
});
