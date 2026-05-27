import { CacheService } from '@/core/cache/cache.service';
import { CatalogIndexService } from '@/modules/product/catalog-index.service';
import { ProductService } from '@/modules/product/product.service';
import { ProductRepository } from '@/modules/product/repositories';
import { EvotorApiService } from './evotor-api.service';
import { EvotorService } from './evotor.service';
import { EvotorIntegrationRepository } from './repositories';
import { EvotorIntegration } from './entities';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('EvotorService', () => {
  let service: EvotorService;
  let evotorApiService: DeepMocked<EvotorApiService>;
  let cacheService: DeepMocked<CacheService>;
  let integrationRepository: DeepMocked<EvotorIntegrationRepository>;
  let productRepository: DeepMocked<ProductRepository>;
  let catalogIndexService: DeepMocked<CatalogIndexService>;
  let productService: DeepMocked<ProductService>;

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
        {
          provide: ProductRepository,
          useValue: createMock<ProductRepository>(),
        },
        { provide: OrderRepository, useValue: createMock<OrderRepository>() },
        { provide: EvotorApiService, useValue: createMock<EvotorApiService>() },
        {
          provide: CatalogIndexService,
          useValue: createMock<CatalogIndexService>(),
        },
        { provide: ProductService, useValue: createMock<ProductService>() },
        { provide: CacheService, useValue: createMock<CacheService>() },
      ],
    }).compile();

    service = module.get(EvotorService);
    evotorApiService = module.get(EvotorApiService);
    cacheService = module.get(CacheService);
    integrationRepository = module.get(EvotorIntegrationRepository);
    productRepository = module.get(ProductRepository);
    catalogIndexService = module.get(CatalogIndexService);
    productService = module.get(ProductService);

    cacheService.generateKey.mockImplementation((...parts) =>
      parts.filter((part) => part !== undefined && part !== null).join(':'),
    );
    cacheService.get.mockResolvedValue(null);
    integrationRepository.findOne.mockResolvedValue(mockIntegration);
    evotorApiService.getProducts.mockResolvedValue([]);
    evotorApiService.getAdminProducts.mockResolvedValue([]);
    evotorApiService.syncAdmin.mockResolvedValue({ result: 'ok' });
    evotorApiService.syncStoreProducts.mockResolvedValue({ result: 'ok' });
    productService.applyDemoCatalogSeed.mockResolvedValue({
      seedPath: 'data/demo-seed.csv',
      dryRun: false,
      csvProducts: 0,
      publishedCount: 0,
      hiddenCount: 0,
      skippedManualOverrideCount: 0,
      updatedQuantityCount: 0,
      updatedPriceCount: 0,
    });
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

  describe('ensureSellPositionProducts', () => {
    it('skips product creation for sell_document positions', async () => {
      const mockDocument = {
        id: 'doc-1',
        type: 'SELL',
        body: {
          positions: [
            {
              id: 1,
              product_id: 'remote-p1',
              product_name: 'Позиция по свободной цене',
              quantity: 1,
              price: 100,
              result_price: 100,
              sum: 100,
              result_sum: 100,
              product_type: 'NORMAL',
              tax: { type: 'NO_VAT', sum: 0, result_sum: 0 },
            },
          ],
          payments: [{ id: 'pay-1', type: 'CASH', sum: 100 }],
          result_sum: 100,
        },
      };

      await (service as any).ensureSellPositionProducts(
        'shop-1',
        'store-1',
        mockDocument,
        new Map(),
      );

      expect(productRepository.save).not.toHaveBeenCalled();
      expect(productRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('syncProducts', () => {
    const mockRemoteProducts = [
      {
        id: 'remote-p1',
        article_number: 'ART001',
        name: 'Test Product',
        price: 1000,
        quantity: 10,
        barcode: '1234567890',
      },
    ];

    beforeEach(() => {
      evotorApiService.getAdminProducts.mockResolvedValue(mockRemoteProducts);
      productRepository.findSyncedByShop.mockResolvedValue([]);
      productRepository.findBySku.mockResolvedValue(null);
      productRepository.create.mockImplementation((dto) => dto);
      productRepository.save.mockImplementation((product) =>
        Promise.resolve({ ...product, id: 'new-id' }),
      );
    });

    it('creates products without RAG indexing by default', async () => {
      const result = await service.syncProducts('shop-1');

      expect(productRepository.create).toHaveBeenCalled();
      expect(productRepository.save).toHaveBeenCalled();
      expect(catalogIndexService.upsertProduct).not.toHaveBeenCalled();
      expect(evotorApiService.syncStoreProducts).toHaveBeenCalledWith(
        'store-1',
        {
          evotorUserId: 'evotor-user-1',
        },
      );
      expect(evotorApiService.syncAdmin).not.toHaveBeenCalled();
      expect(evotorApiService.getAdminProducts).toHaveBeenCalledWith({
        evotorUserId: 'evotor-user-1',
        evotorAccountId: null,
        storeUuid: 'store-1',
        storefrontOnly: true,
      });
      expect(evotorApiService.getProducts).not.toHaveBeenCalled();
      expect(result.importedCount).toBeGreaterThan(0);
    });

    it('indexes to RAG when indexToRag=true', async () => {
      const result = await service.syncProducts('shop-1', true);

      expect(productRepository.create).toHaveBeenCalled();
      expect(productRepository.save).toHaveBeenCalled();
      expect(catalogIndexService.upsertProduct).toHaveBeenCalled();
      expect(result.importedCount).toBeGreaterThan(0);
    });

    it('applies demo seed visibility after force sync', async () => {
      await service.syncProducts('shop-1');

      expect(productService.applyDemoCatalogSeed).toHaveBeenCalledWith(
        'shop-1',
        false,
        false,
      );
    });
  });

  describe('syncApprovedIntegration', () => {
    const mockApprovedProducts = [
      {
        id: 'remote-p1',
        article_number: 'ART001',
        name: 'Test Product',
        price: 1000,
        quantity: 10,
        barcode: '1234567890',
      },
    ];
    const mockBridgeSyncResult = {
      result: 'ok',
      syncedAt: '2026-05-24T00:00:00Z',
    };

    beforeEach(() => {
      jest.spyOn(service as any, 'ensureBridgeIntegrations').mockResolvedValue({
        integration: mockIntegration,
        storeIds: ['store-1'],
      });
      evotorApiService.syncStoreProducts.mockResolvedValue(
        mockBridgeSyncResult,
      );
      evotorApiService.getAdminProducts.mockResolvedValue(mockApprovedProducts);
      productRepository.findSyncedByShop.mockResolvedValue([]);
      productRepository.findBySku.mockResolvedValue(null);
      productRepository.create.mockImplementation((dto) => dto);
      productRepository.save.mockImplementation((product) =>
        Promise.resolve({ ...product, id: 'new-id' }),
      );
      productService.applyDemoCatalogSeed.mockClear();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('calls product-only bridge sync before product import', async () => {
      await service.syncApprovedIntegration('shop-1', 'evotor-user-1');

      expect(evotorApiService.syncStoreProducts).toHaveBeenCalledTimes(1);
      expect(evotorApiService.syncStoreProducts).toHaveBeenCalledWith(
        'store-1',
        {
          evotorUserId: 'evotor-user-1',
        },
      );
      expect(evotorApiService.syncAdmin).not.toHaveBeenCalled();
    });

    it('uses persisted admin endpoint for product import (not live proxy)', async () => {
      await service.syncApprovedIntegration('shop-1', 'evotor-user-1');

      expect(evotorApiService.getAdminProducts).toHaveBeenCalled();
      expect(evotorApiService.getProducts).not.toHaveBeenCalled();
    });

    it('imports products via getAdminProducts with storefrontOnly=true', async () => {
      await service.syncApprovedIntegration('shop-1', 'evotor-user-1');

      expect(evotorApiService.getAdminProducts).toHaveBeenCalledWith({
        evotorUserId: 'evotor-user-1',
        evotorAccountId: null,
        storeUuid: 'store-1',
        storefrontOnly: true,
      });
    });

    it('does not index to Chroma during approve flow', async () => {
      await service.syncApprovedIntegration('shop-1', 'evotor-user-1');

      expect(catalogIndexService.upsertProduct).not.toHaveBeenCalled();
    });

    it('logs CORE_EVOTOR_IMPORT_FLOW debug message', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'debug');

      await service.syncApprovedIntegration('shop-1', 'evotor-user-1');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'CORE_EVOTOR_IMPORT_FLOW',
          integrationId: 'int-1',
          bridgeAccountId: 'evotor-user-1',
          trigger: 'APPROVE',
          bridgeSyncTriggered: true,
          importEndpoint: 'BridgeProductsAdminEndpoint',
        }),
      );
    });

    it('skips bridge sync when runBridgeSync=false', async () => {
      await service.syncApprovedIntegration('shop-1', 'evotor-user-1', {
        runBridgeSync: false,
      });

      expect(evotorApiService.syncStoreProducts).not.toHaveBeenCalled();
      expect(evotorApiService.syncAdmin).not.toHaveBeenCalled();
    });

    it('still imports from admin endpoint when bridge sync skipped', async () => {
      await service.syncApprovedIntegration('shop-1', 'evotor-user-1', {
        runBridgeSync: false,
      });

      expect(evotorApiService.getAdminProducts).toHaveBeenCalled();
      expect(evotorApiService.getProducts).not.toHaveBeenCalled();
    });

    it('imports products without bridge sync error (empty store case)', async () => {
      evotorApiService.getAdminProducts.mockResolvedValue([]);
      productRepository.findSyncedByShop.mockResolvedValue([]);

      const result = await service.syncApprovedIntegration(
        'shop-1',
        'evotor-user-1',
      );

      expect(result.products.importedCount).toBe(0);
      expect(result.products.deletedCount).toBe(0);
    });
  });
});
