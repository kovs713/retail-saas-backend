import { Shop } from '../entities';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ShopRepository extends Repository<Shop> {
  constructor(@InjectRepository(Shop) private readonly repository: Repository<Shop>) {
    super(Shop, repository.manager);
  }

  async findBySlug(slug: string): Promise<Shop | null> {
    return this.repository.findOne({
      where: { slug },
    });
  }

  async findById(id: string): Promise<Shop | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async findByOwnerId(ownerId: string): Promise<Shop | null> {
    return this.repository.findOne({
      where: { ownerId },
    });
  }

  async existsBySlug(slug: string): Promise<boolean> {
    return this.repository.existsBy({ slug });
  }

  async existsBySlugAndNotId(slug: string, id: string): Promise<boolean> {
    return this.repository.existsBy({
      slug,
      id: id as unknown as never,
    });
  }
}
