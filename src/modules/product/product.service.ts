import { Pagination, PaginationResponse } from '@/common/dto';
import { CacheService } from '@/core/cache/cache.service';
import { LoggerService } from '@/core/logger/logger.service';
import { ObjectStorageService } from '@/core/object-storage/object-storage.service';
import { CatalogIndexService } from './catalog-index.service';
import { CreateCategoryDto, UpdateCategoryDto, UpdateProductDto } from './dto';
import { Category, Product, ProductImage } from './entities';
import {
  CategoryRepository,
  ProductImageRepository,
  ProductRepository,
} from './repositories';

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FindOptionsWhere, QueryDeepPartialEntity } from 'typeorm';

interface DemoSeedRow {
  sku: string;
  storeUuid: string;
  externalId?: string;
  articleNumber?: string;
  barcode?: string;
  name: string;
  description?: string;
  price?: number;
  quantity?: number;
}

interface DemoSeedParseStats {
  rowsTotal: number;
  parsedRows: number;
  skippedNoIdentity: number;
  skippedNoName: number;
  skippedNotAllowed: number;
  skippedGroup: number;
}

export interface DemoCatalogSeedResult {
  seedPath: string;
  dryRun: boolean;
  csvProducts: number;
  publishedCount: number;
  hiddenCount: number;
  skippedManualOverrideCount: number;
  updatedQuantityCount: number;
  updatedPriceCount: number;
}

