import { ProductRepository } from '@/modules/product/repositories';
import { ShopService } from '@/modules/shop/shop.service';
import { ConnectEvotorDto } from './dto';
import { EvotorIntegration } from './entities';
import { EvotorApiService } from './evotor-api.service';
import { EvotorIntegrationRepository } from './repositories';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class EvotorService {
  constructor(
    // @InjectRepository(EvotorIntegration)
    // private readonly repository: Repository<EvotorIntegration>,
    private readonly repository: EvotorIntegrationRepository,
    private readonly shopService: ShopService,
    private readonly productRepository: ProductRepository,
    private readonly evotorApiService: EvotorApiService,
  ) {}

  async connect(
    shopId: string,
    payload?: ConnectEvotorDto,
  ): Promise<EvotorIntegration> {
    const shop = await this.shopService.findById(shopId);
    const phone = payload?.phone ?? shop.phone ?? this.buildDemoPhone(shopId);
    const imeis = this.normalizeImeis(payload?.imeis ?? ['demo-terminal-1']);
    const binding = await this.evotorApiService.bindTerminals(
      shopId,
      phone,
      imeis,
    );

    const existing = await this.repository.findOne({
      where: { shopId },
    });
    const integration = existing ?? this.repository.create({ shopId });

    integration.provider = 'mock';
    integration.status = 'connected';
    integration.externalStoreId = binding.storeId;
    integration.externalDeviceId = binding.devices[0]?.id ?? null;
    integration.externalUserId = binding.userId;
    integration.metadata = {
      ...(integration.metadata ?? {}),
      mode: 'mock',
      phone,
      imeis,
      devices: binding.devices,
      seededProductsCount: binding.seededProductsCount,
    };

    return this.repository.save(integration);
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

  async demoSetup(shopId: string): Promise<{
    shopRegistered: boolean;
    terminalConnected: boolean;
    catalogImported: boolean;
    syncActive: boolean;
    importedProductsCount: number;
    lastSyncAt: string | null;
  }> {
    const integration = await this.connect(shopId);
    await this.evotorApiService.seedStore(shopId, 12, 0, 'electronics');
    const syncResult = await this.syncProducts(shopId);

    return {
      shopRegistered: true,
      terminalConnected: integration.status === 'connected',
      catalogImported: syncResult.importedCount > 0,
      syncActive: integration.status === 'connected',
      importedProductsCount: syncResult.importedCount,
      lastSyncAt: syncResult.syncedAt,
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
          managed: true,
          syncedAt: syncTimestamp.toISOString(),
        },
      };

      const product = existingProduct
        ? {
            ...existingProduct,
            shopId,
            sku: remoteProduct.article_number,
            name: remoteProduct.name,
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

      await this.productRepository.save(product);
      matchedProductIds.add(product.id);
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

  private getExternalStoreId(shopId: string): string {
    return `store-${shopId}`;
  }

  private normalizeImeis(imeis: string[]): string[] {
    const normalizedImeis = [
      ...new Set(imeis.map((imei) => imei.trim())),
    ].filter(Boolean);

    if (normalizedImeis.length === 0) {
      throw new BadRequestException('At least one IMEI is required');
    }

    return normalizedImeis;
  }

  private buildDemoPhone(shopId: string): string {
    const digits = shopId.replace(/\D/g, '').slice(-10).padStart(10, '0');
    return `+7${digits}`;
  }
}
