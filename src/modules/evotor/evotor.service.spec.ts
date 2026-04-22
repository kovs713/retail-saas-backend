import { createProduct } from '@/core/database/factories';
import { ProductRepository } from '@/modules/product/repositories';
import { ShopService } from '@/modules/shop/shop.service';
import { EvotorApiService } from './evotor-api.service';
import { EvotorIntegration } from './entities/evotor-integration.entity';
import { EvotorService } from './evotor.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('EvotorService', () => {
  let service: EvotorService;
  let integrationRepository: DeepMocked<Repository<EvotorIntegration>>;
  let productRepository: DeepMocked<ProductRepository>;
  let evotorApiService: DeepMocked<EvotorApiService>;
  let shopService: DeepMocked<ShopService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvotorService,
        {
          provide: getRepositoryToken(EvotorIntegration),
          useValue: createMock<Repository<EvotorIntegration>>(),
        },
        {
          provide: ProductRepository,
          useValue: createMock<ProductRepository>(),
        },
        { provide: EvotorApiService, useValue: createMock<EvotorApiService>() },
        { provide: ShopService, useValue: createMock<ShopService>() },
      ],
    }).compile();

    service = module.get(EvotorService);
    integrationRepository = module.get(getRepositoryToken(EvotorIntegration));
    productRepository = module.get(ProductRepository);
    evotorApiService = module.get(EvotorApiService);
    shopService = module.get(ShopService);
  });

  it('connects a shop to evotor mock with deterministic ids', async () => {
    shopService.findById.mockResolvedValue({ id: 'shop-1' } as never);
    integrationRepository.findOne.mockResolvedValue(null);
    integrationRepository.create.mockImplementation(
      (value) => value as EvotorIntegration,
    );
    integrationRepository.save.mockImplementation(async (value) =>
      Promise.resolve(value as EvotorIntegration),
    );

    const result = await service.connect('shop-1');

    expect(evotorApiService.seedStore).toHaveBeenCalledWith('shop-1');
    expect(result.externalStoreId).toBe('store-shop-1');
    expect(result.externalDeviceId).toBe('device-store-shop-1');
  });

  it('syncs remote products into local persisted catalog and soft-deletes missing synced items', async () => {
    const integration = {
      id: 'integration-1',
      shopId: 'shop-1',
      status: 'connected',
      externalStoreId: 'store-shop-1',
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

    expect(productRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: 'shop-1',
        sku: 'SKU-001',
        name: 'Remote Product',
        externalSource: 'evotor',
        externalId: 'remote-1',
      }),
    );
    expect(productRepository.softDeleteById).toHaveBeenCalledWith('prod-stale');
    expect(result.importedCount).toBe(1);
    expect(result.deletedCount).toBe(1);
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

  it('runs one-click demo setup and returns presentation status', async () => {
    shopService.findById.mockResolvedValue({ id: 'shop-1' } as never);
    integrationRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'integration-1',
        shopId: 'shop-1',
        status: 'connected',
        externalStoreId: 'store-shop-1',
        lastSyncAt: new Date('2026-04-21T11:00:00.000Z'),
      } as EvotorIntegration)
      .mockResolvedValueOnce({
        id: 'integration-1',
        shopId: 'shop-1',
        status: 'connected',
        externalStoreId: 'store-shop-1',
        lastSyncAt: new Date('2026-04-21T11:00:00.000Z'),
      } as EvotorIntegration);
    integrationRepository.create.mockImplementation(
      (value) => value as EvotorIntegration,
    );
    integrationRepository.save.mockImplementation(async (value) =>
      Promise.resolve(value as EvotorIntegration),
    );
    productRepository.findSyncedByShop.mockResolvedValue([]);
    evotorApiService.getProducts.mockResolvedValue([
      {
        id: 'remote-1',
        article_number: 'SKU-001',
        name: 'Remote Product',
        price: 1200,
        quantity: 7,
      },
    ]);
    productRepository.create.mockImplementation((value) => value as never);
    integrationRepository.save.mockImplementation(async (value) =>
      Promise.resolve(value as EvotorIntegration),
    );

    const result = await service.demoSetup('shop-1');

    expect(evotorApiService.seedStore).toHaveBeenCalledWith(
      'shop-1',
      12,
      0,
      'electronics',
    );
    expect(result).toEqual(
      expect.objectContaining({
        shopRegistered: true,
        terminalConnected: true,
        catalogImported: true,
        syncActive: true,
        importedProductsCount: 1,
      }),
    );
    expect(result.lastSyncAt).toEqual(expect.any(String));
  });
});
