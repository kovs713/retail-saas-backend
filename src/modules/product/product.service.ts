import { Pagination, PaginationResponse } from '@/common/dto';
import { TenantContext } from '@/common/types';
import { CacheService } from '@/core/cache/cache.service';
import { LoggerService } from '@/core/logger/logger.service';
import { CreateCategoryDto, CreateProductDto, UpdateCategoryDto, UpdateProductDto } from './dto';
import { Category, Product } from './entities';
import { CategoryRepository, ProductRepository } from './repositories';

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, QueryDeepPartialEntity } from 'typeorm';

@Injectable()
export class ProductService {
  private readonly logger: LoggerService = new LoggerService(ProductService.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly cacheService: CacheService,
  ) {}

  async create(createProductDto: CreateProductDto, tenantContext: TenantContext): Promise<Product> {
    this.logger.log(`Creating product with SKU: ${createProductDto.sku} for shop: ${tenantContext.shopId}`);

    const existingProduct = await this.productRepository.existsBySkuAndShop(createProductDto.sku, tenantContext.shopId);

    if (existingProduct) {
      this.logger.warn(
        `Product with SKU ${createProductDto.sku} already exists in organization ${tenantContext.shopId}`,
      );
      throw new ConflictException('Product with this SKU already exists');
    }

    const product = this.productRepository.create({
      ...createProductDto,
      shopId: tenantContext.shopId,
    });
    const savedProduct = await this.productRepository.save(product);

    await this.invalidateProductCache(tenantContext.shopId);

    this.logger.log(`Product created successfully with ID: ${savedProduct.id}`);
    return savedProduct;
  }

  async findAll(query: Pagination, tenantContext: TenantContext): Promise<PaginationResponse<Product>> {
    const cacheKey = this.cacheService.generateKey(
      'products',
      'list',
      tenantContext.shopId,
      query.page ?? 1,
      query.limit ?? 10,
      query.category || 'all',
      query.search || '',
    );

    const cached = await this.cacheService.get<PaginationResponse<Product>>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(
      `Finding products with query: page=${query.page}, limit=${query.limit}, search=${query.search || 'none'} for shop: ${tenantContext.shopId}`,
    );

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);

    const [data, total] = await this.productRepository.findAll(tenantContext.shopId, query);

    this.logger.log(`Found ${data.length} products (total: ${total}, page: ${page})`);

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

  async findOne(id: string, tenantContext: TenantContext): Promise<Product> {
    const cacheKey = this.cacheService.generateKey('product', 'id', id);
    const cached = await this.cacheService.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Finding product by ID: ${id} for shop: ${tenantContext.shopId}`);

    const product = await this.productRepository.findById(id, tenantContext.shopId);

    if (!product) {
      this.logger.warn(`Product with ID ${id} not found in organization ${tenantContext.shopId}`);
      throw new NotFoundException('Product not found');
    }

    await this.cacheService.set(cacheKey, product, 600);

    this.logger.log(`Product found: ${product.name}`);
    return product;
  }

  async findOneBySku(sku: string, tenantContext: TenantContext): Promise<Product> {
    const cacheKey = this.cacheService.generateKey('product', 'sku', tenantContext.shopId, sku);
    const cached = await this.cacheService.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Finding product by SKU: ${sku} for shop: ${tenantContext.shopId}`);

    const product = await this.productRepository.findBySku(sku, tenantContext.shopId);

    if (!product) {
      this.logger.warn(`Product with SKU ${sku} not found in organization ${tenantContext.shopId}`);
      throw new NotFoundException('Product not found');
    }

    await this.cacheService.set(cacheKey, product, 600);

