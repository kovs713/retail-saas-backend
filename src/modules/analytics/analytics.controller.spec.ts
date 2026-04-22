import { AuthGuard, RolesGuard } from '@/common/guards';
import { TenantContext } from '@/common/types';
import { mockAuthGuard, mockGuard } from '@/common/utils';
import { ProductRepository } from '@/modules/product/repositories';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: DeepMocked<AnalyticsService>;
  let productRepository: DeepMocked<ProductRepository>;

  const mockTenantContext: TenantContext = {
    shopId: 'shop-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: createMock<AnalyticsService>(),
        },
        {
          provide: ProductRepository,
          useValue: createMock<ProductRepository>(),
        },
        {
          provide: JwtService,
          useValue: createMock<JwtService>(),
        },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(
        mockAuthGuard({
          sub: 'user-1',
          email: 'test@test.com',
          shopId: 'shop-1',
          role: 'owner',
        }),
      )
      .overrideGuard(RolesGuard)
      .useValue(mockGuard())
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    analyticsService = module.get(AnalyticsService);
    productRepository = module.get(ProductRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getChatStats', () => {
    it('should return chat stats for the tenant shop within date range', async () => {
      const mockStats = [{ id: 'chat-1' }] as any;
      analyticsService.getChatStats.mockResolvedValue(mockStats);

      const result = await controller.getChatStats(
        '2024-01-01',
        '2024-01-31',
        mockTenantContext,
      );

      expect(result).toEqual({ success: true, data: mockStats });
      expect(analyticsService.getChatStats).toHaveBeenCalledWith(
        'shop-1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
    });
  });

  describe('getTopQuestions', () => {
    it('should return top questions with default limit', async () => {
      const mockQuestions = [{ question: 'What?', count: '5' }];
      analyticsService.getTopQuestions.mockResolvedValue(mockQuestions);

      const result = await controller.getTopQuestions(
        undefined,
        mockTenantContext,
      );

      expect(result).toEqual({ success: true, data: mockQuestions });
      expect(analyticsService.getTopQuestions).toHaveBeenCalledWith(
        'shop-1',
        10,
      );
    });

    it('should return top questions with custom limit', async () => {
      const mockQuestions = [{ question: 'What?', count: '5' }];
      analyticsService.getTopQuestions.mockResolvedValue(mockQuestions);

      await controller.getTopQuestions(5, mockTenantContext);

      expect(analyticsService.getTopQuestions).toHaveBeenCalledWith(
        'shop-1',
        5,
      );
    });
  });

  describe('getStorefrontViews', () => {
    it('should return storefront view count for the tenant shop', async () => {
      analyticsService.getStorefrontViewCount.mockResolvedValue(42);

      const result = await controller.getStorefrontViews(
        '2024-01-01',
        '2024-01-31',
        mockTenantContext,
      );

      expect(result).toEqual({ success: true, data: 42 });
      expect(analyticsService.getStorefrontViewCount).toHaveBeenCalledWith(
        'shop-1',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
    });
  });

  describe('getStockReport', () => {
    it('should generate CSV with products and send response', async () => {
      const mockProducts = [
        {
          sku: 'SKU001',
          name: 'Product 1',
          category: { name: 'Category 1' },
          price: 100,
          quantity: 10,
        },
        {
          sku: 'SKU002',
          name: 'Product 2',
          category: null,
          price: 200,
          quantity: 5,
        },
      ];
      productRepository.findAll.mockResolvedValue([mockProducts as any, 2]);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.getStockReport(mockRes as any, mockTenantContext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="stock-report-shop-1.csv"',
      );
      expect(mockRes.send).toHaveBeenCalledWith(
        '\uFEFFSKU,Name,Category,Price,Quantity\nSKU001,Product 1,Category 1,100.00,10\nSKU002,Product 2,"",200.00,5',
      );
    });

    it('should escape CSV fields containing commas, quotes, or newlines', async () => {
      const mockProducts = [
        {
          sku: 'SKU,001',
          name: 'Product "Special"',
          category: { name: 'Cat\negory' },
          price: 100,
          quantity: 10,
        },
      ];
      productRepository.findAll.mockResolvedValue([mockProducts as any, 1]);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.getStockReport(mockRes as any, mockTenantContext);

      expect(mockRes.send).toHaveBeenCalledWith(
        '\uFEFFSKU,Name,Category,Price,Quantity\n"SKU,001","Product ""Special""","Cat\negory",100.00,10',
      );
    });

    it('should handle empty products list', async () => {
      productRepository.findAll.mockResolvedValue([[], 0]);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.getStockReport(mockRes as any, mockTenantContext);

      expect(mockRes.send).toHaveBeenCalledWith(
        '\uFEFFSKU,Name,Category,Price,Quantity\n',
      );
    });
  });
});
