import { AuthGuard, RolesGuard } from '@/common/guards';
import { ProductController } from '@/modules/product/product.controller';
import { ProductService } from '@/modules/product/product.service';

import { CanActivate, ConflictException, INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';

const mockAuthGuard: CanActivate = {
  canActivate: (context) => {
    const req = context.switchToHttp().getRequest();
    req.user = { sub: 'user-1', shopId: 'shop-1', role: 'owner', email: 'test@example.com' };
    return true;
  },
};

const mockRolesGuard: CanActivate = {
  canActivate: () => true,
};

describe('Product E2E', () => {
  let app: INestApplication;
  let productService: jest.Mocked<ProductService>;

  const mockProduct = {
    id: 'prod-1',
    sku: 'TEST-001',
    name: 'Test Product',
    price: 29.99,
    quantity: 100,
    description: 'A test product',
    shopId: 'shop-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    productService = {
      create: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      restore: jest.fn(),
      updateStock: jest.fn(),
      adjustStock: jest.fn(),
      findOneBySku: jest.fn(),
      findByBarcode: jest.fn(),
      count: jest.fn(),
      findLowStock: jest.fn(),
      getCategories: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      createImageUploadUrl: jest.fn(),
      deleteImage: jest.fn(),
    } as unknown as jest.Mocked<ProductService>;

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: productService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /products', () => {
    it('should create a product', async () => {
      productService.create.mockResolvedValue(mockProduct as any);

      const response = await request(app.getHttpServer())
        .post('/products')
        .send({ sku: 'TEST-001', name: 'Test Product', price: 29.99, quantity: 100 })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sku).toBe('TEST-001');
      expect(response.body.data.name).toBe('Test Product');
      expect(response.body.message).toBe('Product created successfully');
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app.getHttpServer()).post('/products').send({ sku: '' }).expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 409 for duplicate SKU', async () => {
      productService.create.mockRejectedValue(new ConflictException('SKU already exists'));

      await request(app.getHttpServer())
        .post('/products')
        .send({ sku: 'EXISTING', name: 'Test', price: 10, quantity: 1 })
        .expect(409);
    });
  });

  describe('GET /products', () => {
    it('should return paginated products', async () => {
      productService.findAll.mockResolvedValue({
        success: true,
        data: [mockProduct] as any[],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await request(app.getHttpServer()).get('/products').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.total).toBe(1);
    });
  });

  describe('GET /products/:id', () => {
    it('should return a product by ID', async () => {
      productService.findOne.mockResolvedValue(mockProduct as any);

      const response = await request(app.getHttpServer()).get('/products/prod-1').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('prod-1');
      expect(response.body.data.name).toBe('Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      productService.findOne.mockRejectedValue(new NotFoundException('Product not found'));

      await request(app.getHttpServer()).get('/products/non-existent').expect(404);
    });
  });

  describe('PATCH /products/:id', () => {
    it('should update a product', async () => {
      productService.update.mockResolvedValue({ ...mockProduct, name: 'Updated' } as any);

      const response = await request(app.getHttpServer())
        .patch('/products/prod-1')
        .send({ name: 'Updated' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated');
    });
  });

  describe('DELETE /products/:id', () => {
    it('should soft delete a product', async () => {
      productService.remove.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer()).delete('/products/prod-1').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product deleted successfully');
    });
  });

  describe('PATCH /products/:id/stock', () => {
    it('should update stock quantity', async () => {
      productService.updateStock.mockResolvedValue({ ...mockProduct, quantity: 200 } as any);

      const response = await request(app.getHttpServer())
        .patch('/products/prod-1/stock')
        .send({ quantity: 200 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(200);
    });
  });

  describe('PATCH /products/:id/stock/adjust', () => {
    it('should adjust stock', async () => {
      productService.adjustStock.mockResolvedValue({ ...mockProduct, quantity: 150 } as any);

      const response = await request(app.getHttpServer())
        .patch('/products/prod-1/stock/adjust')
        .send({ adjustment: 50 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(150);
    });
  });

  describe('GET /products/stats', () => {
    it('should return product statistics', async () => {
      productService.count.mockResolvedValue(50);
      productService.findLowStock.mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/products/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalProducts).toBe(50);
      expect(response.body.data.lowStockCount).toBe(0);
    });
  });

  describe('GET /products/low-stock', () => {
    it('should return low stock products', async () => {
      productService.findLowStock.mockResolvedValue([mockProduct] as any[]);

      const response = await request(app.getHttpServer()).get('/products/low-stock').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });
});
