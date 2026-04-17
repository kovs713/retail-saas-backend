import { Location } from '../entities';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class LocationRepository extends Repository<Location> {
  constructor(
    @InjectRepository(Location)
    private readonly repository: Repository<Location>,
  ) {
    super(Location, repository.manager);
  }

  async findByShopId(shopId: string): Promise<Location[]> {
    return this.repository.find({
      where: {
        shopId,
        isActive: true,
      },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async findAllByShopId(shopId: string): Promise<Location[]> {
    return this.repository.find({
      where: { shopId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async findByIdAndShopId(id: string, shopId: string): Promise<Location | null> {
    return this.repository.findOne({
      where: {
        id,
        shopId,
      },
    });
  }

  async findDefaultByShopId(shopId: string): Promise<Location | null> {
    return this.repository.findOne({
      where: {
        shopId,
        isDefault: true,
        isActive: true,
      },
    });
  }

  async countActiveByShopId(shopId: string): Promise<number> {
    return this.repository.count({
      where: {
        shopId,
        isActive: true,
      },
    });
  }

  async findOldestActiveByShopId(shopId: string): Promise<Location | null> {
    return this.repository.findOne({
      where: {
        shopId,
        isActive: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }
}
