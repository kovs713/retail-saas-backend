import { ProductImage } from '../entities';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ProductImageRepository extends Repository<ProductImage> {
  constructor(
    @InjectRepository(ProductImage)
    private readonly repository: Repository<ProductImage>,
  ) {
    super(ProductImage, repository.manager);
  }

  async findByProductId(
    productId: string,
    shopId: string,
  ): Promise<ProductImage | null> {
    return this.repository.findOne({
      where: { id: productId, shopId },
    });
  }

  async findAllByProductId(
    productId: string,
    shopId: string,
  ): Promise<ProductImage[]> {
    return this.repository.find({
      where: { productId, shopId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findPrimaryByProductId(
    productId: string,
    shopId: string,
  ): Promise<ProductImage | null> {
    return this.repository.findOne({
      where: { productId, shopId, isPrimary: true },
    });
  }

  async countByProductId(productId: string, shopId: string): Promise<number> {
    return this.repository.count({
      where: { productId, shopId },
    });
  }

  async findAllByShopId(shopId: string): Promise<ProductImage[]> {
    return this.repository.find({
      where: { shopId, isPrimary: true },
      order: { createdAt: 'DESC' },
    });
  }

  async hardDeleteById(id: string, shopId: string): Promise<void> {
    await this.repository.delete({ id, shopId });
  }

  async hardDeleteByProductId(
    productId: string,
    shopId: string,
  ): Promise<void> {
    await this.repository.delete({ productId, shopId });
  }

  async existsById(id: string, shopId: string): Promise<boolean> {
    return this.repository.exists({
      where: { id, shopId },
    });
  }

  async findWithProductById(
    id: string,
    shopId: string,
  ): Promise<ProductImage | null> {
    return this.repository
      .createQueryBuilder('productImage')
      .leftJoinAndSelect('productImage.product', 'product')
      .leftJoinAndSelect('product.shop', 'shop')
      .where('productImage.id = :id', { id })
      .andWhere('productImage.shopId = :shopId', { shopId })
      .getOne();
  }
}
