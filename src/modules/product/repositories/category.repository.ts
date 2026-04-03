import { Category } from '../entities';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CategoryRepository extends Repository<Category> {
  constructor(@InjectRepository(Category) private readonly repository: Repository<Category>) {
    super(Category, repository.manager);
  }

  async findAllByShop(shopId: string): Promise<Category[]> {
    return this.repository.find({
      where: { shopId },
      order: { name: 'ASC' },
    });
  }

  async findBySlug(shopId: string, slug: string): Promise<Category | null> {
    return this.repository.findOne({
      where: {
        shopId,
        slug,
      },
    });
  }

  async findByIdAndShop(id: string, shopId: string): Promise<Category | null> {
    return this.repository.findOne({
      where: { id, shopId },
    });
  }

  async existsBySlugAndShop(shopId: string, slug: string): Promise<boolean> {
    return this.repository.existsBy({
      shopId,
      slug,
    });
  }

  async countProductsInCategory(categoryId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('category')
      .innerJoin('products', 'product', 'product.categoryId = category.id')
      .select('COUNT(product.id)', 'count')
      .where('category.id = :categoryId', { categoryId })
      .getRawOne<{ count: string }>();

    return Number(result?.count ?? 0);
  }
}
