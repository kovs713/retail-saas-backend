import { LoggerService } from '@/core/logger/logger.service';
import { VectorStoreService } from '@/modules/rag/vector-store/vector-store.service';
import { Product } from './entities';
import { ProductRepository } from './repositories';

import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class CatalogIndexService {
  private readonly logger = new LoggerService(CatalogIndexService.name);

  constructor(
    private readonly vectorStoreService: VectorStoreService,
    private readonly productRepository: ProductRepository,
  ) {}

  private isProductIndexableForRag(
    product: Product,
  ): { ok: true } | { ok: false; reason: string } {
    if (product.deletedAt) {
      return { ok: false, reason: 'deleted' };
    }

    if (!product.name || product.name.trim() === '') {
      return { ok: false, reason: 'empty_name' };
    }

    const evotor = (product.metadata as Record<string, unknown> | undefined)
      ?.evotor as Record<string, unknown> | undefined;

    if (evotor?.source === 'sell_document') {
      return { ok: false, reason: 'sell_document_source' };
    }

    const metadata = product.metadata as Record<string, unknown> | undefined;
    const storefront = metadata?.storefront as
      | Record<string, unknown>
      | undefined;
    if (
      storefront?.publicationStatus &&
      storefront.publicationStatus !== 'PUBLISHED'
    ) {
      return { ok: false, reason: 'not_published' };
    }

    return { ok: true };
  }

  private getContentHash(product: Product): string | null {
    const metadata = product.metadata as Record<string, unknown> | undefined;
    if (!metadata) return null;

    const rag = metadata.rag as Record<string, unknown> | undefined;
    if (!rag) return null;

    const hash = rag.contentHash;
    return typeof hash === 'string' && hash.length > 0 ? hash : null;
  }

  private async setContentHash(product: Product, hash: string): Promise<void> {
    const metadata: Record<string, unknown> = product.metadata ?? {};
    const rag: Record<string, unknown> =
      (metadata.rag as Record<string, unknown>) ?? {};
    rag.contentHash = hash;
    metadata.rag = rag;
    product.metadata = metadata as Product['metadata'];

    await this.productRepository.update(product.id, {
      metadata: product.metadata ?? {},
    } as unknown as QueryDeepPartialEntity<Product>);
  }

  async upsertProduct(product: Product): Promise<void> {
    const indexable = this.isProductIndexableForRag(product);

    if (!indexable.ok) {
      await this.removeProduct(product.id, product.shopId);
      this.logger.log(
        `Skipped index for product ${product.id}: ${indexable.reason}`,
      );
      return;
    }

    const text = this.buildProductText(product);
    const hash = createHash('sha256').update(text).digest('hex');
    const storedHash = this.getContentHash(product);

    if (hash === storedHash) {
      this.logger.log(
        `Skipped index for product ${product.id}: content unchanged`,
      );
      return;
    }

    await this.removeProduct(product.id, product.shopId);
    await this.vectorStoreService.addTexts([text], product.shopId, [
      {
        source: 'catalog',
        type: 'product',
        productId: product.id,
        sku: product.sku,
        barcode: product.barcode,
        indexedAt: new Date().toISOString(),
      },
    ]);

    await this.setContentHash(product, hash);

    this.logger.log(
      `Indexed catalog product ${product.id}${storedHash ? ' (re-indexed)' : ''}`,
    );
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
      .filter(
        ([key, value]) =>
          key !== 'rag' && value !== null && value !== undefined,
      )
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
