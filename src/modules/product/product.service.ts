import { Pagination, PaginationApiResponse } from '@/common/dto';
import { TenantContext } from '@/common/types/tenant-context.type';
import { AppLogger } from '@/core/logger/app-logger.service';
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
  private readonly logger: AppLogger = new AppLogger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  private getTenantFilter(organizationId: string): FindOptionsWhere<Product> {
    return { organizationId, deletedAt: IsNull() } as FindOptionsWhere<Product>;
  }

  async create(createProductDto: CreateProductDto, tenantContext: TenantContext): Promise<Product> {
    this.logger.log(
      `Creating product with SKU: ${createProductDto.sku} for organization: ${tenantContext.organizationId}`,
    );

    const existingProduct = await this.productRepository.existsBy({
      sku: createProductDto.sku,
      organizationId: tenantContext.organizationId,
    });

    if (existingProduct) {
      this.logger.warn(
        `Product with SKU ${createProductDto.sku} already exists in organization ${tenantContext.organizationId}`,
      );
      throw new ConflictException('Product with this SKU already exists');
    }

    const product = this.productRepository.create({
      ...createProductDto,
      organizationId: tenantContext.organizationId,
    });
    const savedProduct = await this.productRepository.save(product);

    this.logger.log(`Product created successfully with ID: ${savedProduct.id}`);
    return savedProduct;
  }

  async findAll(query: Pagination, tenantContext: TenantContext): Promise<PaginationApiResponse<Product>> {
    this.logger.log(
      `Finding products with query: page=${query.page}, limit=${query.limit}, search=${query.search || 'none'} for organization: ${tenantContext.organizationId}`,
    );

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Product> = {
      organizationId: tenantContext.organizationId,
      deletedAt: IsNull(),
    };

    if (query.category) {
      where.category = query.category;
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

    return {
      success: true,
      data: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, tenantContext: TenantContext): Promise<Product> {
    this.logger.log(`Finding product by ID: ${id} for organization: ${tenantContext.organizationId}`);

    const product = await this.productRepository.findOne({
      where: {
        id,
        organizationId: tenantContext.organizationId,
        deletedAt: IsNull(),
      } as FindOptionsWhere<Product>,
    });

    if (!product) {
      this.logger.warn(`Product with ID ${id} not found in organization ${tenantContext.organizationId}`);
      throw new NotFoundException('Product not found');
    }

    this.logger.log(`Product found: ${product.name}`);
    return product;
  }

  async findOneBySku(sku: string, tenantContext: TenantContext): Promise<Product> {
    this.logger.log(`Finding product by SKU: ${sku} for organization: ${tenantContext.organizationId}`);

    const product = await this.productRepository.findOne({
      where: {
        sku,
        organizationId: tenantContext.organizationId,
        deletedAt: IsNull(),
      } as FindOptionsWhere<Product>,
    });

    if (!product) {
      this.logger.warn(`Product with SKU ${sku} not found in organization ${tenantContext.organizationId}`);
      throw new NotFoundException('Product not found');
    }

    this.logger.log(`Product found: ${product.name}`);
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, tenantContext: TenantContext): Promise<Product> {
    this.logger.log(`Updating product ID: ${id} for organization: ${tenantContext.organizationId}`);

    const product = await this.findOne(id, tenantContext);

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productRepository.existsBy({
        sku: updateProductDto.sku,
        organizationId: tenantContext.organizationId,
      });

      if (existingProduct) {
        this.logger.warn(
          `Product with SKU ${updateProductDto.sku} already exists in organization ${tenantContext.organizationId}`,
        );
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    await this.productRepository.update(id, updateProductDto as QueryDeepPartialEntity<Product>);
    const updatedProduct = await this.findOne(id, tenantContext);

    this.logger.log(`Product updated successfully: ${updatedProduct.name}`);
    return updatedProduct;
  }

  async remove(id: string, tenantContext: TenantContext): Promise<void> {
    this.logger.log(`Soft deleting product ID: ${id} for organization: ${tenantContext.organizationId}`);

    await this.findOne(id, tenantContext);
    await this.productRepository.softDelete(id);

    this.logger.log(`Product ${id} soft deleted successfully`);
  }

  async restore(id: string, tenantContext: TenantContext): Promise<{ message: string }> {
    this.logger.log(`Restoring product ID: ${id} for organization: ${tenantContext.organizationId}`);

    const product = await this.productRepository.findOne({
      where: { id, organizationId: tenantContext.organizationId } as FindOptionsWhere<Product>,
      withDeleted: true,
    });

    if (!product) {
      this.logger.warn(`Product ${id} not found in organization ${tenantContext.organizationId}`);
      throw new NotFoundException('Product not found');
    }

    const result = await this.productRepository.restore({ id });

    if (result.affected === 0) {
      this.logger.warn(`Product ${id} not found or already active`);
      throw new NotFoundException('Product not found or already active');
    }

    this.logger.log(`Product ${id} restored successfully`);
    return { message: 'Product restored successfully' };
  }

  async updateStock(id: string, quantity: number, tenantContext: TenantContext): Promise<Product> {
    this.logger.log(
      `Updating stock for product ID: ${id}, quantity: ${quantity} for organization: ${tenantContext.organizationId}`,
    );

    await this.productRepository.update(id, { quantity });
    const updatedProduct = await this.findOne(id, tenantContext);

    this.logger.log(`Stock updated for product ${id}: ${updatedProduct.quantity}`);
    return updatedProduct;
  }

  async adjustStock(id: string, adjustment: number, tenantContext: TenantContext): Promise<Product> {
    this.logger.log(
      `Adjusting stock for product ID: ${id}, adjustment: ${adjustment} for organization: ${tenantContext.organizationId}`,
    );

    await this.findOne(id, tenantContext);
    await this.productRepository.increment({ id }, 'quantity', adjustment);
    const updatedProduct = await this.findOne(id, tenantContext);

    this.logger.log(`Stock adjusted for product ${id}: ${updatedProduct.quantity}`);
    return updatedProduct;
  }

  async count(tenantContext: TenantContext, where?: FindOptionsWhere<Product>): Promise<number> {
    const countWhere: FindOptionsWhere<Product> = where
      ? ({
          ...where,
          organizationId: tenantContext.organizationId,
          deletedAt: IsNull() as unknown as Date,
        } as FindOptionsWhere<Product>)
      : ({
          organizationId: tenantContext.organizationId,
          deletedAt: IsNull() as unknown as Date,
        } as FindOptionsWhere<Product>);
    const count = await this.productRepository.count({ where: countWhere });
    this.logger.log(`Product count for organization ${tenantContext.organizationId}: ${count}`);
    return count;
  }

  async countByCategory(category: string, tenantContext: TenantContext): Promise<number> {
    const count = await this.productRepository.count({
      where: {
        category,
        organizationId: tenantContext.organizationId,
        deletedAt: IsNull() as unknown as Date,
      } as FindOptionsWhere<Product>,
    });
    this.logger.log(`Product count for category ${category} in organization ${tenantContext.organizationId}: ${count}`);
    return count;
  }

  async findByBarcode(barcode: string, tenantContext: TenantContext): Promise<Product> {
    this.logger.log(`Finding product by barcode: ${barcode} for organization: ${tenantContext.organizationId}`);

    const product = await this.productRepository.findOne({
      where: {
        barcode,
        organizationId: tenantContext.organizationId,
        deletedAt: IsNull() as unknown as Date,
      } as FindOptionsWhere<Product>,
    });

    if (!product) {
      this.logger.warn(`Product with barcode ${barcode} not found in organization ${tenantContext.organizationId}`);
      throw new NotFoundException('Product not found');
    }

    this.logger.log(`Product found: ${product.name}`);
    return product;
  }

  async findLowStock(threshold: number = 10, tenantContext: TenantContext): Promise<Product[]> {
    this.logger.log(
      `Finding products with low stock (threshold: ${threshold}) for organization: ${tenantContext.organizationId}`,
    );

    const products = await this.productRepository.find({
      where: {
        organizationId: tenantContext.organizationId,
        quantity: LessThan(threshold) as unknown as number,
        deletedAt: IsNull() as unknown as Date,
      } as FindOptionsWhere<Product>,
    });

    this.logger.log(`Found ${products.length} products with low stock`);
    return products;
  }

  private getOrderOptions(sortBy?: string, sortOrder?: 'ASC' | 'DESC'): Record<string, 'ASC' | 'DESC'> {
    const order: Record<string, 'ASC' | 'DESC'> = { createdAt: 'DESC' };

    if (sortBy) {
      order[sortBy] = sortOrder ?? 'ASC';
    }

    return order;
  }
}
