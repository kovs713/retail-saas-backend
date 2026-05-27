import { CacheService } from '@/core/cache/cache.service';
import { LoggerService } from '@/core/logger/logger.service';
import { OrderStatus } from '@/modules/order/dto';
import { Order } from '@/modules/order/entities';
import { OrderRepository } from '@/modules/order/repositories';
import { CatalogIndexService } from '@/modules/product/catalog-index.service';
import { Product } from '@/modules/product/entities';
import { ProductRepository } from '@/modules/product/repositories';
import { ProductService } from '@/modules/product/product.service';
import { ShopService } from '@/modules/shop/shop.service';
import {
  ConnectEvotorDto,
  EvotorAdminLinkStoreDto,
  EvotorAdminListResponse,
  EvotorInboxEventDto,
  RemoteProduct,
  SyncEvotorDto,
} from './dto';
import { EvotorIntegration } from './entities';
import { EvotorApiService } from './evotor-api.service';
import { EvotorIntegrationRepository } from './repositories';
import {
  EvotorSellDocumentPayload,
  EvotorSellPosition,
  isEvotorSellDocumentPayload,
} from './types';

import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';

type BridgeRecord = Record<string, unknown>;

interface SyncApprovedIntegrationOptions {
  dateFrom?: string;
  dateTo?: string;
  runBridgeSync?: boolean;
  trigger?: 'APPROVE' | 'FORCE';
}

interface SyncApprovedIntegrationResult {
  bridgeSync?: unknown;
  storeId: string;
  storeIds: string[];
  products: {
    importedCount: number;
    deletedCount: number;
    syncedAt: string;
  };
  orders: {
    importedCount: number;
    skippedCount: number;
    syncedAt: string;
  };
}

interface AggregatedRemoteProduct {
  id: string;
  article_number: string;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
  storeIds: string[];
  quantitiesByStore: Record<string, number>;
}

const SELL_INBOX_EVENTS_CACHE_TTL_SECONDS = 3600;
const SELL_EVENTS_COUNT_CACHE_TTL_SECONDS = 300;

@Injectable()
export class EvotorService {
  private readonly logger = new LoggerService(EvotorService.name);

  constructor(
    private readonly repository: EvotorIntegrationRepository,
    private readonly shopService: ShopService,
    private readonly productRepository: ProductRepository,
    private readonly orderRepository: OrderRepository,
    private readonly evotorApiService: EvotorApiService,
    private readonly catalogIndexService: CatalogIndexService,
    private readonly cacheService: CacheService,
    private readonly productService: ProductService,
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
    return this.syncApprovedIntegration(shopId, payload.evotor_user_id, {
      dateFrom: payload.dateFrom,
      dateTo: payload.dateTo,
      runBridgeSync: true,
      trigger: 'FORCE',
    });
  }

  async syncApprovedIntegration(
    shopId: string,
    evotorUserId: string,
    options: SyncApprovedIntegrationOptions = {},
  ): Promise<SyncApprovedIntegrationResult> {
    await this.shopService.findById(shopId);
    const trigger = options.trigger ?? 'APPROVE';
    const existingIntegration = await this.repository.findByShopId(shopId);

    const { integration, storeIds } = await this.ensureBridgeIntegrations(
      shopId,
      evotorUserId,
    );
    const bridgeSync =
      options.runBridgeSync === false
        ? undefined
        : await this.syncBridgeStoreProducts(
            shopId,
            integration,
            storeIds,
            evotorUserId,
            trigger,
          );
    const usePersistedEndpoint = true;
    const productsResult = await this.syncProductsForStores(
      shopId,
      integration,
      storeIds,
      false,
      usePersistedEndpoint,
      trigger,
    );

    const importEndpoint = usePersistedEndpoint
      ? 'BridgeProductsAdminEndpoint'
      : 'BridgeProductsLiveProxyEndpoint';

    this.logger.debug({
      message: 'CORE_EVOTOR_IMPORT_FLOW',
      integrationId: integration.id,
      bridgeAccountId: evotorUserId,
      trigger,
      bridgeSyncTriggered: bridgeSync !== undefined,
      importEndpoint,
      productsReceived:
        productsResult.importedCount + productsResult.deletedCount,
    });
    const orderResults: Array<{
      importedCount: number;
      skippedCount: number;
      syncedAt: string;
    }> = [];

    for (const storeId of storeIds) {
      orderResults.push(
        await this.syncSellOrdersForStore(shopId, integration, storeId, {
          dateFrom: options.dateFrom,
          dateTo: options.dateTo,
        }),
      );
    }

    return {
      bridgeSync,
      storeId: integration.externalStoreId,
      storeIds,
      products: {
        importedCount: productsResult.importedCount,
        deletedCount: productsResult.deletedCount,
        syncedAt: productsResult.syncedAt,
      },
      orders: {
        importedCount: orderResults.reduce(
          (sum, result) => sum + result.importedCount,
          0,
        ),
        skippedCount: orderResults.reduce(
          (sum, result) => sum + result.skippedCount,
          0,
        ),
        syncedAt: new Date().toISOString(),
      },
    };
  }

