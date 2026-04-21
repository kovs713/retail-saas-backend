import { ProductRepository } from '@/modules/product/repositories';
import { ShopService } from '@/modules/shop/shop.service';
import { EvotorIntegration } from './entities/evotor-integration.entity';
import { EvotorApiService } from './evotor-api.service';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EvotorService {
  constructor(
    @InjectRepository(EvotorIntegration)
    private readonly integrationRepository: Repository<EvotorIntegration>,
    private readonly shopService: ShopService,
    private readonly productRepository: ProductRepository,
    private readonly evotorApiService: EvotorApiService,
  ) {}

  async connect(shopId: string): Promise<EvotorIntegration> {
    await this.shopService.findById(shopId);
    await this.evotorApiService.seedStore(shopId);

    const existing = await this.integrationRepository.findOne({ where: { shopId } });
    const integration = existing ?? this.integrationRepository.create({ shopId });

    integration.provider = 'mock';
    integration.status = 'connected';
    integration.externalStoreId = this.getExternalStoreId(shopId);
    integration.externalDeviceId = this.getExternalDeviceId(shopId);
    integration.externalUserId = this.getExternalUserId(shopId);
    integration.metadata = {
      ...(integration.metadata ?? {}),
      mode: 'mock',
    };

    return this.integrationRepository.save(integration);
  }

  async getStatus(shopId: string): Promise<EvotorIntegration | null> {
    await this.shopService.findById(shopId);
    return this.integrationRepository.findOne({ where: { shopId } });
  }

  async disconnect(shopId: string): Promise<EvotorIntegration> {
    const integration = await this.getConnectedIntegration(shopId, false);
    integration.status = 'disconnected';
    return this.integrationRepository.save(integration);
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
      this.integrationRepository.findOne({ where: { shopId } }),
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

  async syncProducts(shopId: string): Promise<{ importedCount: number; deletedCount: number; syncedAt: string }> {
    const integration = await this.getConnectedIntegration(shopId);
    const remoteProducts = await this.evotorApiService.getProducts(integration.externalStoreId);
    const syncedProducts = await this.productRepository.findSyncedByShop(shopId, true);
    const remoteIds = new Set(remoteProducts.map((product) => product.id));
    const syncedByExternalId = new Map(syncedProducts.map((product) => [product.externalId, product]));
    let importedCount = 0;
    let deletedCount = 0;

    for (const remoteProduct of remoteProducts) {
      const existingProduct = syncedByExternalId.get(remoteProduct.id) ?? null;
      const nextMetadata = {
        ...(existingProduct?.metadata ?? {}),
        evotor: {
          id: remoteProduct.id,
          storeId: integration.externalStoreId,
          managed: true,
          syncedAt: new Date().toISOString(),
        },
      };

      const product = existingProduct
        ? Object.assign(existingProduct, {
            sku: remoteProduct.article_number,
            name: remoteProduct.name,
            price: remoteProduct.price,
            quantity: remoteProduct.quantity,
            externalSource: 'evotor',
            externalId: remoteProduct.id,
            externalStoreId: integration.externalStoreId,
            metadata: nextMetadata,
            deletedAt: null,
          })
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
          });

      await this.productRepository.save(product);
      importedCount += 1;
    }

    for (const syncedProduct of syncedProducts) {
      if (!syncedProduct.externalId || syncedProduct.deletedAt || remoteIds.has(syncedProduct.externalId)) {
        continue;
      }

      await this.productRepository.softDeleteById(syncedProduct.id);
      deletedCount += 1;
    }

    integration.lastSyncAt = new Date();
    await this.integrationRepository.save(integration);

    return {
      importedCount,
      deletedCount,
      syncedAt: integration.lastSyncAt.toISOString(),
    };
  }

  private async getConnectedIntegration(shopId: string, requireConnected = true): Promise<EvotorIntegration> {
    await this.shopService.findById(shopId);
    const integration = await this.integrationRepository.findOne({ where: { shopId } });

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

  private getExternalDeviceId(shopId: string): string {
    return `device-store-${shopId}`;
  }

  private getExternalUserId(shopId: string): string {
    return `user-${shopId}`;
  }
}
