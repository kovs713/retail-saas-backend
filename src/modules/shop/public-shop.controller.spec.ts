import { AnalyticsService } from '@/modules/analytics/analytics.service';
import { CategoryRepository, ProductRepository } from '@/modules/product/repositories';
import { PublicShopController } from './public-shop.controller';
import { ShopService } from './shop.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('PublicShopController', () => {
  let controller: PublicShopController;
  let shopService: DeepMocked<ShopService>;
  let productRepository: DeepMocked<ProductRepository>;
  let categoryRepository: DeepMocked<CategoryRepository>;
  let analyticsService: DeepMocked<AnalyticsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicShopController],
      providers: [
        {
          provide: ShopService,
          useValue: createMock<ShopService>(),
        },
        {
          provide: ProductRepository,
          useValue: createMock<ProductRepository>(),
        },
        {
          provide: CategoryRepository,
          useValue: createMock<CategoryRepository>(),
        },
        {
          provide: AnalyticsService,
          useValue: createMock<AnalyticsService>(),
        },
      ],
    }).compile();

    controller = module.get<PublicShopController>(PublicShopController);
    shopService = module.get<DeepMocked<ShopService>>(ShopService);
    productRepository = module.get<DeepMocked<ProductRepository>>(ProductRepository);
    categoryRepository = module.get<DeepMocked<CategoryRepository>>(CategoryRepository);
    analyticsService = module.get<DeepMocked<AnalyticsService>>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should reject inactive shops with bad request', async () => {
    shopService.findBySlug.mockResolvedValue({
      id: 'shop-1',
      slug: 'shop-1',
      isActive: false,
    } as any);

    await expect(controller.getStorefront('shop-1')).rejects.toThrow(BadRequestException);
  });

  it('should return storefront data with products and categories', async () => {
    const mockShop = {
      id: 'shop-1',
      slug: 'test-shop',
      isActive: true,
      name: 'Test Shop',
      description: 'Test Description',
      address: '123 Test St',
      phone: '+1234567890',
      workingHours: '9-5',
      logoUrl: 'https://example.com/logo.png',
      bannerUrl: 'https://example.com/banner.png',
    };

    const mockProducts = [
      {
        id: 'product-1',
        sku: 'SKU001',
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        quantity: 50,
        category: { id: 'cat-1', name: 'Test Category' },
        images: ['https://example.com/image1.jpg'],
      },
    ];

    const mockCategories = [
      {
        id: 'cat-1',
        name: 'Test Category',
        slug: 'test-category',
      },
    ];

    shopService.findBySlug.mockResolvedValue(mockShop as any);
    productRepository.findAll.mockResolvedValue([mockProducts as any, 1]);
    categoryRepository.findAllByShop.mockResolvedValue(mockCategories as any);

    const result = await controller.getStorefront('test-shop');

    expect(result.success).toBe(true);
    expect(result.data.shop.id).toBe('shop-1');
    expect(result.data.shop.name).toBe('Test Shop');
    expect(result.data.products).toHaveLength(1);
    expect(result.data.products[0].availability).toBe('IN_STOCK');
    expect(result.data.products[0].category).toBe('Test Category');
    expect(result.data.categories).toHaveLength(1);
    expect(result.data.totalProducts).toBe(1);
    expect(result.data.timestamp).toBeDefined();
  });

  it('should return null category for products without category', async () => {
    const mockShop = {
      id: 'shop-1',
      slug: 'test-shop',
      isActive: true,
    };

    const mockProducts = [
      {
        id: 'product-1',
        sku: 'SKU001',
        name: 'No Category Product',
        price: 50,
        quantity: 20,
        category: null,
        images: [],
      },
    ];

    shopService.findBySlug.mockResolvedValue(mockShop as any);
    productRepository.findAll.mockResolvedValue([mockProducts as any, 1]);
    categoryRepository.findAllByShop.mockResolvedValue([]);

    const result = await controller.getStorefront('test-shop');

    expect(result.data.products[0].category).toBeNull();
  });

  it('should mark products as LOW_STOCK when quantity < 10', async () => {
    const mockShop = {
      id: 'shop-1',
      slug: 'test-shop',
      isActive: true,
    };

    const mockProducts = [
      {
        id: 'product-1',
        sku: 'SKU001',
        name: 'Low Stock Product',
        price: 50,
        quantity: 5,
        category: null,
        images: [],
      },
    ];

    shopService.findBySlug.mockResolvedValue(mockShop as any);
    productRepository.findAll.mockResolvedValue([mockProducts as any, 1]);
    categoryRepository.findAllByShop.mockResolvedValue([]);

    const result = await controller.getStorefront('test-shop');

    expect(result.data.products[0].availability).toBe('LOW_STOCK');
  });

  it('should mark products as OUT_OF_STOCK when quantity <= 0', async () => {
    const mockShop = {
      id: 'shop-1',
      slug: 'test-shop',
      isActive: true,
    };

    const mockProducts = [
      {
        id: 'product-1',
        sku: 'SKU001',
        name: 'Out of Stock Product',
        price: 50,
        quantity: 0,
        category: null,
        images: [],
      },
    ];

    shopService.findBySlug.mockResolvedValue(mockShop as any);
    productRepository.findAll.mockResolvedValue([mockProducts as any, 1]);
    categoryRepository.findAllByShop.mockResolvedValue([]);

    const result = await controller.getStorefront('test-shop');

    expect(result.data.products[0].availability).toBe('OUT_OF_STOCK');
  });

  it('should still return storefront data when analytics logging fails', async () => {
    const mockShop = {
      id: 'shop-1',
      slug: 'test-shop',
      isActive: true,
    };

    shopService.findBySlug.mockResolvedValue(mockShop as any);
    productRepository.findAll.mockResolvedValue([[], 0]);
    categoryRepository.findAllByShop.mockResolvedValue([]);
    analyticsService.logStorefrontView.mockRejectedValue(new Error('analytics down'));

    const result = await controller.getStorefront('test-shop');

    expect(result.success).toBe(true);
    expect(result.data.shop.id).toBe('shop-1');
  });
});
