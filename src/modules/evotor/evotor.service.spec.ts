import { createProduct } from '@/core/database/factories';
import { CatalogIndexService } from '@/modules/product/catalog-index.service';
import { ProductRepository } from '@/modules/product/repositories';
import { ShopService } from '@/modules/shop/shop.service';
import { EvotorIntegration } from './entities';
import { EvotorApiService } from './evotor-api.service';
import { EvotorService } from './evotor.service';
import { EvotorIntegrationRepository } from './repositories';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('EvotorService', () => {
  let service: EvotorService;
  let integrationRepository: DeepMocked<EvotorIntegrationRepository>;
  let productRepository: DeepMocked<ProductRepository>;
  let evotorApiService: DeepMocked<EvotorApiService>;
  let shopService: DeepMocked<ShopService>;
  let catalogIndexService: DeepMocked<CatalogIndexService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvotorService,
        {
          provide: EvotorIntegrationRepository,
          useValue: createMock<EvotorIntegrationRepository>(),
        },
        {
          provide: ProductRepository,
          useValue: createMock<ProductRepository>(),
        },
        {
          provide: CatalogIndexService,
          useValue: createMock<CatalogIndexService>(),
        },
        { provide: EvotorApiService, useValue: createMock<EvotorApiService>() },
        { provide: ShopService, useValue: createMock<ShopService>() },
      ],
    }).compile();

    service = module.get(EvotorService);
    integrationRepository = module.get(EvotorIntegrationRepository);
    productRepository = module.get(ProductRepository);
    evotorApiService = module.get(EvotorApiService);
    shopService = module.get(ShopService);
    catalogIndexService = module.get(CatalogIndexService);
  });

  it('connects a shop to an Evotor store', async () => {
    shopService.findById.mockResolvedValue({
      id: 'shop-1',
    } as never);
    integrationRepository.findConnectedByExternalStore.mockResolvedValue(null);
    integrationRepository.findOne.mockResolvedValue(null);
    integrationRepository.create.mockImplementation(
      (value) => value as EvotorIntegration,
    );
    integrationRepository.save.mockImplementation(async (value) =>
      Promise.resolve(value as EvotorIntegration),
    );

    const result = await service.connect('shop-1', {
      storeId: 'store-shop-1',
      deviceId: 'device-store-shop-1',
      userId: 'user-shop-1',
    });

    expect(result.provider).toBe('evotor');
    expect(result.externalStoreId).toBe('store-shop-1');
    expect(result.externalDeviceId).toBe('device-store-shop-1');
    expect(result.externalUserId).toBe('user-shop-1');
    expect(result.metadata).toEqual(
      expect.objectContaining({
        mode: 'api',
        connectedAt: expect.any(String),
      }),
    );
  });

  it('links a shop to an Evotor bridge store', async () => {
    shopService.findById.mockResolvedValue({ id: 'shop-1' } as never);
    evotorApiService.listAdminAccounts.mockResolvedValue([
      { evotor_user_id: 'evotor-user-1' },
    ]);
    evotorApiService.listAdminStores.mockResolvedValue([
      {
        storeId: 'store-1',
        evotor_user_id: 'evotor-user-1',
        name: 'Main Store',
      },
    ]);
    evotorApiService.listAdminDevices.mockResolvedValue([
      { deviceId: 'device-1', storeId: 'store-1' },
    ]);
    integrationRepository.findConnectedByExternalStore.mockResolvedValue(null);
    integrationRepository.findByShopId.mockResolvedValue(null);
    integrationRepository.create.mockImplementation(
      (value) => value as EvotorIntegration,
    );
    integrationRepository.save.mockImplementation(async (value) =>
      Promise.resolve(value as EvotorIntegration),
    );

    const result = await service.linkStore({
      shopId: 'shop-1',
      evotorUserId: 'evotor-user-1',
      storeId: 'store-1',
      deviceId: 'device-1',
    });

    expect(evotorApiService.listAdminAccounts).toHaveBeenCalledWith({
      evotorUserId: 'evotor-user-1',
    });
    expect(evotorApiService.listAdminStores).toHaveBeenCalledWith({
      evotorUserId: 'evotor-user-1',
      storeId: 'store-1',
    });
    expect(evotorApiService.listAdminDevices).toHaveBeenCalledWith({
      evotorUserId: 'evotor-user-1',
      storeId: 'store-1',
    });
    expect(result).toEqual(
      expect.objectContaining({
        shopId: 'shop-1',
        provider: 'evotor',
        status: 'connected',
        externalUserId: 'evotor-user-1',
        externalStoreId: 'store-1',
        externalDeviceId: 'device-1',
        metadata: expect.objectContaining({
          mode: 'admin_bridge_link',
          linkedAt: expect.any(String),
          bridgeStore: expect.objectContaining({ storeId: 'store-1' }),
          bridgeDevice: expect.objectContaining({ deviceId: 'device-1' }),
        }),
      }),
    );
  });

  it('rejects linking an Evotor store already linked to another shop', async () => {
    shopService.findById.mockResolvedValue({ id: 'shop-1' } as never);
    evotorApiService.listAdminAccounts.mockResolvedValue([
      { evotor_user_id: 'evotor-user-1' },
    ]);
    evotorApiService.listAdminStores.mockResolvedValue([
      { storeId: 'store-1', evotor_user_id: 'evotor-user-1' },
    ]);
    integrationRepository.findConnectedByExternalStore.mockResolvedValue({
      id: 'integration-2',
      shopId: 'shop-2',
      provider: 'evotor',
      status: 'connected',
      externalStoreId: 'store-1',
    } as EvotorIntegration);

    await expect(
      service.linkStore({
        shopId: 'shop-1',
        evotorUserId: 'evotor-user-1',
        storeId: 'store-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(integrationRepository.save).not.toHaveBeenCalled();
  });

  it('rejects linking when bridge store is missing', async () => {
    shopService.findById.mockResolvedValue({ id: 'shop-1' } as never);
    evotorApiService.listAdminAccounts.mockResolvedValue([
      { evotor_user_id: 'evotor-user-1' },
    ]);
    evotorApiService.listAdminStores.mockResolvedValue([]);

    await expect(
      service.linkStore({
        shopId: 'shop-1',
        evotorUserId: 'evotor-user-1',
        storeId: 'store-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(integrationRepository.save).not.toHaveBeenCalled();
  });

  it('syncs bridge account by evotor_user_id', async () => {
    shopService.findById.mockResolvedValue({ id: 'shop-1' } as never);
    evotorApiService.syncAdmin.mockResolvedValue({ batchId: 'batch-1' });

    const result = await service.syncBridgeAccount('shop-1', {
      evotor_user_id: 'evotor-user-1',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-16',
    });

    expect(evotorApiService.syncAdmin).toHaveBeenCalledWith({
      evotorUserId: 'evotor-user-1',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-16',
    });
    expect(result).toEqual({ batchId: 'batch-1' });
  });

  it('syncs remote products into local persisted catalog and soft-deletes missing synced items', async () => {
    const integration = {
      id: 'integration-1',
      shopId: 'shop-1',
      status: 'connected',
      externalStoreId: 'store-shop-1',
      externalUserId: 'evotor-user-1',
    } as EvotorIntegration;
    const staleProduct = createProduct({
      id: 'prod-stale',
      shopId: 'shop-1',
      sku: 'STALE-001',
      externalSource: 'evotor',
      externalId: 'old-remote-id',
      externalStoreId: 'store-shop-1',
    });

    integrationRepository.findOne.mockResolvedValue(integration);
    productRepository.findSyncedByShop.mockResolvedValue([staleProduct]);
    productRepository.create.mockImplementation((value) => value as never);
    integrationRepository.save.mockImplementation(async (value) =>
      Promise.resolve(value as EvotorIntegration),
    );
    evotorApiService.getProducts.mockResolvedValue([
      {
        id: 'remote-1',
        article_number: 'SKU-001',
        name: 'Remote Product',
        price: 1200,
        quantity: 7,
      },
    ]);

    const result = await service.syncProducts('shop-1');

    expect(evotorApiService.getProducts).toHaveBeenCalledWith(
      'store-shop-1',
      'evotor-user-1',
    );
    expect(productRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: 'shop-1',
        sku: 'SKU-001',
        name: 'Remote Product',
        externalSource: 'evotor',
        externalId: 'remote-1',
        metadata: expect.objectContaining({
          evotor: expect.objectContaining({
            userId: 'evotor-user-1',
          }),
        }),
      }),
    );
    expect(productRepository.softDeleteById).toHaveBeenCalledWith('prod-stale');
    expect(catalogIndexService.upsertProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: 'shop-1',
        sku: 'SKU-001',
        name: 'Remote Product',
      }),
    );
    expect(catalogIndexService.removeProduct).toHaveBeenCalledWith(
      'prod-stale',
      'shop-1',
    );
    expect(result.importedCount).toBe(1);
    expect(result.deletedCount).toBe(1);
    expect(integrationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          lastImportedCount: 1,
          lastDeletedCount: 1,
          lastSyncStatus: 'success',
        }),
      }),
    );
  });

  it('updates an existing synced product when sku matches but external id changed', async () => {
    const integration = {
      id: 'integration-1',
      shopId: 'shop-1',
      status: 'connected',
      externalStoreId: 'store-shop-1',
      externalUserId: 'evotor-user-1',
    } as EvotorIntegration;
    const syncedProduct = createProduct({
      id: 'prod-1',
      shopId: 'shop-1',
      sku: 'SKU-001',
      name: 'Old Product',
      externalSource: 'evotor',
      externalId: 'old-remote-id',
      externalStoreId: 'store-shop-1',
    });

    integrationRepository.findOne.mockResolvedValue(integration);
    integrationRepository.save.mockImplementation(async (value) =>
      Promise.resolve(value as EvotorIntegration),
    );
    productRepository.findSyncedByShop.mockResolvedValue([syncedProduct]);
    productRepository.create.mockImplementation((value) => value as never);
    evotorApiService.getProducts.mockResolvedValue([
      {
        id: 'remote-1',
        article_number: 'SKU-001',
        name: 'Remote Product',
        price: 1200,
        quantity: 7,
      },
    ]);

    await service.syncProducts('shop-1');

    expect(productRepository.create).not.toHaveBeenCalled();
    expect(productRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'prod-1',
        sku: 'SKU-001',
        name: 'Remote Product',
        externalId: 'remote-1',
      }),
    );
  });

  it('returns presentation status for the demo flow', async () => {
    shopService.findById.mockResolvedValue({ id: 'shop-1' } as never);
    integrationRepository.findOne.mockResolvedValue({
      id: 'integration-1',
      shopId: 'shop-1',
      status: 'connected',
      externalStoreId: 'store-shop-1',
      lastSyncAt: new Date('2026-04-21T10:00:00.000Z'),
    } as EvotorIntegration);
    productRepository.findSyncedByShop.mockResolvedValue([
      createProduct({
        id: 'prod-1',
        shopId: 'shop-1',
        externalSource: 'evotor',
        externalId: 'remote-1',
        externalStoreId: 'store-shop-1',
      }),
    ]);

    const result = await service.getPresentationStatus('shop-1');

    expect(result).toEqual({
      shopRegistered: true,
      terminalConnected: true,
      catalogImported: true,
      syncActive: true,
      importedProductsCount: 1,
      lastSyncAt: '2026-04-21T10:00:00.000Z',
    });
  });
});
