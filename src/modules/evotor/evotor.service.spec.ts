import { CacheService } from '@/core/cache/cache.service';
import { OrderRepository } from '@/modules/order/repositories';
import { CatalogIndexService } from '@/modules/product/catalog-index.service';
import { ProductRepository } from '@/modules/product/repositories';
import { ShopService } from '@/modules/shop/shop.service';
import { EvotorApiService } from './evotor-api.service';
import { EvotorService } from './evotor.service';
import { EvotorIntegrationRepository } from './repositories';
import { EvotorIntegration } from './entities';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('EvotorService', () => {
  let service: EvotorService;
  let shopService: DeepMocked<ShopService>;
  let orderRepository: DeepMocked<OrderRepository>;
  let evotorApiService: DeepMocked<EvotorApiService>;
  let cacheService: DeepMocked<CacheService>;
  let integrationRepository: DeepMocked<EvotorIntegrationRepository>;

  const mockIntegration = {
    id: 'int-1',
    shopId: 'shop-1',
    externalUserId: 'evotor-user-1',
    externalStoreId: 'store-1',
    status: 'connected',
    provider: 'evotor',
  } as EvotorIntegration;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvotorService,
        {
          provide: EvotorIntegrationRepository,
          useValue: createMock<EvotorIntegrationRepository>(),
        },
        { provide: ShopService, useValue: createMock<ShopService>() },
        { provide: ProductRepository, useValue: createMock<ProductRepository>() },
        { provide: OrderRepository, useValue: createMock<OrderRepository>() },
        { provide: EvotorApiService, useValue: createMock<EvotorApiService>() },
        {
          provide: CatalogIndexService,
          useValue: createMock<CatalogIndexService>(),
        },
        { provide: CacheService, useValue: createMock<CacheService>() },
      ],
    }).compile();

    service = module.get(EvotorService);
    shopService = module.get(ShopService);
    orderRepository = module.get(OrderRepository);
    evotorApiService = module.get(EvotorApiService);
    cacheService = module.get(CacheService);
    integrationRepository = module.get(EvotorIntegrationRepository);

    cacheService.generateKey.mockImplementation((...parts) =>
      parts.filter((part) => part !== undefined && part !== null).join(':'),
    );
    cacheService.get.mockResolvedValue(null);
    integrationRepository.findOne.mockResolvedValue(mockIntegration);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSellEventsCount', () => {
    it('counts via bridge inbox events API (single request, no full scan)', async () => {
      evotorApiService.listAdminInboxEvents.mockResolvedValue({
        items: [],
        total: 312,
        skip: 0,
        take: 1,
      });

      const result = await service.getSellEventsCount(
        'shop-1',
        '2026-05-01T00:00:00.000Z',
        '2026-05-24T00:00:00.000Z',
      );

      expect(result).toEqual({ totalCount: 312, periodCount: 312 });
      expect(evotorApiService.listAdminInboxEvents).toHaveBeenCalledTimes(2);
      expect(evotorApiService.listAdminInboxEvents).toHaveBeenCalledWith({
        evotorUserId: 'evotor-user-1',
        eventType: 'evotor.document.sell',
        skip: 0,
        take: 1,
      });
      expect(evotorApiService.listAdminInboxEvents).toHaveBeenCalledWith({
        evotorUserId: 'evotor-user-1',
        eventType: 'evotor.document.sell',
        skip: 0,
        take: 1,
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-24T00:00:00.000Z',
      });
    });

    it('returns cached count', async () => {
      cacheService.get.mockResolvedValue({ totalCount: 4, periodCount: 4 });

      await expect(service.getSellEventsCount('shop-1')).resolves.toEqual({
        totalCount: 4,
        periodCount: 4,
      });
      expect(evotorApiService.listAdminInboxEvents).not.toHaveBeenCalled();
    });

    it('returns zero when no evotorUserId', async () => {
      integrationRepository.findOne.mockResolvedValue({
        ...mockIntegration,
        externalUserId: null,
      } as any);

      await expect(service.getSellEventsCount('shop-1')).resolves.toEqual({
        totalCount: 0,
        periodCount: 0,
      });
      expect(evotorApiService.listAdminInboxEvents).not.toHaveBeenCalled();
    });

    it('reuses total as period when no date filter', async () => {
      evotorApiService.listAdminInboxEvents.mockResolvedValue({
        items: [],
        total: 100,
        skip: 0,
        take: 1,
      });

      const result = await service.getSellEventsCount('shop-1');

      expect(result).toEqual({ totalCount: 100, periodCount: 100 });
      expect(evotorApiService.listAdminInboxEvents).toHaveBeenCalledTimes(1);
    });
  });
});
