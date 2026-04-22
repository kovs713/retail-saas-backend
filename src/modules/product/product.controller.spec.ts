import { AuthGuard, RolesGuard } from '@/common/guards';
import { createMockTenantContext, mockAuthGuard } from '@/common/utils';
import { createProduct } from '@/core/database/factories';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock as createExpressMock } from '@golevelup/ts-jest';
import type { Request, Response } from 'express';
import { Readable } from 'stream';

describe('ProductController', () => {
  let controller: ProductController;
  let service: DeepMocked<ProductService>;

  const mockProduct = createProduct({
    id: 'prod_1',
    index: 1,
  });

  const tenantContext = createMockTenantContext();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProductService,
          useValue: createMock<ProductService>(),
        },
      ],
      controllers: [ProductController],
    })
      .overrideGuard(AuthGuard)
      .useValue(
        mockAuthGuard({
          sub: 'user-123',
          email: 'test@example.com',
          shopId: 'shop-456',
          role: 'owner',
        }),
      )
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      service.create.mockResolvedValue(mockProduct);
      const result = await controller.create(
        {
          sku: 'PROD-001',
          name: 'Test',
          price: 99.99,
          quantity: 100,
        },
        tenantContext,
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.sku).toBe(mockProduct.sku);
      expect(result.message).toBe('Product created successfully');
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      service.findAll.mockResolvedValue({
        success: true,
        data: [mockProduct],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
      const result = await controller.findAll({}, tenantContext);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.pagination?.total).toBe(1);
      expect(result.pagination?.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      service.findOne.mockResolvedValue(mockProduct);
      const result = await controller.findOne('prod_1', tenantContext);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(mockProduct.id);
    });

    it('should handle NotFoundException', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Product not found'),
      );
      await expect(
        controller.findOne('non-existent', tenantContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneBySku', () => {
    it('should return a product by SKU', async () => {
      service.findOneBySku.mockResolvedValue(mockProduct);
      const result = await controller.findOneBySku(
        mockProduct.sku,
        tenantContext,
      );
      expect(result.data).toBeDefined();
      expect(result.data?.sku).toBe(mockProduct.sku);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      service.update.mockResolvedValue({ ...mockProduct, name: 'Updated' });
      const result = await controller.update(
        'prod_1',
        { name: 'Updated' },
        tenantContext,
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.message).toBe('Product updated successfully');
    });

    it('should handle NotFoundException', async () => {
      service.update.mockRejectedValue(
        new NotFoundException('Product not found'),
      );
      await expect(
        controller.update('non-existent', { name: 'Updated' }, tenantContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a product', async () => {
      service.remove.mockResolvedValue(undefined);
      const result = await controller.remove('prod_1', tenantContext);
      expect(result.success).toBe(true);
    });
  });

  describe('restore', () => {
    it('should restore a product', async () => {
      service.restore.mockResolvedValue({
        message: 'Product restored successfully',
      });
      const result = await controller.restore('prod_1', tenantContext);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Product restored successfully');
    });
  });

  describe('updateStock', () => {
    it('should update stock', async () => {
      service.updateStock.mockResolvedValue({ ...mockProduct, quantity: 150 });
      const result = await controller.updateStock(
        'prod_1',
        { quantity: 150 },
        tenantContext,
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.quantity).toBe(150);
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock', async () => {
      service.adjustStock.mockResolvedValue({ ...mockProduct, quantity: 150 });
      const result = await controller.adjustStock(
        'prod_1',
        { adjustment: 50 },
        tenantContext,
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.quantity).toBe(150);
    });
  });

  describe('createImageUploadUrl', () => {
    it('should return presigned upload payload', async () => {
      service.createImageUploadUrl.mockResolvedValue({
        uploadUrl: 'https://upload-url',
        publicUrl: '/public/media/shop-1/products/prod_1/photo.jpg',
        key: 'products/prod_1/images/photo.jpg',
      });

      const result = await controller.createImageUploadUrl(
        'prod_1',
        { fileName: 'photo.jpg' },
        tenantContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.uploadUrl).toBe('https://upload-url');
    });
  });

  describe('uploadImage', () => {
    it('should upload image and return persisted payload', async () => {
      const file = {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('image-data'),
      } as Express.Multer.File;

      service.uploadProductImage.mockResolvedValue({
        key: 'products/prod_1/images/photo.jpg',
        publicUrl: '/public/media/shop-1/products/prod_1/photo.jpg',
        contentType: 'image/jpeg',
        size: 1024,
        etag: 'etag-1',
      });

      const result = await controller.uploadImage(
        'prod_1',
        file,
        tenantContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.publicUrl).toBe(
        '/public/media/shop-1/products/prod_1/photo.jpg',
      );
      expect(service.uploadProductImage).toHaveBeenCalledWith(
        'prod_1',
        file,
        tenantContext.shopId,
      );
    });
  });

  describe('getPrivateImage', () => {
    it('should stream image for authenticated owner/admin', async () => {
      const req = createExpressMock<Request>();
      const res = createExpressMock<Response>();
      const stream = new Readable({ read() {} });
      jest.spyOn(stream, 'pipe').mockReturnValue(res as any);

      service.getPrivateImageStream.mockResolvedValue({
        stream,
        contentType: 'image/jpeg',
        etag: 'etag-1',
        lastModified: new Date('2025-01-01T00:00:00.000Z'),
      });

      await controller.getPrivateImage(
        'prod_1',
        'photo.jpg',
        tenantContext,
        req,
        res,
      );

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'private, max-age=0, must-revalidate',
      );
      expect(stream.pipe).toHaveBeenCalledWith(res);
    });
  });

  describe('deleteImage', () => {
    it('should delete product image', async () => {
      service.deleteImage.mockResolvedValue();

      const result = await controller.deleteImage(
        'prod_1',
        'photo.jpg',
        tenantContext,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Product image deleted successfully');
    });
  });

  describe('findByBarcode', () => {
    it('should find product by barcode', async () => {
      service.findByBarcode.mockResolvedValue(mockProduct);
      const barcode = mockProduct.barcode ?? 'test-barcode';
      const result = await controller.findByBarcode(barcode, tenantContext);
      expect(result.data).toBeDefined();
      expect(result.data?.barcode).toBeDefined();
    });

    it('should handle NotFoundException', async () => {
      service.findByBarcode.mockRejectedValue(
        new NotFoundException('Product not found'),
      );
      await expect(
        controller.findByBarcode('invalid', tenantContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      service.count.mockResolvedValue(100);
      service.findLowStock.mockResolvedValue([mockProduct]);
      const result = await controller.getStats(tenantContext);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.totalProducts).toBe(100);
      expect(result.data!.lowStockCount).toBe(1);
    });
  });

  describe('getLowStock', () => {
    it('should return low stock products', async () => {
      service.findLowStock.mockResolvedValue([mockProduct]);
      const result = await controller.getLowStock(50, tenantContext);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});
