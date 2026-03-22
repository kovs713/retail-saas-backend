import { Pagination, PaginationResponse } from '@/common/dto';
import { TenantContext } from '@/common/types';
import { CacheService } from '@/core/cache/cache.service';
import { LoggerService } from '@/core/logger/logger.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { Product } from './entities/product.entity';

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindManyOptions,
  FindOptionsWhere,
  ILike,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThanOrEqual,
  QueryDeepPartialEntity,
  Repository,
} from 'typeorm';

@Injectable()
export class ProductService {
  private readonly logger: LoggerService = new LoggerService(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly cacheService: CacheService,
  ) {}

  async create(createProductDto: CreateProductDto, tenantContext: TenantContext): Promise<Product> {
    this.logger.log(`Creating product with SKU: ${createProductDto.sku} for shop: ${tenantContext.shopId}`);

    const existingProduct = await this.productRepository.existsBy({
      sku: createProductDto.sku,
      shopId: tenantContext.shopId,
    });

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
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Product> = {
      shopId: tenantContext.shopId,
      deletedAt: IsNull(),
    };

    if (query.category) {
      where.categoryId = query.category;
    }

    if (query.minPrice !== undefined) {
      where.price = MoreThanOrEqual(query.minPrice);
    }
    if (query.maxPrice !== undefined) {
      where.price = LessThanOrEqual(query.maxPrice);
    }

    let searchWhere: FindOptionsWhere<Product> | null = null;
    if (query.search) {
      const escapedSearch = query.search.replace(/([%_\\])/g, '\\$1');
      searchWhere = {
        ...where,
        name: ILike(`%${escapedSearch}%`),
      } as FindOptionsWhere<Product>;
    }

    const searchValue = query.search ?? '';
    const escapedSkuSearch = searchValue.replace(/([%_\\])/g, '\\$1');
    const options: FindManyOptions<Product> = {
      where: searchWhere
        ? [
            searchWhere,
            {
              ...where,
              sku: ILike(`%${escapedSkuSearch}%`),
            } as FindOptionsWhere<Product>,
          ]
        : where,
      skip,
      take: limit,
      order: this.getOrderOptions(query.sortBy, query.sortOrder),
    };

    const [data, total] = await this.productRepository.findAndCount(options);

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

    const product = await this.productRepository.findOne({
      where: {
        id,
        shopId: tenantContext.shopId,
        deletedAt: IsNull(),
      } as FindOptionsWhere<Product>,
    });

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

    const product = await this.productRepository.findOne({
      where: {
        sku,
        shopId: tenantContext.shopId,
        deletedAt: IsNull(),
      } as FindOptionsWhere<Product>,
    });

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
      const existingProduct = await this.productRepository.existsBy({
        sku: updateProductDto.sku,
        shopId: tenantContext.shopId,
      });

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
    await this.productRepository.softDelete(id);
    await this.invalidateProductCache(tenantContext.shopId, id);

    this.logger.log(`Product ${id} soft deleted successfully`);
  }

  async restore(id: string, tenantContext: TenantContext): Promise<{ message: string }> {
    this.logger.log(`Restoring product ID: ${id} for shop: ${tenantContext.shopId}`);

    const product = await this.productRepository.findOne({
      where: { id, shopId: tenantContext.shopId } as FindOptionsWhere<Product>,
      withDeleted: true,
    });

    if (!product) {
      this.logger.warn(`Product ${id} not found in organization ${tenantContext.shopId}`);
      throw new NotFoundException('Product not found');
    }

    const result = await this.productRepository.restore({ id });

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

    await this.productRepository.update(id, { quantity });
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
    await this.productRepository.increment({ id }, 'quantity', adjustment);
    await this.invalidateProductCache(tenantContext.shopId, id);
    const updatedProduct = await this.findOne(id, tenantContext);

    this.logger.log(`Stock adjusted for product ${id}: ${updatedProduct.quantity}`);
    return updatedProduct;
  }

  async count(tenantContext: TenantContext, where?: FindOptionsWhere<Product>): Promise<number> {
    const countWhere: FindOptionsWhere<Product> = where
      ? ({
          ...where,
          shopId: tenantContext.shopId,
          deletedAt: IsNull() as unknown as Date,
        } as FindOptionsWhere<Product>)
      : ({
          shopId: tenantContext.shopId,
          deletedAt: IsNull() as unknown as Date,
        } as FindOptionsWhere<Product>);
    const count = await this.productRepository.count({ where: countWhere });
    this.logger.log(`Product count for organization ${tenantContext.shopId}: ${count}`);
    return count;
  }

  async countByCategory(category: string, tenantContext: TenantContext): Promise<number> {
    const count = await this.productRepository.count({
      where: {
        category,
        shopId: tenantContext.shopId,
        deletedAt: IsNull() as unknown as Date,
      } as FindOptionsWhere<Product>,
    });
    this.logger.log(`Product count for category ${category} in organization ${tenantContext.shopId}: ${count}`);
    return count;
  }

  async findByBarcode(barcode: string, tenantContext: TenantContext): Promise<Product> {
    const cacheKey = this.cacheService.generateKey('product', 'barcode', tenantContext.shopId, barcode);
    const cached = await this.cacheService.get<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log(`Finding product by barcode: ${barcode} for shop: ${tenantContext.shopId}`);

    const product = await this.productRepository.findOne({
      where: {
        barcode,
        shopId: tenantContext.shopId,
        deletedAt: IsNull() as unknown as Date,
      } as FindOptionsWhere<Product>,
    });

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

    const products = await this.productRepository.find({
      where: {
        shopId: tenantContext.shopId,
        quantity: LessThan(threshold) as unknown as number,
        deletedAt: IsNull() as unknown as Date,
      } as FindOptionsWhere<Product>,
    });

    this.logger.log(`Found ${products.length} products with low stock`);

    await this.cacheService.set(cacheKey, products, 120);

    return products;
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
