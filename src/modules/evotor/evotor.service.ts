import { CacheService } from '@/core/cache/cache.service';
import { LoggerService } from '@/core/logger/logger.service';
import { OrderStatus } from '@/modules/order/dto';
import { Order } from '@/modules/order/entities';
import { OrderRepository } from '@/modules/order/repositories';
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
    });
  }

  async syncApprovedIntegration(
    shopId: string,
    evotorUserId: string,
    options: SyncApprovedIntegrationOptions = {},
  ): Promise<SyncApprovedIntegrationResult> {
    await this.shopService.findById(shopId);

    const bridgeSync =
      options.runBridgeSync === false
        ? undefined
        : await this.evotorApiService.syncAdmin({
            evotorUserId,
            dateFrom: options.dateFrom,
            dateTo: options.dateTo,
          });

    const { integration, storeIds } = await this.ensureBridgeIntegrations(
      shopId,
      evotorUserId,
    );
    const productResults: Array<{
      importedCount: number;
      deletedCount: number;
      syncedAt: string;
    }> = [];
    const orderResults: Array<{
      importedCount: number;
      skippedCount: number;
      syncedAt: string;
    }> = [];

    for (const storeId of storeIds) {
      productResults.push(
        await this.syncProductsForStore(shopId, integration, storeId),
      );
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
        importedCount: productResults.reduce(
          (sum, result) => sum + result.importedCount,
          0,
        ),
        deletedCount: productResults.reduce(
          (sum, result) => sum + result.deletedCount,
          0,
        ),
        syncedAt: new Date().toISOString(),
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

      await this.ensureSellPositionProducts(
        shopId,
        storeId,
        sellDocument,
        productIdsByRemoteKey,
      );

      const orderId = this.getEvotorOrderId(
        integration.externalUserId,
        storeId,
        sellDocument.id,
      );
      const existingOrder = await this.orderRepository.findById(orderId);

      if (existingOrder) {
        skippedCount += 1;
        continue;
      }

      const order = this.orderRepository.create(
        this.toOrderEntity(
          orderId,
          shopId,
          sellDocument,
          productIdsByRemoteKey,
        ),
      );

      await this.orderRepository.save(order);
      importedCount += 1;
    }

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
    return this.syncProductsForStore(
      shopId,
      integration,
      integration.externalStoreId,
    );
  }

  private async syncProductsForStore(
    shopId: string,
    integration: EvotorIntegration,
    storeId: string,
  ): Promise<{
    importedCount: number;
    deletedCount: number;
    syncedAt: string;
  }> {
    const syncTimestamp = new Date();
    const remoteProducts = await this.loadStoreProducts(
      storeId,
      integration.externalUserId,
    );
    const syncedProducts = (
      await this.productRepository.findSyncedByShop(shopId, true)
    ).filter((product) => product.externalStoreId === storeId);
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
          storeId,
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
            externalStoreId: storeId,
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
            externalStoreId: storeId,
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

  private async ensureBridgeIntegrations(
    shopId: string,
    evotorUserId: string,
  ): Promise<{ integration: EvotorIntegration; storeIds: string[] }> {
    const existing = await this.repository.findByShopId(shopId);

    if (existing?.externalStoreId) {
      if (existing.externalUserId && existing.externalUserId !== evotorUserId) {
        throw new ConflictException('Shop is linked to another Evotor account');
      }

      existing.provider = 'evotor';
      existing.status = 'connected';
      existing.externalUserId = evotorUserId;
      const metadataStoreIds = this.getMetadataStoreIds(existing.metadata);

      if (
        metadataStoreIds.length > 0 &&
        !metadataStoreIds.includes(existing.externalStoreId)
      ) {
        existing.externalStoreId = metadataStoreIds[0];
      }

      const saved = await this.repository.save(existing);

      return {
        integration: saved,
        storeIds:
          metadataStoreIds.length > 0
            ? metadataStoreIds
            : [saved.externalStoreId],
      };
    }

    const stores = await this.evotorApiService.listAdminStores({
      evotorUserId,
      take: 100,
    });

    if (stores.items.length === 0) {
      throw new NotFoundException('Evotor stores not found in bridge');
    }

    const bridgeStores = stores.items as BridgeRecord[];
    const storeIds = bridgeStores
      .map((store) =>
        this.pickBridgeString(store, [
          'externalStoreId',
          'storeUuid',
          'uuid',
          'storeId',
          'store_id',
          'id',
        ]),
      )
      .filter((storeId): storeId is string => Boolean(storeId));

    if (storeIds.length === 0) {
      throw new BadRequestException('Evotor store id is missing in bridge');
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
    };

    return {
      integration: await this.repository.save(integration),
      storeIds,
    };
  }

  private async loadStoreProducts(
    storeId: string,
    evotorUserId: string | null,
  ) {
    try {
      return await this.evotorApiService.getProducts(storeId, evotorUserId);
    } catch (error) {
      if (this.isBridgeNotFound(error)) {
        return [];
      }

      throw error;
    }
  }

  private async loadStoreDocuments(
    storeId: string,
    evotorUserId: string | null,
    dateFrom?: string,
    dateTo?: string,
  ) {
    try {
      return await this.evotorApiService.getDocuments(
        storeId,
        evotorUserId,
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

  private async ensureSellPositionProducts(
    shopId: string,
    storeId: string,
    document: EvotorSellDocumentPayload,
    productIdsByRemoteKey: Map<string, string>,
  ): Promise<void> {
    for (const position of document.body.positions) {
      const remoteKey = this.getPositionRemoteKey(position);

      if (productIdsByRemoteKey.has(remoteKey)) {
        continue;
      }

      const sku = this.getPositionSku(position, remoteKey);
      const existingProduct = await this.productRepository.findBySku(
        sku,
        shopId,
      );

      if (existingProduct) {
        this.addProductLookup(productIdsByRemoteKey, existingProduct);
        productIdsByRemoteKey.set(remoteKey, existingProduct.id);
        continue;
      }

      const product = this.productRepository.create({
        shopId,
        sku,
        name: this.toStringOrNull(position.product_name) ?? sku,
        price: Math.round(position.result_price ?? position.price),
        quantity: 0,
        description: null,
        cost: null,
        categoryId: null,
        barcode: this.toStringOrNull(position.bar_code),
        images: [],
        metadata: {
          evotor: {
            id: remoteKey,
            storeId,
            managed: true,
            source: 'sell_document',
            syncedAt: new Date().toISOString(),
          },
        },
        externalSource: 'evotor',
        externalId: remoteKey,
        externalStoreId: storeId,
        deletedAt: null,
      });
      const savedProduct = await this.productRepository.save(product);

      await this.syncCatalogProduct(savedProduct);
      this.addProductLookup(productIdsByRemoteKey, savedProduct);
    }
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

  private pickBridgeString(
    record: BridgeRecord,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'string' && value.trim() !== '') {
        return value;
      }
    }

    return null;
  }

  private getMetadataStoreIds(
    metadata: Record<string, unknown> | null,
  ): string[] {
    if (!metadata) {
      return [];
    }

    const stores = metadata.bridgeStores;

    if (!Array.isArray(stores)) {
      return [];
    }

    return stores
      .map((store) =>
        store && typeof store === 'object' && !Array.isArray(store)
          ? this.pickBridgeString(store as BridgeRecord, [
              'externalStoreId',
              'storeUuid',
              'uuid',
              'storeId',
              'store_id',
              'id',
            ])
          : null,
      )
      .filter((storeId): storeId is string => Boolean(storeId));
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
