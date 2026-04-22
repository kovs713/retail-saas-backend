import { Pagination } from '@/common/dto';
import { Product } from '../entities';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindManyOptions,
  FindOptionsWhere,
  ILike,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

@Injectable()
export class ProductRepository extends Repository<Product> {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
  ) {
    super(Product, repository.manager);
  }

  async findAll(
    shopId: string,
    query: Pagination,
  ): Promise<[Product[], number]> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Product> = {
      shopId,
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
      };
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
            },
          ]
        : where,
      relations: ['category'],
      skip,
      take: limit,
      order: this.getOrderOptions(query.sortBy, query.sortOrder),
    };

    return this.repository.findAndCount(options);
  }

  async findById(id: string, shopId: string): Promise<Product | null> {
    return this.repository.findOne({
      where: {
        id,
        shopId,
        deletedAt: IsNull(),
      },
    });
  }

  async findByIdWithShop(id: string, shopId: string): Promise<Product | null> {
    return this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.shop', 'shop')
      .where('product.id = :id', { id })
      .andWhere('product.shopId = :shopId', { shopId })
      .andWhere('product.deletedAt IS NULL')
      .getOne();
  }

  async findByIdAndShopSlug(
    id: string,
    shopSlug: string,
  ): Promise<Product | null> {
    return this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.shop', 'shop')
      .where('product.id = :id', { id })
      .andWhere('shop.slug = :shopSlug', { shopSlug })
      .andWhere('shop.isActive = true')
      .andWhere('product.deletedAt IS NULL')
      .getOne();
  }

  async findBySku(sku: string, shopId: string): Promise<Product | null> {
    return this.repository.findOne({
      where: {
        sku,
        shopId,
        deletedAt: IsNull(),
      },
    });
  }

  async findByBarcode(
    barcode: string,
    shopId: string,
  ): Promise<Product | null> {
    return this.repository.findOne({
      where: {
        barcode,
        shopId,
        deletedAt: IsNull(),
      },
    });
  }

  async findLowStock(
    shopId: string,
    threshold: number = 10,
  ): Promise<Product[]> {
    return this.repository.find({
      where: {
        shopId,
        quantity: LessThan(threshold),
        deletedAt: IsNull(),
      },
    });
  }

  async countByShop(
    shopId: string,
    where?: FindOptionsWhere<Product>,
  ): Promise<number> {
    const countWhere: FindOptionsWhere<Product> = where
      ? {
          ...where,
          shopId,
          deletedAt: IsNull(),
        }
      : {
          shopId,
          deletedAt: IsNull(),
        };
    return this.repository.count({
      where: countWhere,
    });
  }

  async findByCategory(shopId: string, categoryId: string): Promise<Product[]> {
    return this.repository.find({
      where: {
        categoryId,
        shopId,
        deletedAt: IsNull(),
      },
    });
  }

  async countByCategory(shopId: string, categoryId: string): Promise<number> {
    return this.repository.count({
      where: {
        categoryId,
        shopId,
        deletedAt: IsNull(),
      },
    });
  }

  async findOneWithDeleted(
    id: string,
    shopId: string,
  ): Promise<Product | null> {
    return this.repository.findOne({
      where: {
        id,
        shopId,
      },
      withDeleted: true,
    });
  }

  async findSyncedByShop(
    shopId: string,
    withDeleted = false,
  ): Promise<Product[]> {
    return this.repository.find({
      where: {
        shopId,
        externalSource: 'evotor',
      },
      withDeleted,
    });
  }

  async incrementQuantity(
    id: string,
    shopId: string,
    adjustment: number,
  ): Promise<void> {
    await this.repository.increment(
      {
        id,
        shopId,
      },
      'quantity',
      adjustment,
    );
  }

  async existsBySkuAndShop(sku: string, shopId: string): Promise<boolean> {
    return this.repository.existsBy({
      sku,
      shopId,
    });
  }

  async softDeleteById(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async restoreById(id: string): Promise<{ affected?: number }> {
    return this.repository.restore({ id });
  }

  async updateQuantity(
    id: string,
    shopId: string,
    quantity: number,
  ): Promise<void> {
    await this.repository.update(
      {
        id,
        shopId,
      },
      {
        quantity,
      },
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
}