  async syncSellOrders(
    shopId: string,
    options: Pick<SyncApprovedIntegrationOptions, 'dateFrom' | 'dateTo'> = {},
  ): Promise<{
    importedCount: number;
    skippedCount: number;
    syncedAt: string;
  }> {
    const integration = await this.getConnectedIntegration(shopId);
    return this.syncSellOrdersForStore(
      shopId,
      integration,
      integration.externalStoreId,
      options,
    );
  }

  private async syncSellOrdersForStore(
    shopId: string,
    integration: EvotorIntegration,
    storeId: string,
    options: Pick<SyncApprovedIntegrationOptions, 'dateFrom' | 'dateTo'> = {},
  ): Promise<{
    importedCount: number;
    skippedCount: number;
    syncedAt: string;
  }> {
    const documents = await this.loadStoreDocuments(
      storeId,
      integration.externalUserId,
      options.dateFrom,
      options.dateTo,
    );
    const products = await this.productRepository.findSyncedByShop(
      shopId,
      true,
    );
    const productIdsByRemoteKey = this.buildProductRemoteLookup(products);
    let importedCount = 0;
    let skippedCount = 0;

    for (const document of documents) {
      const sellDocument = this.extractSellDocument(document);

      if (!sellDocument) {
        skippedCount += 1;
        continue;
      }

      this.ensureSellPositionProducts(shopId, storeId, sellDocument);

      const orderId = this.getEvotorOrderId(
        integration.externalUserId,
        storeId,
        sellDocument.id,
      );
      const existingOrder = await this.orderRepository.findById(orderId);

      if (existingOrder) {
        if (this.shouldUpdateEvotorOrderExternalFields(existingOrder)) {
          existingOrder.externalSource = 'evotor';
          existingOrder.externalId = sellDocument.id;
          existingOrder.externalStoreId = storeId;
          await this.orderRepository.save(existingOrder);
        }
        skippedCount += 1;
        continue;
      }

      const order = this.orderRepository.create(
        this.toOrderEntity(
          orderId,
          shopId,
          storeId,
          sellDocument,
          productIdsByRemoteKey,
        ),
      );

      await this.orderRepository.save(order);
      importedCount += 1;
    }

    await this.invalidateSellDashboardCache(shopId);

    return {
      importedCount,
      skippedCount,
      syncedAt: new Date().toISOString(),
    };
  }

  async getStatus(shopId: string): Promise<EvotorIntegration | null> {
    await this.shopService.findById(shopId);
    return this.repository.findOne({ where: { shopId } });
  }

