import { CacheService } from '@/core/cache/cache.service';
import { LoggerService } from '@/core/logger/logger.service';
import { CatalogIndexService } from '@/modules/product/catalog-index.service';
import { Product } from '@/modules/product/entities';
import { ProductRepository } from '@/modules/product/repositories';
import { ShopService } from '@/modules/shop/shop.service';
import {
  ConnectEvotorDto,
  EvotorAdminLinkStoreDto,
  SyncEvotorDto,
} from './dto';
import { EvotorIntegration } from './entities';
import { EvotorApiService } from './evotor-api.service';
import { EvotorIntegrationRepository } from './repositories';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

type BridgeRecord = Record<string, unknown>;

@Injectable()
export class EvotorService {
  private readonly logger = new LoggerService(EvotorService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly repository: EvotorIntegrationRepository,
    private readonly shopService: ShopService,
    private readonly productRepository: ProductRepository,
    private readonly evotorApiService: EvotorApiService,
    private readonly catalogIndexService: CatalogIndexService,
    private readonly cacheService: CacheService,
  ) {}

  async connect(
    shopId: string,
    payload: ConnectEvotorDto,
  ): Promise<EvotorIntegration> {
    await this.shopService.findById(shopId);
    await this.assertExternalStoreAvailable(shopId, payload.storeId);

    const existing = await this.repository.findOne({
      where: { shopId },
    });
    const integration = existing ?? this.repository.create({ shopId });

    integration.provider = 'evotor';
    integration.status = 'connected';
    integration.externalStoreId = payload.storeId;
    integration.externalDeviceId = payload.deviceId ?? null;
    integration.externalUserId = payload.userId ?? null;
    integration.metadata = {
      ...(integration.metadata ?? {}),
      mode: 'api',
      connectedAt: new Date().toISOString(),
    };

    return this.repository.save(integration);
  }

