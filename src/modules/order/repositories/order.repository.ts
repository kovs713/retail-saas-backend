import { OrderStatus } from '@/common/enums';
import { Order } from '../entities';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Not, Repository } from 'typeorm';

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

  async getTotalRevenue(shopId: string, from: Date, to: Date): Promise<number> {
    const total = await this.repository.sum('totalAmount', {
      shopId,
      createdAt: Between(from, to),
      status: Not(OrderStatus.CANCELLED),
    });

    return total ?? 0;
  }

  async getTotalOrders(shopId: string, from: Date, to: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('order')
      .where('order.shopId = :shopId', { shopId })
      .andWhere('order.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('order.status != :status', { status: 'CANCELLED' })
      .getCount();
  }
}