    this.logger.log(`Product found: ${product.name}`);
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, tenantContext: TenantContext): Promise<Product> {
    this.logger.log(`Updating product ID: ${id} for shop: ${tenantContext.shopId}`);

    const product = await this.findOne(id, tenantContext);

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productRepository.existsBySkuAndShop(
        updateProductDto.sku,
        tenantContext.shopId,
      );

      if (existingProduct) {
        this.logger.warn(
          `Product with SKU ${updateProductDto.sku} already exists in organization ${tenantContext.shopId}`,
        );
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    await this.productRepository.update(id, updateProductDto as QueryDeepPartialEntity<Product>);
    await this.invalidateProductCache(tenantContext.shopId, id);
    const updatedProduct = await this.findOne(id, tenantContext);

    this.logger.log(`Product updated successfully: ${updatedProduct.name}`);
    return updatedProduct;
  }

  async remove(id: string, tenantContext: TenantContext): Promise<void> {
    this.logger.log(`Soft deleting product ID: ${id} for shop: ${tenantContext.shopId}`);

    await this.findOne(id, tenantContext);
    await this.productRepository.softDeleteById(id);
    await this.invalidateProductCache(tenantContext.shopId, id);

    this.logger.log(`Product ${id} soft deleted successfully`);
  }

  async restore(id: string, tenantContext: TenantContext): Promise<{ message: string }> {
    this.logger.log(`Restoring product ID: ${id} for shop: ${tenantContext.shopId}`);

    const product = await this.productRepository.findOneWithDeleted(id, tenantContext.shopId);

    if (!product) {
      this.logger.warn(`Product ${id} not found in organization ${tenantContext.shopId}`);
      throw new NotFoundException('Product not found');
    }

    const result = await this.productRepository.restoreById(id);

    if (result.affected === 0) {
      this.logger.warn(`Product ${id} not found or already active`);
      throw new NotFoundException('Product not found or already active');
    }

    await this.invalidateProductCache(tenantContext.shopId, id);

    this.logger.log(`Product ${id} restored successfully`);
    return { message: 'Product restored successfully' };
  }

  async updateStock(id: string, quantity: number, tenantContext: TenantContext): Promise<Product> {
    this.logger.log(`Updating stock for product ID: ${id}, quantity: ${quantity} for shop: ${tenantContext.shopId}`);

    await this.findOne(id, tenantContext);
    await this.productRepository.updateQuantity(id, tenantContext.shopId, quantity);
    await this.invalidateProductCache(tenantContext.shopId, id);
    const updatedProduct = await this.findOne(id, tenantContext);

    this.logger.log(`Stock updated for product ${id}: ${updatedProduct.quantity}`);
    return updatedProduct;
  }

  async adjustStock(id: string, adjustment: number, tenantContext: TenantContext): Promise<Product> {
    this.logger.log(
      `Adjusting stock for product ID: ${id}, adjustment: ${adjustment} for shop: ${tenantContext.shopId}`,
    );

    await this.findOne(id, tenantContext);
    await this.productRepository.incrementQuantity(id, tenantContext.shopId, adjustment);
    await this.invalidateProductCache(tenantContext.shopId, id);
    const updatedProduct = await this.findOne(id, tenantContext);

    this.logger.log(`Stock adjusted for product ${id}: ${updatedProduct.quantity}`);
    return updatedProduct;
  }

  async count(tenantContext: TenantContext, where?: FindOptionsWhere<Product>): Promise<number> {
    const count = await this.productRepository.countByShop(tenantContext.shopId, where);
    this.logger.log(`Product count for organization ${tenantContext.shopId}: ${count}`);
    return count;
  }

  async countByCategory(categoryId: string, tenantContext: TenantContext): Promise<number> {
    const count = await this.productRepository.countByCategory(tenantContext.shopId, categoryId);
    this.logger.log(`Product count for category ${categoryId} in organization ${tenantContext.shopId}: ${count}`);
    return count;
  }

  async findByBarcode(barcode: string, tenantContext: TenantContext): Promise<Product> {
    const cacheKey = this.cacheService.generateKey('product', 'barcode', tenantContext.shopId, barcode);
    const cached = await this.cacheService.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Finding product by barcode: ${barcode} for shop: ${tenantContext.shopId}`);

    const product = await this.productRepository.findByBarcode(barcode, tenantContext.shopId);

    if (!product) {
      this.logger.warn(`Product with barcode ${barcode} not found in organization ${tenantContext.shopId}`);
      throw new NotFoundException('Product not found');
    }

    await this.cacheService.set(cacheKey, product, 600);

    this.logger.log(`Product found: ${product.name}`);
    return product;
  }

  async findLowStock(threshold: number = 10, tenantContext: TenantContext): Promise<Product[]> {
    const cacheKey = this.cacheService.generateKey('products', 'low-stock', tenantContext.shopId, threshold);
    const cached = await this.cacheService.get<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Finding products with low stock (threshold: ${threshold}) for shop: ${tenantContext.shopId}`);

    const products = await this.productRepository.findLowStock(tenantContext.shopId, threshold);

    this.logger.log(`Found ${products.length} products with low stock`);

    await this.cacheService.set(cacheKey, products, 120);

    return products;
  }

  async getCategories(shopId: string): Promise<Category[]> {
    const cacheKey = this.cacheService.generateKey('categories', 'shop', shopId);
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

  async createCategory(shopId: string, createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      const existingCategory = await this.categoryRepository.findBySlug(shopId, createCategoryDto.slug);

      if (existingCategory) {
        throw new ConflictException(`Category with slug "${createCategoryDto.slug}" already exists for this shop`);
      }

      const category = this.categoryRepository.create({
        ...createCategoryDto,
        shopId,
      });

      const savedCategory = await this.categoryRepository.save(category);
      await this.invalidateCategoryCache(shopId);
      this.logger.log(`Category created successfully with ID: ${savedCategory.id}`);
      return savedCategory;
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create category: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async updateCategory(id: string, shopId: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    try {
      const category = await this.categoryRepository.findByIdAndShop(id, shopId);

      if (!category) {
        throw new NotFoundException(`Category with ID "${id}" not found`);
      }

      if (updateCategoryDto.slug) {
        const existingCategory = await this.categoryRepository.existsBySlugAndShop(shopId, updateCategoryDto.slug);

        if (existingCategory) {
          throw new ConflictException(`Category with slug "${updateCategoryDto.slug}" already exists for this shop`);
        }
      }

      Object.assign(category, updateCategoryDto);
      const updated = await this.categoryRepository.save(category);
      await this.invalidateCategoryCache(shopId);
      this.logger.log(`Category updated successfully: ${updated.name}`);
      return updated;
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to update category: ${errorMessage}`, errorStack);
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

      const productsWithCategory = await this.productRepository.countByCategory(shopId, id);

      if (productsWithCategory > 0) {
        throw new ConflictException(`Cannot delete category with ${productsWithCategory} associated products`);
      }

      await this.categoryRepository.remove(category);
      await this.invalidateCategoryCache(shopId);
      this.logger.log(`Category ${id} deleted successfully`);
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to delete category: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private async invalidateCategoryCache(shopId: string): Promise<void> {
    await this.cacheService.del(this.cacheService.generateKey('categories', 'shop', shopId));
  }

  private getOrderOptions(sortBy?: string, sortOrder?: 'ASC' | 'DESC'): Record<string, 'ASC' | 'DESC'> {
    const order: Record<string, 'ASC' | 'DESC'> = { createdAt: 'DESC' };

    if (sortBy) {
      order[sortBy] = sortOrder ?? 'ASC';
    }

    return order;
  }

  private async invalidateProductCache(shopId: string, productId?: string): Promise<void> {
    if (productId) {
      await this.cacheService.del(this.cacheService.generateKey('product', 'id', productId));
      await this.cacheService.del(this.cacheService.generateKey('product', 'sku', shopId, productId));
    }
    await this.cacheService.delPattern(`products:list:${shopId}:*`);
  }
}
