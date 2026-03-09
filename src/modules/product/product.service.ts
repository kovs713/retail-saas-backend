import { PaginatedResult, PaginationQuery } from '@/common/types/pagination.type';
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

  async create(createProductDto: CreateProductDto): Promise<Product> {
    this.logger.log(`Creating product with SKU: ${createProductDto.sku}`);

    // Check for duplicate SKU
    const existingProduct = await this.productRepository.existsBy({
      sku: createProductDto.sku,
    });

    if (existingProduct) {
      this.logger.warn(`Product with SKU ${createProductDto.sku} already exists`);
      throw new ConflictException('Product with this SKU already exists');
    }

    const product = this.productRepository.create(createProductDto);
    const savedProduct = await this.productRepository.save(product);

    this.logger.log(`Product created successfully with ID: ${savedProduct.id}`);
    return savedProduct;
  }

  async findAll(query: PaginationQuery): Promise<PaginatedResult<Product>> {
    this.logger.log(
      `Finding products with query: page=${query.page}, limit=${query.limit}, search=${query.search || 'none'}`,
    );

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100); // Cap limit to 100
    const skip = (page - 1) * limit;

    // Build base where clause
    const where: FindOptionsWhere<Product> = {
      deletedAt: IsNull(),
    };

    // Apply category filter
    if (query.category) {
      where.category = query.category;
    }

    // Apply price filters using proper TypeORM operators
    if (query.minPrice !== undefined) {
      where.price = MoreThanOrEqual(query.minPrice);
    }
    if (query.maxPrice !== undefined) {
      where.price = LessThanOrEqual(query.maxPrice);
    }

    // Escape search term to prevent SQL injection via LIKE wildcards
    let searchWhere: FindOptionsWhere<Product> | null = null;
    if (query.search) {
      // Escape %, _, and \ characters to prevent injection
      const escapedSearch = query.search.replace(/([%_\\])/g, '\\$1');
      searchWhere = {
        ...where,
        name: ILike(`%${escapedSearch}%`),
      } as FindOptionsWhere<Product>;
    }

    // Build query options
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
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Product> {
    this.logger.log(`Finding product by ID: ${id}`);

    const product = await this.productRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      } as FindOptionsWhere<Product>,
    });

    if (!product) {
      this.logger.warn(`Product with ID ${id} not found`);
      throw new NotFoundException('Product not found');
    }

    this.logger.log(`Product found: ${product.name}`);
    return product;
  }

  async findOneBySku(sku: string): Promise<Product> {
    this.logger.log(`Finding product by SKU: ${sku}`);

    const product = await this.productRepository.findOne({
      where: {
        sku,
        deletedAt: IsNull(),
      } as FindOptionsWhere<Product>,
    });

    if (!product) {
      this.logger.warn(`Product with SKU ${sku} not found`);
      throw new NotFoundException('Product not found');
    }

    this.logger.log(`Product found: ${product.name}`);
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    this.logger.log(`Updating product ID: ${id}`);

    // Check if product exists
    const product = await this.findOne(id);

    // Check for duplicate SKU if SKU is being updated
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productRepository.existsBy({
        sku: updateProductDto.sku,
      });

      if (existingProduct) {
        this.logger.warn(`Product with SKU ${updateProductDto.sku} already exists`);
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    // Update product with DTO data (validation already done by DTO/class-validator)
    await this.productRepository.update(id, updateProductDto as QueryDeepPartialEntity<Product>);
    const updatedProduct = await this.findOne(id);

    this.logger.log(`Product updated successfully: ${updatedProduct.name}`);
    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Soft deleting product ID: ${id}`);

    // Check if product exists
    await this.findOne(id);
    await this.productRepository.softDelete(id);

    this.logger.log(`Product ${id} soft deleted successfully`);
  }

  async restore(id: string): Promise<{ message: string }> {
    this.logger.log(`Restoring product ID: ${id}`);

    const result = await this.productRepository.restore({ id });

    if (result.affected === 0) {
      this.logger.warn(`Product ${id} not found or already active`);
      throw new NotFoundException('Product not found or already active');
    }

    this.logger.log(`Product ${id} restored successfully`);
    return { message: 'Product restored successfully' };
  }

  async updateStock(id: string, quantity: number): Promise<Product> {
    this.logger.log(`Updating stock for product ID: ${id}, quantity: ${quantity}`);

    await this.findOne(id);
    await this.productRepository.update(id, { quantity });
    const updatedProduct = await this.findOne(id);

    this.logger.log(`Stock updated for product ${id}: ${updatedProduct.quantity}`);
    return updatedProduct;
  }

  async adjustStock(id: string, adjustment: number): Promise<Product> {
    this.logger.log(`Adjusting stock for product ID: ${id}, adjustment: ${adjustment}`);

    await this.findOne(id);
    // increment is atomic at database level
    await this.productRepository.increment({ id }, 'quantity', adjustment);
    const updatedProduct = await this.findOne(id);

    this.logger.log(`Stock adjusted for product ${id}: ${updatedProduct.quantity}`);
    return updatedProduct;
  }

  async count(where?: FindOptionsWhere<Product>): Promise<number> {
    const countWhere: FindOptionsWhere<Product> = where
      ? ({
          ...where,
          deletedAt: IsNull() as unknown as Date,
        } as FindOptionsWhere<Product>)
      : ({
          deletedAt: IsNull() as unknown as Date,
        } as FindOptionsWhere<Product>);
    const count = await this.productRepository.count({ where: countWhere });
    this.logger.log(`Product count: ${count}`);
    return count;
  }

  async countByCategory(category: string): Promise<number> {
    const count = await this.productRepository.count({
      where: {
        category,
        deletedAt: IsNull() as unknown as Date,
      } as FindOptionsWhere<Product>,
    });
    this.logger.log(`Product count for category ${category}: ${count}`);
    return count;
  }

  async findByBarcode(barcode: string): Promise<Product> {
    this.logger.log(`Finding product by barcode: ${barcode}`);

    const product = await this.productRepository.findOne({
      where: {
        barcode,
        deletedAt: IsNull() as unknown as Date,
      } as FindOptionsWhere<Product>,
    });

    if (!product) {
      this.logger.warn(`Product with barcode ${barcode} not found`);
      throw new NotFoundException('Product not found');
    }

    this.logger.log(`Product found: ${product.name}`);
    return product;
  }

  async findLowStock(threshold: number = 10): Promise<Product[]> {
    this.logger.log(`Finding products with low stock (threshold: ${threshold})`);

    const products = await this.productRepository.find({
      where: {
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