  async getSellEventsCount(
    shopId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{ totalCount: number; periodCount: number }> {
    const integration = await this.getConnectedIntegration(shopId);

    if (!integration.externalUserId) {
      return { totalCount: 0, periodCount: 0 };
    }

    const cacheKey = this.cacheService.generateKey(
      'evotor',
      'sell-events-count',
      shopId,
      dateFrom ?? 'all',
      dateTo ?? 'all',
    );
    const cached = await this.cacheService.get<{
      totalCount: number;
      periodCount: number;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const baseQuery = {
      evotorUserId: integration.externalUserId,
      eventType: 'evotor.document.sell' as const,
      skip: 0,
      take: 1,
    };

    const hasPeriod = Boolean(dateFrom || dateTo);
    const totalPromise = this.evotorApiService.listAdminInboxEvents({
      ...baseQuery,
    });

    const [totalResponse, periodResponse] = hasPeriod
      ? await Promise.all([
          totalPromise,
          this.evotorApiService.listAdminInboxEvents({
            ...baseQuery,
            dateFrom,
            dateTo,
          }),
        ])
      : [await totalPromise, undefined];

    const totalCount = totalResponse.total;
    const periodCount = periodResponse?.total ?? totalCount;

    const result = { totalCount, periodCount };

    await this.cacheService.set(
      cacheKey,
      result,
      SELL_EVENTS_COUNT_CACHE_TTL_SECONDS,
    );

    return result;
  }

  async getLatestSellInboxEvents(
    shopId: string,
    skip = 0,
    take = 20,
  ): Promise<EvotorAdminListResponse<EvotorInboxEventDto>> {
    const safeSkip = Math.max(0, Number.isFinite(skip) ? skip : 0);
    const safeTake = Math.min(
      100,
      Math.max(1, Number.isFinite(take) ? take : 20),
    );
    const cacheKey = this.cacheService.generateKey(
      'evotor',
      'sell-inbox-events',
      shopId,
      safeSkip,
      safeTake,
    );
    const cached =
      await this.cacheService.get<EvotorAdminListResponse<EvotorInboxEventDto>>(
        cacheKey,
      );

    if (cached) {
      return cached;
    }

    const integration = await this.getConnectedIntegration(shopId);

    if (!integration.externalUserId) {
      const emptyResult = {
        items: [],
        total: 0,
        skip: safeSkip,
        take: safeTake,
      };
      await this.cacheService.set(
        cacheKey,
        emptyResult,
        SELL_INBOX_EVENTS_CACHE_TTL_SECONDS,
      );
      return emptyResult;
    }

    const items: EvotorInboxEventDto[] = [];
    let bridgeSkip = 0;
    let sellOffset = 0;
    const bridgeTake = 100;

    while (items.length < safeTake) {
      let response: EvotorAdminListResponse<EvotorInboxEventDto>;

      try {
        response = await this.evotorApiService.listAdminInboxEvents({
          evotorUserId: integration.externalUserId,
          storeId: integration.externalStoreId,
          eventType: 'evotor.documents.received',
          skip: bridgeSkip,
          take: bridgeTake,
        });
      } catch (error) {
        if (this.isBridgeNotFound(error)) {
          break;
        }

        throw error;
      }

      if (!response.items.length) {
        break;
      }

      for (const event of response.items) {
        const payload = event.payload as Record<string, unknown> | undefined;

        if (payload?.type !== 'SELL') {
          continue;
        }

        if (sellOffset >= safeSkip && items.length < safeTake) {
          items.push(event);
        }

        sellOffset += 1;

        if (items.length === safeTake) {
          break;
        }
      }

      if (response.items.length < bridgeTake) {
        break;
      }

      bridgeSkip += bridgeTake;
    }

    const result = {
      items,
      total: sellOffset,
      skip: safeSkip,
      take: safeTake,
    };

    await this.cacheService.set(
      cacheKey,
      result,
      SELL_INBOX_EVENTS_CACHE_TTL_SECONDS,
    );

    return result;
  }

  async disconnect(shopId: string): Promise<EvotorIntegration> {
    const integration = await this.getConnectedIntegration(shopId, false);
    integration.status = 'disconnected';
    return this.repository.save(integration);
  }

  async warmSellDashboardCaches(shopId: string): Promise<void> {
    try {
      await Promise.all([
        this.getLatestSellInboxEvents(shopId, 0, 5),
        this.getLatestSellInboxEvents(shopId, 0, 20),
      ]);
    } catch (error) {
      this.logger.warn(
        `Failed to warm Evotor sell dashboard cache for shop ${shopId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
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

  async syncProducts(
    shopId: string,
    indexToRag?: boolean,
  ): Promise<{
    importedCount: number;
    deletedCount: number;
    syncedAt: string;
  }> {
    const integration = await this.getConnectedIntegration(shopId);
    if (integration.externalUserId) {
      await this.syncBridgeStoreProducts(
        shopId,
        integration,
        this.getIntegrationStoreIds(integration),
        integration.externalUserId,
        'FORCE',
      );
    }

    return this.syncProductsForStores(
      shopId,
      integration,
      this.getIntegrationStoreIds(integration),
      indexToRag,
      true,
      'FORCE',
    );
  }

  private async syncProductsForStores(
    shopId: string,
    integration: EvotorIntegration,
    storeIds: string[],
    indexToRag = false,
    usePersistedEndpoint = false,
    trigger: 'APPROVE' | 'FORCE' = 'FORCE',
  ): Promise<{
    importedCount: number;
    deletedCount: number;
    syncedAt: string;
  }> {
    const syncTimestamp = new Date();
    const uniqueStoreIds = [...new Set(storeIds.filter(Boolean))];
    const evotorAccountId = this.getIntegrationEvotorAccountId(integration);
    const endpoint = usePersistedEndpoint
      ? 'GET /admin/evotor/products'
      : 'GET /api/evotor/stores/:storeId/products';
    this.logger.warn({
      message: 'CORE_IMPORT_PRODUCTS_REQUEST',
      endpoint,
      bridgeAccountId: integration.externalUserId,
      evotorAccountId,
      storeIds: uniqueStoreIds,
      visibilityMode: 'metadata.storefront.publicationStatus',
      indexToRag,
      trigger,
      shopId,
      integrationId: integration.id,
    });
    this.logger.warn({
      message: 'REAL_EVOTOR_PRODUCT_MATERIALIZER_HIT',
      method: 'syncProductsForStores',
      integrationId: integration?.id,
      shopId: integration?.shopId,
      externalStoreId: integration?.externalStoreId,
      bridgeStores: integration?.metadata?.bridgeStores,
    });

    const productsByStore = await Promise.all(
      uniqueStoreIds.map(async (storeId) => {
        const products = await this.loadStoreProducts(
          storeId,
          integration.externalUserId,
          evotorAccountId,
          usePersistedEndpoint,
        );

        this.logger.warn({
          message: 'REAL_EVOTOR_PRODUCT_MATERIALIZER_STORE_RESULT',
          storeId,
          total: products.length,
          positive: products.filter((product) => Number(product.quantity) > 0)
            .length,
          maxQuantity: products.reduce(
            (max, product) => Math.max(max, Number(product.quantity ?? 0)),
            0,
          ),
          sample: products.slice(0, 3).map((product) => ({
            productId: product.productId ?? product.id,
            code: product.code ?? product.article_number,
            name: product.name,
            quantity: product.quantity,
            rawQuantity:
              product.rawPayload?.quantity ?? product.raw_payload?.quantity,
          })),
        });

        return { storeId, products };
      }),
    );
    const receivedProducts = productsByStore.flatMap(
      ({ products }) => products,
    );
    this.logger.warn({
      message: 'CORE_IMPORT_PRODUCTS_RESPONSE',
      receivedTotal: receivedProducts.length,
      uniqueStores: uniqueStoreIds,
      sample: receivedProducts.slice(0, 3).map((product) => ({
        productId: product.id,
        storeId:
          product.rawPayload?.storeId ??
          product.rawPayload?.storeUuid ??
          product.raw_payload?.storeId ??
          product.raw_payload?.storeUuid,
        sku: product.article_number,
        quantity: product.quantity,
      })),
    });
    const remoteProducts = this.aggregateRemoteProducts(productsByStore);
    this.logger.warn({
      message: 'CORE_IMPORT_PRODUCTS_NORMALIZED',
      normalizedTotal: remoteProducts.length,
      skippedNoId: 0,
      skippedWrongStore: 0,
      skippedSellDocument: 0,
    });
    const syncedProducts = await this.productRepository.findSyncedByShop(
      shopId,
      true,
    );
    const remoteIds = new Set(remoteProducts.map((product) => product.id));
    const remoteSkus = new Set(
      remoteProducts.map((product) => product.article_number),
    );
    const remoteBarcodes = new Set(
      remoteProducts
        .map((product) => product.barcode)
        .filter((barcode): barcode is string => Boolean(barcode)),
    );
    const syncedByExternalId = new Map(
      syncedProducts.map((product) => [product.externalId, product]),
    );
    const syncedBySku = new Map(
      syncedProducts.map((product) => [product.sku, product]),
    );
    const syncedByBarcode = new Map(
      syncedProducts
        .filter((product) => Boolean(product.barcode))
        .map((product) => [product.barcode, product]),
    );
    const matchedProductIds = new Set<string>();
    let importedCount = 0;
    let deletedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const remoteProduct of remoteProducts) {
      const existingProduct =
        (remoteProduct.barcode
          ? syncedByBarcode.get(remoteProduct.barcode)
          : undefined) ??
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
          storeIds: remoteProduct.storeIds,
          quantitiesByStore: remoteProduct.quantitiesByStore,
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
            quantity: Math.max(0, remoteProduct.quantity),
            description: existingProduct.description ?? null,
            cost: existingProduct.cost ?? null,
            categoryId: existingProduct.categoryId ?? null,
            barcode: existingProduct.barcode ?? remoteProduct.barcode ?? null,
            images: existingProduct.images ?? [],
            metadata: nextMetadata,
            externalSource: 'evotor',
            externalId: remoteProduct.id,
            externalStoreId: remoteProduct.storeIds[0],
            deletedAt: null,
            updatedAt: syncTimestamp,
          }
        : this.productRepository.create({
            shopId,
            sku: remoteProduct.article_number,
            name: remoteProduct.name,
            price: remoteProduct.price,
            quantity: Math.max(0, remoteProduct.quantity),
            description: null,
            cost: null,
            categoryId: null,
            barcode: remoteProduct.barcode ?? null,
            images: [],
            metadata: nextMetadata,
            externalSource: 'evotor',
            externalId: remoteProduct.id,
            externalStoreId: remoteProduct.storeIds[0],
            deletedAt: null,
          });

      const savedProduct = await this.productRepository.save(product);
      if (existingProduct) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }
      if (indexToRag) {
        await this.syncCatalogProduct(savedProduct);
      }
      matchedProductIds.add(savedProduct.id);
      importedCount += 1;
    }

    for (const syncedProduct of syncedProducts) {
      if (
        !syncedProduct.externalId ||
        syncedProduct.deletedAt ||
        remoteIds.has(syncedProduct.externalId) ||
        remoteSkus.has(syncedProduct.sku) ||
        (syncedProduct.barcode && remoteBarcodes.has(syncedProduct.barcode)) ||
        matchedProductIds.has(syncedProduct.id)
      ) {
        continue;
      }

      await this.productRepository.softDeleteById(syncedProduct.id);
      await this.removeCatalogProduct(syncedProduct.id, shopId);
      deletedCount += 1;
    }

    integration.lastSyncAt = syncTimestamp;
    this.logger.warn({
      message: 'CORE_IMPORT_PRODUCTS_SAVED',
      created: createdCount,
      updated: updatedCount,
      shopId,
      indexToRag,
    });
    integration.metadata = {
      ...(integration.metadata ?? {}),
      lastImportedCount: importedCount,
      lastDeletedCount: deletedCount,
      lastSyncStatus: 'success',
    };
    await this.repository.save(integration);
    try {
      await this.productService.applyDemoCatalogSeed(shopId, false, false);
    } catch (error) {
      this.logger.warn({
        message: 'DEMO_CATALOG_SEED_APPLY_FAILED',
        shopId,
        integrationId: integration.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    await this.invalidateProductCache(shopId);

    return {
      importedCount,
      deletedCount,
      syncedAt: integration.lastSyncAt.toISOString(),
    };
  }

  private async syncBridgeStoreProducts(
    shopId: string,
    integration: EvotorIntegration,
    storeIds: string[],
    evotorUserId: string,
    trigger: 'APPROVE' | 'FORCE',
  ): Promise<unknown[]> {
    const uniqueStoreIds = [...new Set(storeIds.filter(Boolean))];
    const results: unknown[] = [];

    for (const storeId of uniqueStoreIds) {
      try {
        this.logger.warn({
          message: 'CORE_BRIDGE_SYNC_START',
          shopId,
          integrationId: integration.id,
          bridgeAccountId: evotorUserId,
          trigger,
          endpoint: 'POST /api/evotor/sync/stores/:storeId/products',
          storeId,
        });
        const result = await this.evotorApiService.syncStoreProducts(storeId, {
          evotorUserId,
        });
        results.push(result);
        this.logger.warn({
          message: 'CORE_BRIDGE_SYNC_DONE',
          shopId,
          integrationId: integration.id,
          bridgeAccountId: evotorUserId,
          trigger,
          storeId,
        });
      } catch (error) {
        this.logger.warn({
          message: 'CORE_BRIDGE_SYNC_FAILED',
          shopId,
          integrationId: integration.id,
          bridgeAccountId: evotorUserId,
          trigger,
          storeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  private aggregateRemoteProducts(
    productsByStore: Array<{ storeId: string; products: RemoteProduct[] }>,
  ): AggregatedRemoteProduct[] {
    const aggregated = new Map<string, AggregatedRemoteProduct>();

    for (const { storeId, products } of productsByStore) {
      this.logger.debug(
        `Loaded ${products.length} Evotor products from store ${storeId}`,
      );

      for (const product of products) {
        const key = this.getRemoteProductMergeKey(product);
        const quantity = Math.max(0, product.quantity ?? 0);
        const existing = aggregated.get(key);

        if (existing) {
          existing.quantity += quantity;
          existing.quantitiesByStore[storeId] =
            (existing.quantitiesByStore[storeId] ?? 0) + quantity;
          if (!existing.storeIds.includes(storeId)) {
            existing.storeIds.push(storeId);
          }
          if (quantity > 0) {
            existing.id = product.id;
          }
          continue;
        }

        aggregated.set(key, {
          id: product.id,
          article_number: product.article_number,
          name: product.name,
          price: product.price,
          quantity,
          ...(product.barcode ? { barcode: product.barcode } : {}),
          storeIds: [storeId],
          quantitiesByStore: { [storeId]: quantity },
        });
      }
    }

    this.logger.debug(
      `Aggregated ${aggregated.size} Evotor products from ${productsByStore.length} stores`,
    );

    return [...aggregated.values()];
  }

  private getRemoteProductMergeKey(product: RemoteProduct): string {
    return product.barcode ?? product.article_number ?? product.id;
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

  private async ensureBridgeIntegrations(
    shopId: string,
    evotorUserId: string,
  ): Promise<{ integration: EvotorIntegration; storeIds: string[] }> {
    const existing = await this.repository.findByShopId(shopId);
    const bridgeStores = await this.getBridgeStores(evotorUserId);
    const storeIds = this.getBridgeStoreIds(bridgeStores);

    if (existing?.externalStoreId) {
      if (existing.externalUserId && existing.externalUserId !== evotorUserId) {
        throw new ConflictException('Shop is linked to another Evotor account');
      }

      for (const storeId of storeIds) {
        await this.assertExternalStoreAvailable(shopId, storeId);
      }

      existing.provider = 'evotor';
      existing.status = 'connected';
      existing.externalUserId = evotorUserId;
      existing.externalStoreId = storeIds[0];
      existing.metadata = {
        ...(existing.metadata ?? {}),
        mode: 'approved_bridge_sync',
        bridgeStores,
        linkedAt:
          typeof existing.metadata?.linkedAt === 'string'
            ? existing.metadata.linkedAt
            : new Date().toISOString(),
        syncedStoresAt: new Date().toISOString(),
      };

      const saved = await this.repository.save(existing);

      return {
        integration: saved,
        storeIds,
      };
    }

    for (const storeId of storeIds) {
      await this.assertExternalStoreAvailable(shopId, storeId);
    }

    const integration = this.repository.create({ shopId });
    integration.provider = 'evotor';
    integration.status = 'connected';
    integration.externalUserId = evotorUserId;
    integration.externalStoreId = storeIds[0];
    integration.externalDeviceId = null;
    integration.metadata = {
      mode: 'approved_bridge_sync',
      linkedAt: new Date().toISOString(),
      bridgeStores,
      syncedStoresAt: new Date().toISOString(),
    };

    return {
      integration: await this.repository.save(integration),
      storeIds,
    };
  }

  private async getBridgeStores(evotorUserId: string): Promise<BridgeRecord[]> {
    const stores = await this.evotorApiService.listAdminStores({
      evotorUserId,
      take: 100,
    });

    if (stores.items.length === 0) {
      throw new NotFoundException('Evotor stores not found in bridge');
    }

    return stores.items as BridgeRecord[];
  }

  private getBridgeStoreIds(bridgeStores: BridgeRecord[]): string[] {
    const storeIds = bridgeStores
      .map((store) => this.getBridgeStoreExternalId(store))
      .filter((storeId): storeId is string => Boolean(storeId));

    if (storeIds.length === 0) {
      throw new BadRequestException('Evotor store id is missing in bridge');
    }

    return [...new Set(storeIds)];
  }

  private async loadStoreProducts(
    storeUuid: string,
    evotorUserId: string | null,
    evotorAccountId: string | null,
    usePersistedEndpoint = false,
  ) {
    if (usePersistedEndpoint) {
      return this.loadPersistedStoreProducts(
        evotorUserId!,
        evotorAccountId,
        storeUuid,
      );
    }

    try {
      const products = await this.evotorApiService.getProducts(
        storeUuid,
        evotorUserId,
      );

      if (products && products.length > 0) {
        return products;
      }

      if (!evotorUserId) {
        return products ?? [];
      }
    } catch (error) {
      if (evotorUserId && this.isBridgeNotFound(error)) {
        return this.evotorApiService.getAdminProducts({
          evotorUserId,
          evotorAccountId,
          storeUuid,
          storefrontOnly: true,
        });
      }

      throw error;
    }

    return this.evotorApiService.getAdminProducts({
      evotorUserId,
      evotorAccountId,
      storeUuid,
      storefrontOnly: true,
    });
  }

  private async loadPersistedStoreProducts(
    evotorUserId: string,
    evotorAccountId: string | null,
    storeUuid: string,
  ): Promise<RemoteProduct[]> {
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const products = await this.evotorApiService.getAdminProducts({
        evotorUserId,
        evotorAccountId,
        storeUuid,
        storefrontOnly: true,
      });

      if (products.length > 0) {
        return products;
      }

      if (attempt === maxAttempts) {
        const fallbackProducts = await this.evotorApiService.getAdminProducts({
          evotorUserId,
          evotorAccountId,
          storeUuid,
          storefrontOnly: false,
        });
        this.logger.warn({
          message: 'CORE_EVOTOR_PERSISTED_PRODUCTS_UNFILTERED_FALLBACK',
          evotorUserId,
          evotorAccountId,
          storeUuid,
          filteredProductsReceived: products.length,
          fallbackProductsReceived: fallbackProducts.length,
        });
        return fallbackProducts;
      }

      this.logger.warn({
        message: 'CORE_EVOTOR_PERSISTED_PRODUCTS_RETRY',
        evotorUserId,
        evotorAccountId,
        storeUuid,
        attempt,
        maxAttempts,
        productsReceived: products.length,
      });
      await this.sleep(process.env.NODE_ENV === 'test' ? 0 : 2000);
    }

    return [];
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async loadStoreDocuments(
    storeId: string,
    evotorUserId: string | null,
    dateFrom?: string,
    dateTo?: string,
  ) {
    try {
      const documents = await this.evotorApiService.getDocuments(
        storeId,
        evotorUserId,
        dateFrom,
        dateTo,
      );

      if (documents.length > 0 || !evotorUserId) {
        return documents;
      }

      return this.evotorApiService.getAdminDocuments(
        evotorUserId,
        storeId,
        dateFrom,
        dateTo,
      );
    } catch (error) {
      if (evotorUserId && this.isBridgeNotFound(error)) {
        return this.evotorApiService.getAdminDocuments(
          evotorUserId,
          storeId,
          dateFrom,
          dateTo,
        );
      }

      throw error;
    }
  }

  private isBridgeNotFound(error: unknown): boolean {
    return error instanceof HttpException && error.getStatus() === 404;
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
    const account =
      await this.evotorApiService.findRawBridgeAccount(evotorUserId);

    if (!account) {
      throw new NotFoundException('Evotor account not found in bridge');
    }

    return account;
  }

  private async getBridgeStore(
    evotorUserId: string,
    storeId: string,
  ): Promise<BridgeRecord> {
    const store = await this.evotorApiService.findRawBridgeStore(
      evotorUserId,
      storeId,
    );

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
    const device = await this.evotorApiService.findRawBridgeDevice(
      evotorUserId,
      storeId,
      deviceId,
    );

    if (!device) {
      throw new NotFoundException('Evotor device not found in bridge');
    }

    return device;
  }

  private extractSellDocument(
    document: unknown,
  ): EvotorSellDocumentPayload | null {
    if (isEvotorSellDocumentPayload(document)) {
      return document;
    }

    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      return null;
    }

    const record = document as BridgeRecord;
    const payload = record.payload ?? record.rawPayload ?? record.document;

    return isEvotorSellDocumentPayload(payload) ? payload : null;
  }

  private ensureSellPositionProducts(
    shopId: string,
    storeId: string,
    document: EvotorSellDocumentPayload,
  ): void {
    this.logger.warn({
      message: 'SKIP_SELL_DOCUMENT_PRODUCT_MATERIALIZATION',
      storeId,
      documentId: document.id,
      positionsCount: document.body.positions.length,
    });
  }

  private buildProductRemoteLookup(products: Product[]): Map<string, string> {
    const lookup = new Map<string, string>();

    for (const product of products) {
      this.addProductLookup(lookup, product);
    }

    return lookup;
  }

  private addProductLookup(
    lookup: Map<string, string>,
    product: Product,
  ): void {
    for (const key of [product.externalId, product.sku, product.barcode]) {
      if (key) {
        lookup.set(key, product.id);
      }
    }
  }

  private toOrderEntity(
    id: string,
    shopId: string,
    storeId: string,
    document: EvotorSellDocumentPayload,
    productIdsByRemoteKey: Map<string, string>,
  ): Partial<Order> {
    const occurredAt = this.parseEvotorDate(
      document.close_date ?? document.created_at,
    );

    return {
      id,
      shopId,
      customerName:
        this.toStringOrNull(document.body.customer_email) ?? 'Evotor customer',
      customerPhone:
        this.toStringOrNull(document.body.customer_phone) ??
        `evotor:${document.id}`,
      items: document.body.positions.map((position) =>
        this.toOrderItem(position, productIdsByRemoteKey),
      ),
      totalAmount: Math.round(document.body.result_sum),
      status: OrderStatus.COMPLETED,
      externalSource: 'evotor',
      externalId: document.id,
      externalStoreId: storeId,
      ...(occurredAt ? { createdAt: occurredAt, updatedAt: occurredAt } : {}),
    };
  }

  private toOrderItem(
    position: EvotorSellPosition,
    productIdsByRemoteKey: Map<string, string>,
  ): { productId: string; quantity: number; price: number } {
    const remoteKey = this.getPositionRemoteKey(position);
    const productId =
      productIdsByRemoteKey.get(remoteKey) ??
      this.getDeterministicUuid(`evotor-product:${remoteKey}`);
    const price = Number.isFinite(position.result_price)
      ? position.result_price
      : position.price;

    return {
      productId,
      quantity: position.quantity,
      price: Math.round(price),
    };
  }

  private getPositionRemoteKey(position: EvotorSellPosition): string {
    return this.firstNonEmptyString([
      position.product_id,
      position.uuid,
      position.code,
      position.bar_code,
      String(position.id),
    ]);
  }

  private getPositionSku(
    position: EvotorSellPosition,
    fallback: string,
  ): string {
    return this.firstNonEmptyString([
      position.code,
      position.bar_code,
      position.product_id,
      position.uuid,
      fallback,
    ]);
  }

  private parseEvotorDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseOptionalQueryDate(
    value: string | undefined,
    field: string,
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }

    return date;
  }

  private shouldUpdateEvotorOrderExternalFields(order: Order): boolean {
    return (
      order.externalSource !== 'evotor' ||
      !order.externalId ||
      !order.externalStoreId
    );
  }

  private toStringOrNull(
    value: string | number | null | undefined,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const stringValue = String(value).trim();
    return stringValue === '' ? null : stringValue;
  }

  private firstNonEmptyString(
    values: Array<string | null | undefined>,
  ): string {
    for (const value of values) {
      const stringValue = this.toStringOrNull(value);

      if (stringValue) {
        return stringValue;
      }
    }

    return 'unknown';
  }

  private getEvotorOrderId(
    evotorUserId: string | null,
    storeId: string,
    documentId: string,
  ): string {
    return this.getDeterministicUuid(
      `evotor-order:${evotorUserId ?? 'unknown'}:${storeId}:${documentId}`,
    );
  }

  private getDeterministicUuid(value: string): string {
    const bytes = Buffer.from(
      createHash('sha256').update(value).digest('hex'),
      'hex',
    ).subarray(0, 16);
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  private getIntegrationStoreIds(integration: EvotorIntegration): string[] {
    const metadata = integration.metadata;
    const bridgeStores = Array.isArray(metadata?.bridgeStores)
      ? metadata.bridgeStores
      : [];
    const fromBridgeStores = bridgeStores
      .map((store) => this.getBridgeStoreExternalId(store))
      .filter(
        (value): value is string =>
          typeof value === 'string' && value.length > 0,
      );
    const fallback = integration.externalStoreId
      ? [integration.externalStoreId]
      : [];

    return Array.from(new Set([...fromBridgeStores, ...fallback]));
  }

  private getIntegrationEvotorAccountId(
    integration: EvotorIntegration,
  ): string | null {
    const metadata = integration.metadata ?? {};
    const candidates = [
      metadata.evotorAccountId,
      metadata.accountId,
      metadata.bridgeAccountId,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && this.isUuid(candidate)) {
        return candidate;
      }
    }

    const bridgeAccount = metadata.bridgeAccount;
    if (
      bridgeAccount &&
      typeof bridgeAccount === 'object' &&
      !Array.isArray(bridgeAccount)
    ) {
      const id = (bridgeAccount as BridgeRecord).id;
      if (typeof id === 'string' && this.isUuid(id)) {
        return id;
      }
    }

    return null;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private getBridgeStoreExternalId(store: unknown): string | null {
    if (!store || typeof store !== 'object' || Array.isArray(store)) {
      return null;
    }

    const record = store as BridgeRecord;
    const rawPayload =
      record.rawPayload &&
      typeof record.rawPayload === 'object' &&
      !Array.isArray(record.rawPayload)
        ? (record.rawPayload as BridgeRecord)
        : null;

    const value =
      record.storeUuid ??
      record.store_uuid ??
      record.uuid ??
      rawPayload?.storeUuid ??
      rawPayload?.store_uuid ??
      rawPayload?.uuid ??
      rawPayload?.id ??
      record.externalStoreId ??
      null;

    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private async syncCatalogProduct(product: Product): Promise<void> {
    this.logger.debug({
      message: 'EVOTOR_CATALOG_SYNC_PRODUCT',
      productId: product.id,
      externalId: product.externalId,
      externalSource: product.externalSource,
      shopId: product.shopId,
      metadata: product.metadata,
      reason: 'evotor_product_sync',
    });

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

  private async invalidateSellDashboardCache(shopId: string): Promise<void> {
    await Promise.all([
      this.cacheService.delPattern(`evotor:sell-events-count:${shopId}:*`),
      this.cacheService.delPattern(`evotor:sell-inbox-events:${shopId}:*`),
    ]);
  }
}
