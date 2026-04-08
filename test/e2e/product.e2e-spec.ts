import { AuthGuard, RolesGuard } from '@/common/guards';
import { mockAuthGuard, mockGuard } from '@/common/utils';
import { createProduct, createTokenPayload } from '@/core/database/factories';
import { ProductController } from '@/modules/product/product.controller';
import { ProductService } from '@/modules/product/product.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConflictException, INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';

describe('Product E2E', () => {
  let app: INestApplication;
  let service: DeepMocked<ProductService>;

  const mockUser = createTokenPayload({ sub: 'user_001', shopId: 'shop_001' });

  const mockProduct = createProduct({
    id: 'prod_001',
    index: 1,
    sku: 'TEST-001',
    name: 'Test Product',
    price: 29.99,
    quantity: 100,
    description: 'A test product',
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [{ provide: ProductService, useValue: createMock<ProductService>() }],
      controllers: [ProductController],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard(mockUser))
      .overrideGuard(RolesGuard)
      .useValue(mockGuard())
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

    service = app.get<DeepMocked<ProductService>>(ProductService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /products', () => {
    it('should create a product', async () => {
      service.create.mockResolvedValue(mockProduct as any);

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
      service.create.mockRejectedValue(new ConflictException('SKU already exists'));

      await request(app.getHttpServer())
        .post('/products')
        .send({ sku: 'EXISTING', name: 'Test', price: 10, quantity: 1 })
        .expect(409);
    });
  });

  describe('GET /products', () => {
    it('should return paginated products', async () => {
      service.findAll.mockResolvedValue({
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
      service.findOne.mockResolvedValue(mockProduct as any);

      const response = await request(app.getHttpServer()).get('/products/prod_001').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('prod_001');
      expect(response.body.data.name).toBe('Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      service.findOne.mockRejectedValue(new NotFoundException('Product not found'));

      await request(app.getHttpServer()).get('/products/non-existent').expect(404);
    });
  });

  describe('PATCH /products/:id', () => {
    it('should update a product', async () => {
      service.update.mockResolvedValue({ ...mockProduct, name: 'Updated' } as any);

      const response = await request(app.getHttpServer())
        .patch('/products/prod_001')
        .send({ name: 'Updated' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated');
    });
  });

  describe('DELETE /products/:id', () => {
    it('should soft delete a product', async () => {
      service.remove.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer()).delete('/products/prod_001').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product deleted successfully');
    });
  });

  describe('PATCH /products/:id/stock', () => {
    it('should update stock quantity', async () => {
      service.updateStock.mockResolvedValue({ ...mockProduct, quantity: 200 } as any);

      const response = await request(app.getHttpServer())
        .patch('/products/prod_001/stock')
        .send({ quantity: 200 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(200);
    });
  });

  describe('PATCH /products/:id/stock/adjust', () => {
    it('should adjust stock', async () => {
      service.adjustStock.mockResolvedValue({ ...mockProduct, quantity: 150 } as any);

      const response = await request(app.getHttpServer())
        .patch('/products/prod_001/stock/adjust')
        .send({ adjustment: 50 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(150);
    });
  });

  describe('GET /products/stats', () => {
    it('should return product statistics', async () => {
      service.count.mockResolvedValue(50);
      service.findLowStock.mockResolvedValue([]);

      const response = await request(app.getHttpServer()).get('/products/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalProducts).toBe(50);
      expect(response.body.data.lowStockCount).toBe(0);
    });
  });

  describe('GET /products/low-stock', () => {
    it('should return low stock products', async () => {
      service.findLowStock.mockResolvedValue([mockProduct] as any[]);

      const response = await request(app.getHttpServer()).get('/products/low-stock').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });
});
