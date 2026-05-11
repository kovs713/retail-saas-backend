import { LoggerService } from '@/core/logger/logger.service';
import { VectorStoreService } from '@/modules/rag/vector-store/vector-store.service';
import { Product } from './entities';

import { Injectable } from '@nestjs/common';

@Injectable()
export class CatalogIndexService {
  private readonly logger = new LoggerService(CatalogIndexService.name);

  constructor(private readonly vectorStoreService: VectorStoreService) {}

  async upsertProduct(product: Product): Promise<void> {
    await this.removeProduct(product.id, product.shopId);

    if (product.deletedAt) {
      return;
    }

    await this.vectorStoreService.addTexts(
      [this.buildProductText(product)],
      product.shopId,
      [
        {
          source: 'catalog',
          type: 'product',
          productId: product.id,
          sku: product.sku,
          barcode: product.barcode,
          indexedAt: new Date().toISOString(),
        },
      ],
    );

    this.logger.log(`Indexed catalog product ${product.id}`);
  }

  async removeProduct(productId: string, shopId: string): Promise<void> {
    await this.vectorStoreService.deleteDocumentsByFilter(shopId, {
      type: 'product',
      productId,
    });
  }

  async clearCatalog(shopId: string): Promise<void> {
    await this.vectorStoreService.deleteDocumentsByFilter(shopId, {
      source: 'catalog',
      type: 'product',
    });
  }

  private buildProductText(product: Product): string {
    const categoryName = product.category?.name;
    const attributes = this.formatMetadata(product.metadata);

    return [
      `Product: ${product.name}`,
      `SKU: ${product.sku}`,
      ...(categoryName ? [`Category: ${categoryName}`] : []),
      ...(product.description ? [`Description: ${product.description}`] : []),
      ...(product.barcode ? [`Barcode: ${product.barcode}`] : []),
      ...(attributes ? [`Attributes: ${attributes}`] : []),
    ].join('\n');
  }

  private formatMetadata(
    metadata: Record<string, unknown> | null,
  ): string | null {
    if (!metadata) {
      return null;
    }

    const attributes = Object.entries(metadata)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          return `${key}: ${value}`;
        }

        return `${key}: ${JSON.stringify(value)}`;
      });

    return attributes.length > 0 ? attributes.join('; ') : null;
  }
}
