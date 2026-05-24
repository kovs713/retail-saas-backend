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

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FindOptionsWhere, QueryDeepPartialEntity } from 'typeorm';

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