  async linkStore(
    payload: EvotorAdminLinkStoreDto,
  ): Promise<EvotorIntegration> {
    await this.shopService.findById(payload.shopId);
    await this.getBridgeAccount(payload.evotorUserId);
    const bridgeStore = await this.getBridgeStore(
      payload.evotorUserId,
      payload.storeId,
    );
    const bridgeDevice = payload.deviceId
      ? await this.getBridgeDevice(
          payload.evotorUserId,
          payload.storeId,
          payload.deviceId,
        )
      : undefined;

    await this.assertExternalStoreAvailable(payload.shopId, payload.storeId);

    const existing = await this.repository.findByShopId(payload.shopId);
    const integration =
      existing ?? this.repository.create({ shopId: payload.shopId });
    const linkedAt = new Date().toISOString();

    integration.provider = 'evotor';
    integration.status = 'connected';
    integration.externalUserId = payload.evotorUserId;
    integration.externalStoreId = payload.storeId;
    integration.externalDeviceId = payload.deviceId ?? null;
    integration.metadata = {
      mode: 'admin_bridge_link',
      linkedAt,
      bridgeStore,
      ...(bridgeDevice ? { bridgeDevice } : {}),
    };

    const saved = await this.repository.save(integration);

    if (payload.syncProducts) {
      try {
        await this.syncProducts(payload.shopId);
      } catch (error) {
        this.logger.error(
          `Product sync failed after linking store ${payload.shopId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        saved.status = 'sync_failed';
        saved.metadata = {
          ...saved.metadata,
          syncError: error instanceof Error ? error.message : 'Unknown error',
          syncFailedAt: new Date().toISOString(),
        };
        await this.repository.save(saved);
      }
    }

    return saved;
  }

  async unlinkStore(shopId: string): Promise<EvotorIntegration> {
    return this.disconnect(shopId);
  }

  async syncBridgeAccount(
    shopId: string,
    payload: SyncEvotorDto,
  ): Promise<unknown> {
    await this.shopService.findById(shopId);

    return this.evotorApiService.syncStores({
      evotorUserId: payload.evotor_user_id,
      dateFrom: payload.dateFrom,
      dateTo: payload.dateTo,
    });
  }

  async getStatus(shopId: string): Promise<EvotorIntegration | null> {
    await this.shopService.findById(shopId);
    return this.repository.findOne({ where: { shopId } });
  }

  async disconnect(shopId: string): Promise<EvotorIntegration> {
    const integration = await this.getConnectedIntegration(shopId, false);
    integration.status = 'disconnected';
    return this.repository.save(integration);
  }

  async getPresentationStatus(shopId: string): Promise<{
    shopRegistered: boolean;
    terminalConnected: boolean;
    catalogImported: boolean;
    syncActive: boolean;
    importedProductsCount: number;
    lastSyncAt: string | null;
  }> {
    await this.shopService.findById(shopId);
    const [integration, syncedProducts] = await Promise.all([
      this.repository.findOne({ where: { shopId } }),
      this.productRepository.findSyncedByShop(shopId),
    ]);

    const terminalConnected = integration?.status === 'connected';
    const importedProductsCount = syncedProducts.length;

    return {
      shopRegistered: true,
      terminalConnected,
      catalogImported: importedProductsCount > 0,
      syncActive: terminalConnected,
      importedProductsCount,
      lastSyncAt: integration?.lastSyncAt?.toISOString() ?? null,
    };
  }

  async syncProducts(shopId: string): Promise<{
    importedCount: number;
    deletedCount: number;
    syncedAt: string;
  }> {
    const integration = await this.getConnectedIntegration(shopId);
    const syncTimestamp = new Date();
    const remoteProducts = await this.evotorApiService.getProducts(
      integration.externalStoreId,
      integration.externalUserId,
    );
    const syncedProducts = await this.productRepository.findSyncedByShop(
      shopId,
      true,
    );
    const remoteIds = new Set(remoteProducts.map((product) => product.id));
    const remoteSkus = new Set(
      remoteProducts.map((product) => product.article_number),
    );
    const syncedByExternalId = new Map(
      syncedProducts.map((product) => [product.externalId, product]),
    );
    const syncedBySku = new Map(
      syncedProducts.map((product) => [product.sku, product]),
    );
    const matchedProductIds = new Set<string>();
    let importedCount = 0;
    let deletedCount = 0;

    for (const remoteProduct of remoteProducts) {
      const existingProduct =
        syncedByExternalId.get(remoteProduct.id) ??
        syncedBySku.get(remoteProduct.article_number) ??
        (await this.productRepository.findBySku(
          remoteProduct.article_number,
          shopId,
        )) ??
        null;
      const nextMetadata = {
        ...(existingProduct?.metadata ?? {}),
        evotor: {
          id: remoteProduct.id,
          storeId: integration.externalStoreId,
          ...(integration.externalUserId
            ? { userId: integration.externalUserId }
            : {}),
          managed: true,
          syncedAt: syncTimestamp.toISOString(),
        },
      };

      const product = existingProduct
        ? {
            ...existingProduct,
            shopId,
            sku: remoteProduct.article_number,
            name: existingProduct.name,
            price: remoteProduct.price,
            quantity: remoteProduct.quantity,
            description: existingProduct.description ?? null,
            cost: existingProduct.cost ?? null,
            categoryId: existingProduct.categoryId ?? null,
            barcode: existingProduct.barcode ?? null,
            images: existingProduct.images ?? [],
            metadata: nextMetadata,
            externalSource: 'evotor',
            externalId: remoteProduct.id,
            externalStoreId: integration.externalStoreId,
            deletedAt: null,
          }
        : this.productRepository.create({
            shopId,
            sku: remoteProduct.article_number,
            name: remoteProduct.name,
            price: remoteProduct.price,
            quantity: remoteProduct.quantity,
            description: null,
            cost: null,
            categoryId: null,
            barcode: null,
            images: [],
            metadata: nextMetadata,
            externalSource: 'evotor',
            externalId: remoteProduct.id,
            externalStoreId: integration.externalStoreId,
            deletedAt: null,
          });

      const savedProduct = await this.productRepository.save(product);
      await this.syncCatalogProduct(savedProduct);
      matchedProductIds.add(savedProduct.id);
      importedCount += 1;
    }

    for (const syncedProduct of syncedProducts) {
      if (
        !syncedProduct.externalId ||
        syncedProduct.deletedAt ||
        remoteIds.has(syncedProduct.externalId) ||
        remoteSkus.has(syncedProduct.sku) ||
        matchedProductIds.has(syncedProduct.id)
      ) {
        continue;
      }

      await this.productRepository.softDeleteById(syncedProduct.id);
      await this.removeCatalogProduct(syncedProduct.id, shopId);
      deletedCount += 1;
    }

    integration.lastSyncAt = syncTimestamp;
    integration.metadata = {
      ...(integration.metadata ?? {}),
      lastImportedCount: importedCount,
      lastDeletedCount: deletedCount,
      lastSyncStatus: 'success',
    };
    await this.repository.save(integration);
    await this.invalidateProductCache(shopId);

    return {
      importedCount,
      deletedCount,
      syncedAt: integration.lastSyncAt.toISOString(),
    };
  }

  private async getConnectedIntegration(
    shopId: string,
    requireConnected = true,
  ): Promise<EvotorIntegration> {
    await this.shopService.findById(shopId);
    const integration = await this.repository.findOne({
      where: { shopId },
    });

    if (!integration) {
      throw new NotFoundException('Evotor integration not found');
    }

    if (requireConnected && integration.status !== 'connected') {
      throw new BadRequestException('Evotor integration is not connected');
    }

    return integration;
  }

  private async assertExternalStoreAvailable(
    shopId: string,
    externalStoreId: string,
  ): Promise<void> {
    const existing = await this.repository.findConnectedByExternalStore(
      'evotor',
      externalStoreId,
    );

    if (existing && existing.shopId !== shopId) {
      throw new ConflictException(
        'Evotor store is already linked to another shop',
      );
    }
  }

  private async getBridgeAccount(evotorUserId: string): Promise<BridgeRecord> {
    const accounts = await this.evotorApiService.listAdminAccounts({
      evotorUserId,
    });
    const account = this.findBridgeAccount(accounts, evotorUserId);

    if (!account) {
      throw new NotFoundException('Evotor account not found in bridge');
    }

    return account;
  }

  private async getBridgeStore(
    evotorUserId: string,
    storeId: string,
  ): Promise<BridgeRecord> {
    const stores = await this.evotorApiService.listAdminStores({
      evotorUserId,
      storeId,
    });
    const store = this.findBridgeStore(stores, evotorUserId, storeId);

    if (!store) {
      throw new NotFoundException('Evotor store not found in bridge');
    }

    return store;
  }

  private async getBridgeDevice(
    evotorUserId: string,
    storeId: string,
    deviceId: string,
  ): Promise<BridgeRecord> {
    const devices = await this.evotorApiService.listAdminDevices({
      evotorUserId,
      storeId,
    });
    const device = this.findBridgeDevice(
      devices,
      evotorUserId,
      storeId,
      deviceId,
    );

    if (!device) {
      throw new NotFoundException('Evotor device not found in bridge');
    }

    return device;
  }

  private findBridgeAccount(
    records: unknown[],
    evotorUserId: string,
  ): BridgeRecord | null {
    return this.findBridgeRecord(records, (record) =>
      this.matchesBridgeValue(
        record,
        ['evotorUserId', 'evotor_user_id', 'externalUserId', 'userId', 'id'],
        evotorUserId,
      ),
    );
  }

  private findBridgeStore(
    records: unknown[],
    evotorUserId: string,
    storeId: string,
  ): BridgeRecord | null {
    return this.findBridgeRecord(
      records,
      (record) =>
        this.matchesBridgeValue(
          record,
          ['storeId', 'store_id', 'externalStoreId', 'uuid', 'id'],
          storeId,
        ) &&
        this.matchesBridgeValue(
          record,
          ['evotorUserId', 'evotor_user_id', 'externalUserId', 'userId'],
          evotorUserId,
          true,
        ),
    );
  }

  private findBridgeDevice(
    records: unknown[],
    evotorUserId: string,
    storeId: string,
    deviceId: string,
  ): BridgeRecord | null {
    return this.findBridgeRecord(
      records,
      (record) =>
        this.matchesBridgeValue(
          record,
          ['deviceId', 'device_id', 'externalDeviceId', 'uuid', 'id'],
          deviceId,
        ) &&
        this.matchesBridgeValue(
          record,
          ['storeId', 'store_id', 'externalStoreId'],
          storeId,
          true,
        ) &&
        this.matchesBridgeValue(
          record,
          ['evotorUserId', 'evotor_user_id', 'externalUserId', 'userId'],
          evotorUserId,
          true,
        ),
    );
  }

  private findBridgeRecord(
    records: unknown[],
    predicate: (record: BridgeRecord) => boolean,
  ): BridgeRecord | null {
    for (const item of records) {
      const record = this.asBridgeRecord(item);

      if (record && predicate(record)) {
        return record;
      }
    }

    return null;
  }

  private asBridgeRecord(item: unknown): BridgeRecord | null {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return null;
    }

    return item as BridgeRecord;
  }

  private matchesBridgeValue(
    record: BridgeRecord,
    keys: string[],
    expected: string,
    allowMissing = false,
  ): boolean {
    const values = keys
      .map((key) => record[key])
      .filter((value): value is string | number =>
        ['string', 'number'].includes(typeof value),
      );

    if (values.length === 0) {
      return allowMissing;
    }

    return values.some((value) => String(value) === expected);
  }

  private async syncCatalogProduct(product: Product): Promise<void> {
    try {
      await this.catalogIndexService.upsertProduct(product);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown catalog index error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to sync catalog index for product ${product.id}: ${errorMessage}`,
        errorStack,
      );
    }
  }

  private async removeCatalogProduct(
    productId: string,
    shopId: string,
  ): Promise<void> {
    try {
      await this.catalogIndexService.removeProduct(productId, shopId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown catalog index error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to remove catalog index for product ${productId}: ${errorMessage}`,
        errorStack,
      );
    }
  }

  private async invalidateProductCache(shopId: string): Promise<void> {
    await Promise.all([
      this.cacheService.delPattern(`products:list:${shopId}:*`),
      this.cacheService.delPattern(`products:low-stock:${shopId}:*`),
      this.cacheService.delPattern('product:id:*'),
      this.cacheService.delPattern(`product:sku:${shopId}:*`),
      this.cacheService.delPattern(`product:barcode:${shopId}:*`),
    ]);
  }
}