@Injectable()
export class ProductService {
  private readonly logger: LoggerService = new LoggerService(
    ProductService.name,
  );

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productImageRepository: ProductImageRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly cacheService: CacheService,
    private readonly storageService: ObjectStorageService,
    private readonly catalogIndexService: CatalogIndexService,
  ) {}

  async uploadProductImage(
    productId: string,
    file: Express.Multer.File,
    shopId: string,
  ): Promise<ProductImage> {
    const product = await this.productRepository.findSyncedByIdWithShop(
      productId,
      shopId,
    );

    if (!product || !product.shop) {
      throw new NotFoundException('Product not found');
    }

    const imageCount = await this.productImageRepository.countByProductId(
      productId,
      shopId,
    );
    if (imageCount >= 10) {
      throw new BadRequestException('Maximum 10 images allowed per product');
    }

    const safeFileName = this.sanitizeImageFileName(file.originalname);
    const s3Key = this.buildProductImageKey(productId, safeFileName);

    await this.storageService.putObject(s3Key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    const isPrimary = imageCount === 0;
    const sortOrder = imageCount;
    const publicUrl = this.buildPublicProductImageUrl(
      product.shop.slug,
      productId,
      safeFileName,
    );

    const image = this.productImageRepository.create({
      productId,
      shopId,
      s3Key,
      publicUrl,
      isPrimary,
      sortOrder,
      contentType: file.mimetype,
      size: file.size,
    });

    const savedImage = await this.productImageRepository.save(image);
    await this.invalidateProductCache(shopId, productId);

    return savedImage;
  }

  async deleteImage(imageId: string, shopId: string): Promise<void> {
    const image = await this.productImageRepository.findWithProductById(
      imageId,
      shopId,
    );

    if (!image || image.product?.externalSource !== 'evotor') {
      throw new NotFoundException('Product image not found');
    }

    await this.storageService.deleteObject(image.s3Key);
    await this.productImageRepository.hardDeleteById(imageId, shopId);
    await this.invalidateProductCache(shopId, image.productId);
  }

  async reorderImage(
    imageId: string,
    sortOrder: number,
    shopId: string,
  ): Promise<ProductImage> {
    const image = await this.productImageRepository.findWithProductById(
      imageId,
      shopId,
    );

    if (!image || image.product?.externalSource !== 'evotor') {
      throw new NotFoundException('Product image not found');
    }

    image.sortOrder = sortOrder;
    return this.productImageRepository.save(image);
  }

  async setPrimaryImage(
    imageId: string,
    shopId: string,
  ): Promise<ProductImage> {
    const image = await this.productImageRepository.findWithProductById(
      imageId,
      shopId,
    );

    if (!image || image.product?.externalSource !== 'evotor') {
      throw new NotFoundException('Product image not found');
    }

    await this.productImageRepository.update(
      { productId: image.productId, shopId, isPrimary: true },
      { isPrimary: false },
    );

    image.isPrimary = true;
    return this.productImageRepository.save(image);
  }

  async findImageById(imageId: string, shopId: string): Promise<ProductImage> {
    const image = await this.productImageRepository.findWithProductById(
      imageId,
      shopId,
    );

    if (!image || image.product?.externalSource !== 'evotor') {
      throw new NotFoundException('Product image not found');
    }

    return image;
  }

  async findImagesByProductId(
    productId: string,
    shopId: string,
  ): Promise<ProductImage[]> {
    await this.findOne(productId, shopId);
    return this.productImageRepository.findAllByProductId(productId, shopId);
  }

  async deleteAllProductImages(
    productId: string,
    shopId: string,
  ): Promise<void> {
    const images = await this.productImageRepository.findAllByProductId(
      productId,
      shopId,
    );

    if (images.length > 0) {
      await Promise.all(
        images.map((img) => this.storageService.deleteObject(img.s3Key)),
      );
      await this.productImageRepository.hardDeleteByProductId(
        productId,
        shopId,
      );
    }
  }

  async findPublicByShopSlugAndId(
    shopSlug: string,
    productId: string,
  ): Promise<Product | null> {
    return this.productRepository.findByIdAndShopSlug(productId, shopSlug);
  }

  async getImageStream(
    productId: string,
    imageName: string,
  ): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    etag: string;
    lastModified: Date;
  }> {
    const safeFileName = this.sanitizeImageFileName(imageName);
    const key = this.buildProductImageKey(productId, safeFileName);
    const [stat, stream] = await Promise.all([
      this.storageService.statObject(key),
      this.storageService.getObjectStream(key),
    ]);

    return {
      stream,
      contentType: stat.contentType,
      etag: stat.etag,
      lastModified: stat.lastModified,
    };
  }

  buildProductImageKey(productId: string, imageName: string): string {
    return `products/${productId}/images/${imageName}`;
  }

  private sanitizeImageFileName(fileName: string): string {
    const trimmed = fileName.trim();
    const validPattern = /^[a-zA-Z0-9._-]+$/;
    if (!trimmed || !validPattern.test(trimmed)) {
      throw new BadRequestException('Invalid image file name');
    }

    const extension = trimmed.split('.').pop()?.toLowerCase();
    const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
    if (!extension || !allowedExtensions.has(extension)) {
      throw new BadRequestException('Unsupported image extension');
    }

    return trimmed;
  }

  private buildPublicProductImageUrl(
    shopSlug: string,
    productId: string,
    imageName: string,
  ): string {
    return `/public/media/${shopSlug}/products/${productId}/${imageName}`;
  }

  async findAll(
    query: Pagination,
    shopId: string,
  ): Promise<PaginationResponse<Product>> {
    const cacheKey = this.cacheService.generateKey(
      'products',
      'list',
      shopId,
      query.page ?? 1,
      query.limit ?? 10,
      query.category || 'all',
      query.search || '',
      query.minPrice ?? 'min-all',
      query.maxPrice ?? 'max-all',
      query.inStock === undefined ? 'stock-all' : String(query.inStock),
      query.visibility ?? 'PUBLISHED',
      query.sortBy || 'sort-default',
      query.sortOrder || 'order-default',
    );

    const cached =
      await this.cacheService.get<PaginationResponse<Product>>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(
      `Finding products with query: page=${query.page}, limit=${query.limit}, search=${query.search || 'none'} for shop: ${shopId}`,
    );

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    const [data, total] = await this.productRepository.findSyncedAll(
      shopId,
      query,
    );

    this.logger.log(
      `Found ${data.length} products (total: ${total}, page: ${page})`,
    );

    const result: PaginationResponse<Product> = {
      success: true,
      data: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    if (total > 0) {
      await this.cacheService.set(cacheKey, result, 300);
    }

    return result;
  }

  async findOne(id: string, shopId: string): Promise<Product> {
    const cacheKey = this.cacheService.generateKey('product', 'id', id);
    const cached = await this.cacheService.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Finding product by ID: ${id} for shop: ${shopId}`);

    const product = await this.productRepository.findSyncedById(id, shopId);

    if (!product) {
      this.logger.warn(
        `Product with ID ${id} not found in organization ${shopId}`,
      );
      throw new NotFoundException('Product not found');
    }

    await this.cacheService.set(cacheKey, product, 600);

    this.logger.log(`Product found: ${product.name}`);
    return product;
  }

  async findOneBySku(sku: string, shopId: string): Promise<Product> {
    const cacheKey = this.cacheService.generateKey(
      'product',
      'sku',
      shopId,
      sku,
    );
    const cached = await this.cacheService.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Finding product by SKU: ${sku} for shop: ${shopId}`);

    const product = await this.productRepository.findSyncedBySku(sku, shopId);

    if (!product) {
      this.logger.warn(
        `Product with SKU ${sku} not found in organization ${shopId}`,
      );
      throw new NotFoundException('Product not found');
    }

    await this.cacheService.set(cacheKey, product, 600);

    this.logger.log(`Product found: ${product.name}`);
    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    shopId: string,
  ): Promise<Product> {
    this.logger.log(`Updating product ID: ${id} for shop: ${shopId}`);

    const product = await this.findOne(id, shopId);

    if ('categoryId' in updateProductDto && updateProductDto.categoryId) {
      await this.assertCategoryBelongsToShop(
        updateProductDto.categoryId,
        shopId,
      );
    }

    if (Object.keys(updateProductDto).length === 0) {
      return product;
    }

    await this.productRepository.update(
      id,
      updateProductDto as QueryDeepPartialEntity<Product>,
    );
    await this.invalidateProductCache(
      shopId,
      id,
      product.sku,
      undefined,
      product.barcode,
    );
    const updatedProduct = await this.findOne(id, shopId);
    await this.syncCatalogProduct(updatedProduct);

    this.logger.log(`Product updated successfully: ${updatedProduct.name}`);
    return updatedProduct;
  }

  async count(
    shopId: string,
    where?: FindOptionsWhere<Product>,
  ): Promise<number> {
    const count = await this.productRepository.countSyncedByShop(shopId, where);
    this.logger.log(`Product count for organization ${shopId}: ${count}`);
    return count;
  }

  async getStats(shopId: string): Promise<{
    published: number;
    hidden: number;
    inStock: number;
    outOfStock: number;
  }> {
    const [published, hidden, inStock, outOfStock] = await Promise.all([
      this.productRepository.countPublishedByShop(shopId),
      this.productRepository.countHiddenByShop(shopId),
      this.productRepository.countInStockByShop(shopId),
      this.productRepository.countOutOfStockByShop(shopId),
    ]);
    return { published, hidden, inStock, outOfStock };
  }

  async countByCategory(categoryId: string, shopId: string): Promise<number> {
    const count = await this.productRepository.countSyncedByCategory(
      shopId,
      categoryId,
    );
    this.logger.log(
      `Product count for category ${categoryId} in organization ${shopId}: ${count}`,
    );
    return count;
  }

  async findByBarcode(barcode: string, shopId: string): Promise<Product> {
    const cacheKey = this.cacheService.generateKey(
      'product',
      'barcode',
      shopId,
      barcode,
    );
    const cached = await this.cacheService.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(
      `Finding product by barcode: ${barcode} for shop: ${shopId}`,
    );

    const product = await this.productRepository.findSyncedByBarcode(
      barcode,
      shopId,
    );

    if (!product) {
      this.logger.warn(
        `Product with barcode ${barcode} not found in organization ${shopId}`,
      );
      throw new NotFoundException('Product not found');
    }

    await this.cacheService.set(cacheKey, product, 600);

    this.logger.log(`Product found: ${product.name}`);
    return product;
  }

  async findLowStock(
    threshold: number = 10,
    shopId: string,
  ): Promise<Product[]> {
    const cacheKey = this.cacheService.generateKey(
      'products',
      'low-stock',
      shopId,
      threshold,
    );
    const cached = await this.cacheService.get<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(
      `Finding products with low stock (threshold: ${threshold}) for shop: ${shopId}`,
    );

    const products = await this.productRepository.findSyncedLowStock(
      shopId,
      threshold,
    );

    this.logger.log(`Found ${products.length} products with low stock`);

    await this.cacheService.set(cacheKey, products, 120);

    return products;
  }

  async findAvailableProducts(
    shopId: string,
    limit: number = 100,
  ): Promise<Product[]> {
    return this.productRepository.findSyncedAvailableByShop(shopId, limit);
  }

  async rebuildCatalogIndex(shopId: string): Promise<number> {
    const products =
      await this.productRepository.findSyncedActiveByShop(shopId);

    await this.catalogIndexService.clearCatalog(shopId);
    for (const product of products) {
      await this.catalogIndexService.upsertProduct(product);
    }

    return products.length;
  }

  async reindexPublishedDemoProducts(shopId: string): Promise<number> {
    const products =
      await this.productRepository.findSyncedPublishedDemoByShop(shopId);

    await this.catalogIndexService.clearCatalog(shopId);
    for (const product of products) {
      await this.catalogIndexService.upsertProduct(product);
    }

    return products.length;
  }

  async applyDemoCatalogSeed(
    shopId: string,
    dryRun = false,
    failIfMissing = true,
  ): Promise<DemoCatalogSeedResult> {
    const seedPath = this.resolveDemoCatalogSeedPath();
    this.logger.log(
      `Applying demo catalog seed: path=${seedPath}, dryRun=${dryRun}`,
    );

    if (!existsSync(seedPath)) {
      if (!failIfMissing) {
        return {
          seedPath,
          dryRun,
          csvProducts: 0,
          publishedCount: 0,
          hiddenCount: 0,
          skippedManualOverrideCount: 0,
          updatedQuantityCount: 0,
          updatedPriceCount: 0,
        };
      }

      throw new BadRequestException(
        `Demo catalog seed file not found: ${seedPath}`,
      );
    }

    const seedRows = this.parseDemoCatalogSeed(seedPath);
    const seedBySku = new Map(seedRows.map((row) => [row.sku, row]));
    const result: DemoCatalogSeedResult = {
      seedPath,
      dryRun,
      csvProducts: seedRows.length,
      publishedCount: 0,
      hiddenCount: 0,
      skippedManualOverrideCount: 0,
      updatedQuantityCount: 0,
      updatedPriceCount: 0,
    };

    if (seedRows.length === 0) {
      return result;
    }

    const products = await this.productRepository.findSyncedByShop(
      shopId,
      true,
    );

    for (const product of products) {
      const metadata = this.cloneMetadata(product.metadata);
      const storefront = this.getStorefrontMetadata(metadata);
      if (storefront.manualVisibilityOverride === true) {
        result.skippedManualOverrideCount += 1;
        continue;
      }

      const seedRow = seedBySku.get(product.sku);
      storefront.publicationStatus = seedRow ? 'PUBLISHED' : 'HIDDEN';
      metadata.storefront = storefront;
      metadata.demoSeed = Boolean(seedRow);

      const updatePayload: QueryDeepPartialEntity<Product> = {
        metadata,
      } as unknown as QueryDeepPartialEntity<Product>;

      if (seedRow) {
        result.publishedCount += 1;
        if (
          seedRow.quantity !== undefined &&
          Number(product.quantity) !== seedRow.quantity
        ) {
          updatePayload.quantity = seedRow.quantity;
          result.updatedQuantityCount += 1;
        }
        if (
          seedRow.price !== undefined &&
          Number(product.price) !== seedRow.price
        ) {
          updatePayload.price = seedRow.price;
          result.updatedPriceCount += 1;
        }
      } else {
        result.hiddenCount += 1;
      }

      if (!dryRun) {
        await this.productRepository.update(product.id, updatePayload);
      }
    }

    if (!dryRun) {
      await this.invalidateProductCache(shopId);
    }

    return result;
  }

  private resolveDemoCatalogSeedPath(): string {
    return resolve(
      process.cwd(),
      process.env.DEMO_CATALOG_SEED_PATH || 'data/demo-seed.csv',
    );
  }

  private parseDemoCatalogSeed(seedPath: string): DemoSeedRow[] {
    const content = readFileSync(seedPath, 'utf8').replace(/^\uFEFF/, '');
    const [headerLine, ...lines] = content.split(/\r?\n/);
    const columns = this.parseCsvLine(headerLine).map((header) =>
      header.trim().replace(/^\uFEFF/, ''),
    );
    const normalizedColumns = columns.map((column) =>
      this.normalizeCsvColumn(column),
    );
    this.logger.log({
      message: 'DEMO_SEED_CSV_COLUMNS',
      columns,
    });

    const indexes = {
      storeUuid: this.findCsvColumnIndex(normalizedColumns, [
        'store_uuid',
        'storeuuid',
        'externalstoreid',
        'store_id',
      ]),
      externalId: this.findCsvColumnIndex(normalizedColumns, [
        'uuid',
        'id',
        'productid',
        'product_uuid',
      ]),
      code: this.findCsvColumnIndex(normalizedColumns, ['sku', 'код', 'code']),
      articleNumber: this.findCsvColumnIndex(normalizedColumns, [
        'артикул',
        'articlenumber',
        'article_number',
      ]),
      barcode: this.findCsvColumnIndex(normalizedColumns, [
        'штрих-код',
        'barcode',
        'barcode',
        'barcodes',
      ]),
      name: this.findCsvColumnIndex(normalizedColumns, [
        'наименование',
        'name',
        'title',
      ]),
      price: this.findCsvColumnIndex(normalizedColumns, ['цена', 'price']),
      quantity: this.findCsvColumnIndex(normalizedColumns, [
        'остаток',
        'quantity',
        'stock',
        'stockquantity',
      ]),
      allowToSell: this.findCsvColumnIndex(normalizedColumns, [
        'в продаже',
        'allow_to_sell',
        'allowtosell',
      ]),
      group: this.findCsvColumnIndex(normalizedColumns, [
        'признак группы',
        'group',
        'isgroup',
      ]),
      type: this.findCsvColumnIndex(normalizedColumns, ['тип', 'type']),
      description: this.findCsvColumnIndex(normalizedColumns, [
        'описание',
        'description',
      ]),
    };

    if (indexes.storeUuid === -1) {
      throw new BadRequestException(
        'Demo catalog seed CSV must include store_uuid/storeUuid column',
      );
    }

    const rows: DemoSeedRow[] = [];
    const stats: DemoSeedParseStats = {
      rowsTotal: 0,
      parsedRows: 0,
      skippedNoIdentity: 0,
      skippedNoName: 0,
      skippedNotAllowed: 0,
      skippedGroup: 0,
    };

    for (const line of lines.map((value) => value.trim()).filter(Boolean)) {
      stats.rowsTotal += 1;
      const cells = this.parseCsvLine(line).map((cell) => cell.trim());
      const row = this.normalizeDemoSeedRow(cells, indexes, stats);
      if (!row) continue;
      rows.push(row);
      stats.parsedRows += 1;
    }

    this.logger.log({
      message: 'DEMO_SEED_CSV_PARSED',
      ...stats,
      sample: rows.slice(0, 3),
    });

    return rows;
  }

  private normalizeDemoSeedRow(
    cells: string[],
    indexes: Record<string, number>,
    stats: DemoSeedParseStats,
  ): DemoSeedRow | null {
    const get = (key: string) =>
      indexes[key] === -1 ? '' : (cells[indexes[key]] ?? '').trim();
    const storeUuid = get('storeUuid');
    const externalId = get('externalId');
    const code = get('code');
    const articleNumber = get('articleNumber');
    const barcode = get('barcode');
    const name = get('name');
    const allowToSell = this.parseCsvBoolean(get('allowToSell'));
    const group = this.parseCsvBoolean(get('group'));

    if (allowToSell === false) {
      stats.skippedNotAllowed += 1;
      return null;
    }
    if (group === true) {
      stats.skippedGroup += 1;
      return null;
    }
    if (!name) {
      stats.skippedNoName += 1;
      return null;
    }
    if (!externalId && !code && !articleNumber && !barcode) {
      stats.skippedNoIdentity += 1;
      return null;
    }
    if (!storeUuid) {
      stats.skippedNoIdentity += 1;
      return null;
    }

    const sku = code || articleNumber || barcode || externalId;
    const row: DemoSeedRow = {
      sku,
      storeUuid,
      name,
      ...(externalId ? { externalId } : {}),
      ...(articleNumber ? { articleNumber } : {}),
      ...(barcode ? { barcode } : {}),
      ...(get('type') ? { type: get('type') } : {}),
      ...(get('description') ? { description: get('description') } : {}),
    } as DemoSeedRow;
    const price = this.parseCsvNumber(get('price'));
    if (price !== null) row.price = price;
    const quantity = this.parseCsvNumber(get('quantity'));
    if (quantity !== null) row.quantity = quantity;

    return row;
  }

  private parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = '';
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];
      if (char === '"' && quoted && next === '"') {
        current += '"';
        index += 1;
        continue;
      }
      if (char === '"') {
        quoted = !quoted;
        continue;
      }
      if (char === ';' && !quoted) {
        cells.push(current);
        current = '';
        continue;
      }
      current += char;
    }

    cells.push(current);
    return cells;
  }

  private normalizeCsvColumn(value: string): string {
    return value.trim().replace(/^\uFEFF/, '').toLowerCase();
  }

  private findCsvColumnIndex(columns: string[], aliases: string[]): number {
    const normalizedAliases = aliases.map((alias) =>
      this.normalizeCsvColumn(alias),
    );
    return columns.findIndex((column) => normalizedAliases.includes(column));
  }

  private parseCsvBoolean(value: string): boolean | null {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (['true', '1', 'yes', 'да'].includes(normalized)) return true;
    if (['false', '0', 'no', 'нет'].includes(normalized)) return false;
    return null;
  }

  private parseCsvNumber(value: string): number | null {
    const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private cloneMetadata(
    metadata: Product['metadata'],
  ): Record<string, unknown> {
    return { ...(metadata ?? {}) };
  }

  private getStorefrontMetadata(
    metadata: Record<string, unknown>,
  ): Record<string, unknown> {
    const storefront = metadata.storefront;
    if (
      !storefront ||
      typeof storefront !== 'object' ||
      Array.isArray(storefront)
    ) {
      return {};
    }

    return { ...(storefront as Record<string, unknown>) };
  }

  async syncCatalogProducts(
    productIds: string[],
    shopId: string,
  ): Promise<void> {
    const uniqueProductIds = [...new Set(productIds)];

    for (const productId of uniqueProductIds) {
      const product = await this.productRepository.findSyncedById(
        productId,
        shopId,
      );
      if (!product) {
        continue;
      }

      await this.syncCatalogProduct(product);
    }
  }

  async getCategories(shopId: string): Promise<Category[]> {
    const cacheKey = this.cacheService.generateKey(
      'categories',
      'shop',
      shopId,
    );
    const cached = await this.cacheService.get<Category[]>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Finding categories for shop: ${shopId}`);

    const categories = await this.categoryRepository.findAllByShop(shopId);

    this.logger.log(`Found ${categories.length} categories`);

    await this.cacheService.set(cacheKey, categories, 300);

    return categories;
  }

  async createCategory(
    shopId: string,
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    try {
      const existingCategory = await this.categoryRepository.findBySlug(
        shopId,
        createCategoryDto.slug,
      );

      if (existingCategory) {
        throw new ConflictException(
          `Category with slug "${createCategoryDto.slug}" already exists for this shop`,
        );
      }

      const category = this.categoryRepository.create({
        ...createCategoryDto,
        shopId,
      });

      const savedCategory = await this.categoryRepository.save(category);
      await this.invalidateCategoryCache(shopId);
      this.logger.log(
        `Category created successfully with ID: ${savedCategory.id}`,
      );
      return savedCategory;
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create category: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async updateCategory(
    id: string,
    shopId: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    try {
      const category = await this.categoryRepository.findByIdAndShop(
        id,
        shopId,
      );

      if (!category) {
        throw new NotFoundException(`Category with ID "${id}" not found`);
      }

      if (updateCategoryDto.slug) {
        const existingCategory =
          await this.categoryRepository.existsBySlugAndShop(
            shopId,
            updateCategoryDto.slug,
          );

        if (existingCategory) {
          throw new ConflictException(
            `Category with slug "${updateCategoryDto.slug}" already exists for this shop`,
          );
        }
      }

      Object.assign(category, updateCategoryDto);
      const updated = await this.categoryRepository.save(category);
      await this.invalidateCategoryCache(shopId);
      this.logger.log(`Category updated successfully: ${updated.name}`);
      return updated;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to update category: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async deleteCategory(id: string, shopId: string): Promise<void> {
    try {
      const category = await this.categoryRepository.findOne({
        where: { id, shopId },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID "${id}" not found`);
      }

      const productsWithCategory =
        await this.productRepository.countSyncedByCategory(shopId, id);

      if (productsWithCategory > 0) {
        throw new ConflictException(
          `Cannot delete category with ${productsWithCategory} associated products`,
        );
      }

      await this.categoryRepository.remove(category);
      await this.invalidateCategoryCache(shopId);
      this.logger.log(`Category ${id} deleted successfully`);
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to delete category: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  private async invalidateCategoryCache(shopId: string): Promise<void> {
    await this.cacheService.del(
      this.cacheService.generateKey('categories', 'shop', shopId),
    );
  }

  private async assertCategoryBelongsToShop(
    categoryId: string,
    shopId: string,
  ): Promise<void> {
    const category = await this.categoryRepository.findByIdAndShop(
      categoryId,
      shopId,
    );

    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  private async invalidateProductCache(
    shopId: string,
    productId?: string,
    previousSku?: string,
    nextSku?: string,
    barcode?: string | null,
  ): Promise<void> {
    if (productId) {
      await this.cacheService.del(
        this.cacheService.generateKey('product', 'id', productId),
      );
    }
    if (previousSku) {
      await this.cacheService.del(
        this.cacheService.generateKey('product', 'sku', shopId, previousSku),
      );
    }
    if (nextSku && nextSku !== previousSku) {
      await this.cacheService.del(
        this.cacheService.generateKey('product', 'sku', shopId, nextSku),
      );
    }
    if (barcode) {
      await this.cacheService.del(
        this.cacheService.generateKey('product', 'barcode', shopId, barcode),
      );
    }
    await this.cacheService.delPattern(`products:list:${shopId}:*`);
    await this.cacheService.delPattern(`products:low-stock:${shopId}:*`);
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
}
