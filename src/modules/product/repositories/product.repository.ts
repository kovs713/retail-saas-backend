import { Pagination } from '@/common/dto';
import { Product } from '../entities';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  FindOptionsWhere,
  IsNull,
  LessThan,
  MoreThan,
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
    return this.findAllBySource(shopId, query);
  }

  async findSyncedAll(
    shopId: string,
    query: Pagination,
  ): Promise<[Product[], number]> {
    return this.findAllBySource(shopId, query, 'evotor');
  }

  private async findAllBySource(
    shopId: string,
    query: Pagination,
    externalSource?: string,
  ): Promise<[Product[], number]> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.shopId = :shopId', { shopId })
      .andWhere('product.deletedAt IS NULL');

    if (externalSource) {
      queryBuilder.andWhere('product.externalSource = :externalSource', {
        externalSource,
      });
    }

    if (query.category) {
      queryBuilder.andWhere('product.categoryId = :categoryId', {
        categoryId: query.category,
      });
    }

    if (query.minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', {
        minPrice: query.minPrice,
      });
    }
    if (query.maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', {
        maxPrice: query.maxPrice,
      });
    }

    if (query.inStock) {
      queryBuilder.andWhere('product.quantity > 0');
    }

    if (query.search) {
      const search = `%${this.escapeLikePattern(query.search)}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where(`product.name ILIKE :search ESCAPE '\\'`, { search })
            .orWhere(`product.sku ILIKE :search ESCAPE '\\'`, { search })
            .orWhere(
              `COALESCE(product.description, '') ILIKE :search ESCAPE '\\'`,
              { search },
            )
            .orWhere(
              `COALESCE(product.barcode, '') ILIKE :search ESCAPE '\\'`,
              { search },
            )
            .orWhere(`COALESCE(category.name, '') ILIKE :search ESCAPE '\\'`, {
              search,
            })
            .orWhere(
              `CAST(COALESCE(product.metadata, '{}'::jsonb) AS text) ILIKE :search ESCAPE '\\'`,
              { search },
            );
        }),
      );
    }

    const order = this.getOrderOptions(query.sortBy, query.sortOrder);
    const [primaryField, primaryDirection] = Object.entries(order)[0] ?? [
      'createdAt',
      'DESC',
    ];

    queryBuilder.orderBy(`product.${primaryField}`, primaryDirection);

    for (const [field, direction] of Object.entries(order).slice(1)) {
      queryBuilder.addOrderBy(`product.${field}`, direction);
    }

    queryBuilder.skip(skip).take(limit);

    return queryBuilder.getManyAndCount();
  }

  async findById(id: string, shopId: string): Promise<Product | null> {
    return this.repository.findOne({
      where: {
        id,
        shopId,
        deletedAt: IsNull(),
      },
      relations: ['category', 'images'],
    });
  }

  async findSyncedById(id: string, shopId: string): Promise<Product | null> {
    return this.repository.findOne({
      where: {
        id,
        shopId,
        externalSource: 'evotor',
        deletedAt: IsNull(),
      },
      relations: ['category', 'images'],
    });
  }

  async findByIdWithShop(id: string, shopId: string): Promise<Product | null> {
    return this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.shop', 'shop')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.id = :id', { id })
      .andWhere('product.shopId = :shopId', { shopId })
      .andWhere('product.deletedAt IS NULL')
      .getOne();
  }

  async findSyncedByIdWithShop(
    id: string,
    shopId: string,
  ): Promise<Product | null> {
    return this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.shop', 'shop')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.id = :id', { id })
      .andWhere('product.shopId = :shopId', { shopId })
      .andWhere('product.externalSource = :externalSource', {
        externalSource: 'evotor',
      })
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
      .leftJoinAndSelect('product.images', 'images')
      .where('product.id = :id', { id })
      .andWhere('shop.slug = :shopSlug', { shopSlug })
      .andWhere('shop.isActive = true')
      .andWhere('product.externalSource = :externalSource', {
        externalSource: 'evotor',
      })
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
      relations: ['category', 'images'],
    });
  }

  async findSyncedBySku(sku: string, shopId: string): Promise<Product | null> {
    return this.repository.findOne({
      where: {
        sku,
        shopId,
        externalSource: 'evotor',
        deletedAt: IsNull(),
      },
      relations: ['category', 'images'],
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
      relations: ['category', 'images'],
    });
  }

  async findSyncedByBarcode(
    barcode: string,
    shopId: string,
  ): Promise<Product | null> {
    return this.repository.findOne({
      where: {
        barcode,
        shopId,
        externalSource: 'evotor',
        deletedAt: IsNull(),
      },
      relations: ['category', 'images'],
    });
  }

  async findAvailableByShop(
    shopId: string,
    limit: number = 100,
  ): Promise<Product[]> {
    return this.repository.find({
      where: {
        shopId,
        quantity: MoreThan(0),
        deletedAt: IsNull(),
      },
      relations: ['category', 'images'],
      take: limit,
      order: {
        quantity: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findSyncedAvailableByShop(
    shopId: string,
    limit: number = 100,
  ): Promise<Product[]> {
    return this.repository.find({
      where: {
        shopId,
        externalSource: 'evotor',
        quantity: MoreThan(0),
        deletedAt: IsNull(),
      },
      relations: ['category', 'images'],
      take: limit,
      order: {
        quantity: 'DESC',
        createdAt: 'DESC',
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

  async findSyncedLowStock(
    shopId: string,
    threshold: number = 10,
  ): Promise<Product[]> {
    return this.repository.find({
      where: {
        shopId,
        externalSource: 'evotor',
        quantity: LessThan(threshold),
        deletedAt: IsNull(),
      },
    });
  }

  async findActiveByShop(shopId: string): Promise<Product[]> {
    return this.repository.find({
      where: {
        shopId,
        deletedAt: IsNull(),
      },
      relations: ['category', 'images'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findSyncedActiveByShop(shopId: string): Promise<Product[]> {
    return this.repository.find({
      where: {
        shopId,
        externalSource: 'evotor',
        deletedAt: IsNull(),
      },
      relations: ['category', 'images'],
      order: {
        createdAt: 'DESC',
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

  async countSyncedByShop(
    shopId: string,
    where?: FindOptionsWhere<Product>,
  ): Promise<number> {
    const countWhere: FindOptionsWhere<Product> = where
      ? {
          ...where,
          shopId,
          externalSource: 'evotor',
          deletedAt: IsNull(),
        }
      : {
          shopId,
          externalSource: 'evotor',
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

  async countSyncedByCategory(
    shopId: string,
    categoryId: string,
  ): Promise<number> {
    return this.repository.count({
      where: {
        categoryId,
        shopId,
        externalSource: 'evotor',
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
      relations: ['category', 'images'],
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

  async findSyncedAdmin(query: {
    skip?: number;
    take?: number;
    evotorUserId?: string;
    storeId?: string;
    storeUuid?: string;
    productId?: string;
    search?: string;
    name?: string;
    code?: string;
  }): Promise<[Product[], number]> {
    const skip = query.skip ?? 0;
    const take = Math.min(query.take ?? 20, 100);
    const queryBuilder = this.repository
      .createQueryBuilder('product')
      .where('product.externalSource = :externalSource', {
        externalSource: 'evotor',
      })
      .andWhere('product.deletedAt IS NULL');

    const storeId = query.storeId ?? query.storeUuid;
    if (storeId) {
      queryBuilder.andWhere('product.externalStoreId = :storeId', {
        storeId,
      });
    }

    if (query.productId) {
      queryBuilder.andWhere('product.externalId = :productId', {
        productId: query.productId,
      });
    }

    if (query.code) {
      queryBuilder.andWhere('product.sku = :code', { code: query.code });
    }

    const nameFilter = query.search ?? query.name;
    if (nameFilter) {
      const search = `%${this.escapeLikePattern(nameFilter)}%`;
      queryBuilder.andWhere(`product.name ILIKE :search ESCAPE '\\'`, {
        search,
      });
    }

    if (query.evotorUserId) {
      queryBuilder.andWhere(
        "product.metadata -> 'evotor' ->> 'userId' = :evotorUserId",
        { evotorUserId: query.evotorUserId },
      );
    }

    return queryBuilder
      .orderBy('product.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();
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

  async countAll(): Promise<number> {
    return this.repository.count({
      where: { deletedAt: IsNull() },
    });
  }

  async countByShopWithoutProducts(): Promise<number> {
    const shopsWithProducts = await this.repository
      .createQueryBuilder('product')
      .select('DISTINCT product.shopId', 'shopId')
      .where('product.deletedAt IS NULL')
      .getRawMany();

    const shopIds = new Set(
      shopsWithProducts.map((r: Record<string, unknown>) => r.shopId),
    );

    const totalShops = await this.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('shops', 's')
      .getRawOne<{ count: string }>();

    return Number(totalShops?.count ?? 0) - shopIds.size;
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
    const order: Record<string, 'ASC' | 'DESC'> = {};

    if (sortBy) {
      order[sortBy] = sortOrder ?? 'ASC';
    }

    order.createdAt = 'DESC';

    return order;
  }

  private escapeLikePattern(value: string): string {
    return value.replace(/([%_\\])/g, '\\$1');
  }
}
