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

    controller = module.get(PublicShopController);
    shopService = module.get(ShopService);
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
});
