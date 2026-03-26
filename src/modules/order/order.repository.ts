import { Order } from './order.entity';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

@Injectable()
export class OrderRepository extends Repository<Order> {
  constructor(@InjectRepository(Order) private readonly repository: Repository<Order>) {
    super(Order, repository.manager);
  }

  async findByShopId(
    shopId: string,
    options?: { page?: number; limit?: number; status?: string },
  ): Promise<[Order[], number]> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Order> = { shopId };

    if (options?.status) {
      where.status = options.status as Order['status'];
    }

    return this.repository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async findByIdAndShopId(id: string, shopId: string): Promise<Order | null> {
    return this.repository.findOne({
      where: { id, shopId },
    });
  }

  async findById(id: string): Promise<Order | null> {
    return this.repository.findOne({
      where: { id },
    });
  }
}
