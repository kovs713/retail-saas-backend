import { CreateProductDto } from '@/app/api/product/dto/create-product.dto';
import { UpdateProductDto } from '@/app/api/product/dto/update-product.dto';
import {
  PaginatedResult,
  PaginationQuery,
} from '@/app/common/types/pagination.type';
import { Product } from './product.entity';

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Check for duplicate SKU
    const existingProduct = await this.productRepository.existsBy({
      sku: createProductDto.sku,
    });

    if (existingProduct) {
      throw new ConflictException('Product with this SKU already exists');
    }

    const product = this.productRepository.create(createProductDto);

    return this.productRepository.save(product);
  }

  async findAll(query: PaginationQuery): Promise<PaginatedResult<Product>> {
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

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      } as FindOptionsWhere<Product>,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findOneBySku(sku: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: {
        sku,
        deletedAt: IsNull(),
      } as FindOptionsWhere<Product>,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    // Check if product exists
    const product = await this.findOne(id);

    // Check for duplicate SKU if SKU is being updated
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productRepository.existsBy({
        sku: updateProductDto.sku,
      });

      if (existingProduct) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    // Update product with DTO data (validation already done by DTO/class-validator)
    await this.productRepository.update(
      id,
      updateProductDto as QueryDeepPartialEntity<Product>,
    );
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    // Check if product exists
    await this.findOne(id);
    await this.productRepository.softDelete(id);
  }

  async restore(id: string): Promise<{ message: string }> {
    const result = await this.productRepository.restore({ id });

    if (result.affected === 0) {
      throw new NotFoundException('Product not found or already active');
    }

    return { message: 'Product restored successfully' };
  }

  async updateStock(id: string, quantity: number): Promise<Product> {
    await this.findOne(id);
    await this.productRepository.update(id, { quantity });
    return this.findOne(id);
  }

  async adjustStock(id: string, adjustment: number): Promise<Product> {
    await this.findOne(id);
    // increment is atomic at database level
    await this.productRepository.increment({ id }, 'quantity', adjustment);
    return this.findOne(id);
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
    return this.productRepository.count({ where: countWhere });
  }

  async countByCategory(category: string): Promise<number> {
    return this.productRepository.count({
      where: {
        category,
        deletedAt: IsNull() as unknown as Date,
      } as FindOptionsWhere<Product>,
    });
  }

  async findByBarcode(barcode: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: {
        barcode,
        deletedAt: IsNull() as unknown as Date,
      } as FindOptionsWhere<Product>,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findLowStock(threshold: number = 10): Promise<Product[]> {
    return this.productRepository.find({
      where: {
        quantity: LessThan(threshold) as unknown as number,
        deletedAt: IsNull() as unknown as Date,
      } as FindOptionsWhere<Product>,
    });
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
}
