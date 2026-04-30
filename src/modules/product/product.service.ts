import { Pagination, PaginationResponse } from '@/common/dto';
import { CacheService } from '@/core/cache/cache.service';
import { LoggerService } from '@/core/logger/logger.service';
import { EvotorApiService } from '@/modules/evotor/evotor-api.service';
import { StorageService } from '@/modules/storage/storage.service';
import { CatalogIndexService } from './catalog-index.service';
import {
  CreateCategoryDto,
  CreateProductDto,
  UpdateCategoryDto,
  UpdateProductDto,
} from './dto';
import { Category, Product } from './entities';
import { CategoryRepository, ProductRepository } from './repositories';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FindOptionsWhere, QueryDeepPartialEntity } from 'typeorm';

@Injectable()
export class ProductService {
  private readonly logger: LoggerService = new LoggerService(
    ProductService.name,
  );

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly cacheService: CacheService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    private readonly evotorApiService: EvotorApiService,
    private readonly catalogIndexService: CatalogIndexService,
  ) {}

  async uploadProductImage(
    productId: string,
    file: Express.Multer.File,
    shopId: string,
  ): Promise<{
    key: string;
    publicUrl: string;
    contentType: string;
    size: number;
    etag: string;
  }> {
    const product = await this.productRepository.findByIdWithShop(
      productId,
      shopId,
    );

    if (!product || !product.shop) {
      throw new NotFoundException('Product not found');
    }

    const safeFileName = this.sanitizeImageFileName(file.originalname);
    const key = this.buildProductImageKey(productId, safeFileName);
    const publicUrl = this.buildPublicProductImageUrl(
      product.shop.slug,
      productId,
      safeFileName,
    );
    const etag = await this.storageService.putObject(
      key,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    );

    product.images = this.appendImageUrl(product.images, publicUrl);
    await this.productRepository.save(product);
    await this.invalidateProductCache(shopId, productId);

    return {
      key,
      publicUrl,
      contentType: file.mimetype,
      size: file.size,
      etag,
    };
  }

  async createImageUploadUrl(
    productId: string,
    fileName: string,
    shopId: string,
  ): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    const product = await this.productRepository.findByIdWithShop(
      productId,
      shopId,
    );

    if (!product || !product.shop) {
      throw new NotFoundException('Product not found');
    }

    const safeFileName = this.sanitizeImageFileName(fileName);
    const key = this.buildProductImageKey(productId, safeFileName);
    const expirySeconds = this.configService.get<number>(
      'MEDIA_UPLOAD_PRESIGNED_TTL',
      900,
    );
    const uploadUrl = await this.storageService.getPresignedPutUrl(
      key,
      expirySeconds,
    );
    const publicUrl = this.buildPublicProductImageUrl(
      product.shop.slug,
      productId,
      safeFileName,
    );

    return { uploadUrl, publicUrl, key };
  }

  async deleteImage(
    productId: string,
    imageName: string,
    shopId: string,
  ): Promise<void> {
    const product = await this.productRepository.findById(productId, shopId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const safeFileName = this.sanitizeImageFileName(imageName);
    const key = this.buildProductImageKey(productId, safeFileName);

    await this.storageService.deleteObject(key);
  }

  async findPublicByShopSlugAndId(
    shopSlug: string,
    productId: string,
  ): Promise<Product | null> {
    return this.productRepository.findByIdAndShopSlug(productId, shopSlug);
  }

  async getPrivateImageStream(
    productId: string,
    imageName: string,
    shopId: string,
  ): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    etag: string;
    lastModified: Date;
  }> {
    const product = await this.productRepository.findById(productId, shopId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

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

  buildProductImageObjectKey(productId: string, imageName: string): string {
    return this.buildProductImageKey(productId, imageName);
  }

  async create(
    createProductDto: CreateProductDto,
    shopId: string,
  ): Promise<Product> {
    this.logger.log(
      `Creating product with SKU: ${createProductDto.sku} for shop: ${shopId}`,
    );

    const existingProduct = await this.productRepository.existsBySkuAndShop(
      createProductDto.sku,
      shopId,
    );

    if (existingProduct) {
      this.logger.warn(
        `Product with SKU ${createProductDto.sku} already exists in organization ${shopId}`,
      );
      throw new ConflictException('Product with this SKU already exists');
    }

    const product = this.productRepository.create({
      ...createProductDto,
      shopId: shopId,
    });
    const savedProduct = await this.productRepository.save(product);

    await this.invalidateProductCache(shopId);
    await this.syncCatalogProduct(savedProduct);

    this.logger.log(`Product created successfully with ID: ${savedProduct.id}`);
    return savedProduct;
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

    const [data, total] = await this.productRepository.findAll(shopId, query);

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

    await this.cacheService.set(cacheKey, result, 300);

    return result;
  }

  async findOne(id: string, shopId: string): Promise<Product> {
    const cacheKey = this.cacheService.generateKey('product', 'id', id);
    const cached = await this.cacheService.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Finding product by ID: ${id} for shop: ${shopId}`);

    const product = await this.productRepository.findById(id, shopId);

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

    const product = await this.productRepository.findBySku(sku, shopId);

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
    const previousSku = product.sku;

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productRepository.existsBySkuAndShop(
        updateProductDto.sku,
        shopId,
      );

      if (existingProduct) {
        this.logger.warn(
          `Product with SKU ${updateProductDto.sku} already exists in organization ${shopId}`,
        );
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    if (this.shouldSyncManagedProduct(product, updateProductDto)) {
      await this.evotorApiService.upsertProducts(product.externalStoreId!, [
        this.buildManagedProductPayload(product, updateProductDto),
      ]);
    }

    await this.productRepository.update(
      id,
      updateProductDto as QueryDeepPartialEntity<Product>,
    );
    await this.invalidateProductCache(
      shopId,
      id,
      previousSku,
      updateProductDto.sku,
    );
    const updatedProduct = await this.findOne(id, shopId);
    await this.syncCatalogProduct(updatedProduct);

    this.logger.log(`Product updated successfully: ${updatedProduct.name}`);
    return updatedProduct;
  }

  async remove(id: string, shopId: string): Promise<void> {
    this.logger.log(`Soft deleting product ID: ${id} for shop: ${shopId}`);

    await this.findOne(id, shopId);
    await this.productRepository.softDeleteById(id);
    await this.invalidateProductCache(shopId, id);
    await this.removeCatalogProduct(id, shopId);

    this.logger.log(`Product ${id} soft deleted successfully`);
  }

  async restore(id: string, shopId: string): Promise<{ message: string }> {
    this.logger.log(`Restoring product ID: ${id} for shop: ${shopId}`);

    const product = await this.productRepository.findOneWithDeleted(id, shopId);

    if (!product) {
      this.logger.warn(`Product ${id} not found in organization ${shopId}`);
      throw new NotFoundException('Product not found');
    }

    const result = await this.productRepository.restoreById(id);

    if (result.affected === 0) {
      this.logger.warn(`Product ${id} not found or already active`);
      throw new NotFoundException('Product not found or already active');
    }

    await this.invalidateProductCache(shopId, id);
    const restoredProduct = await this.findOne(id, shopId);
    await this.syncCatalogProduct(restoredProduct);

    this.logger.log(`Product ${id} restored successfully`);
    return { message: 'Product restored successfully' };
  }

  async updateStock(
    id: string,
    quantity: number,
    shopId: string,
  ): Promise<Product> {
    this.logger.log(
      `Updating stock for product ID: ${id}, quantity: ${quantity} for shop: ${shopId}`,
    );

    const product = await this.findOne(id, shopId);

    if (this.shouldSyncManagedProduct(product, { quantity })) {
      await this.evotorApiService.upsertProducts(product.externalStoreId!, [
        this.buildManagedProductPayload(product, { quantity }),
      ]);
    }

    await this.productRepository.updateQuantity(id, shopId, quantity);
    await this.invalidateProductCache(shopId, id);
    const updatedProduct = await this.findOne(id, shopId);
    await this.syncCatalogProduct(updatedProduct);

    this.logger.log(
      `Stock updated for product ${id}: ${updatedProduct.quantity}`,
    );
    return updatedProduct;
  }

  async adjustStock(
    id: string,
    adjustment: number,
    shopId: string,
  ): Promise<Product> {
    this.logger.log(
      `Adjusting stock for product ID: ${id}, adjustment: ${adjustment} for shop: ${shopId}`,
    );

    const product = await this.findOne(id, shopId);
    const nextQuantity = product.quantity + adjustment;

    if (this.shouldSyncManagedProduct(product, { quantity: nextQuantity })) {
      await this.evotorApiService.upsertProducts(product.externalStoreId!, [
        this.buildManagedProductPayload(product, { quantity: nextQuantity }),
      ]);
    }

    await this.productRepository.incrementQuantity(id, shopId, adjustment);
    await this.invalidateProductCache(shopId, id);
    const updatedProduct = await this.findOne(id, shopId);
    await this.syncCatalogProduct(updatedProduct);

    this.logger.log(
      `Stock adjusted for product ${id}: ${updatedProduct.quantity}`,
    );
    return updatedProduct;
  }

  async count(
    shopId: string,
    where?: FindOptionsWhere<Product>,
  ): Promise<number> {
    const count = await this.productRepository.countByShop(shopId, where);
    this.logger.log(`Product count for organization ${shopId}: ${count}`);
    return count;
  }

  async countByCategory(categoryId: string, shopId: string): Promise<number> {
    const count = await this.productRepository.countByCategory(
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

    const product = await this.productRepository.findByBarcode(barcode, shopId);

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

    const products = await this.productRepository.findLowStock(
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
    return this.productRepository.findAvailableByShop(shopId, limit);
  }

  async rebuildCatalogIndex(shopId: string): Promise<number> {
    const products = await this.productRepository.findActiveByShop(shopId);

    await this.catalogIndexService.clearCatalog(shopId);
    for (const product of products) {
      await this.catalogIndexService.upsertProduct(product);
    }

    return products.length;
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

      const productsWithCategory = await this.productRepository.countByCategory(
        shopId,
        id,
      );

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

  private getOrderOptions(
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Record<string, 'ASC' | 'DESC'> {
    const order: Record<string, 'ASC' | 'DESC'> = { createdAt: 'DESC' };

    if (sortBy) {
      order[sortBy] = sortOrder ?? 'ASC';
    }

    return order;
  }

  private async invalidateProductCache(
    shopId: string,
    productId?: string,
    previousSku?: string,
    nextSku?: string,
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
    await this.cacheService.delPattern(`products:list:${shopId}:*`);
  }

  private shouldSyncManagedProduct(
    product: Product,
    updateProductDto: UpdateProductDto,
  ): boolean {
    if (
      product.externalSource !== 'evotor' ||
      !product.externalStoreId ||
      !product.externalId
    ) {
      return false;
    }

    return ['sku', 'name', 'price', 'quantity'].some(
      (field) => field in updateProductDto,
    );
  }

  private buildManagedProductPayload(
    product: Product,
    updateProductDto: UpdateProductDto,
  ) {
    return {
      id: product.externalId!,
      article_number: updateProductDto.sku ?? product.sku,
      name: updateProductDto.name ?? product.name,
      price: updateProductDto.price ?? product.price,
      quantity: updateProductDto.quantity ?? product.quantity,
    };
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

  private appendImageUrl(
    images: string[] | null | undefined,
    publicUrl: string,
  ): string[] {
    const nextImages = images ?? [];
    return nextImages.includes(publicUrl)
      ? nextImages
      : [...nextImages, publicUrl];
  }

  private buildProductImageKey(productId: string, imageName: string): string {
    return `products/${productId}/images/${imageName}`;
  }

  private buildPublicProductImageUrl(
    shopSlug: string,
    productId: string,
    imageName: string,
  ): string {
    return `/public/media/${shopSlug}/products/${productId}/${imageName}`;
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
}
