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

  async getRevenueByDay(shopId: string, from: Date, to: Date): Promise<{ date: string; revenue: number }[]> {
    return this.repository
      .createQueryBuilder('order')
      .select('DATE(order.createdAt)', 'date')
      .addSelect('SUM(order.totalAmount)', 'revenue')
      .where('order.shopId = :shopId', { shopId })
      .andWhere('order.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('order.status != :status', { status: 'CANCELLED' })
      .groupBy('DATE(order.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  async getOrdersByDay(shopId: string, from: Date, to: Date): Promise<{ date: string; count: number }[]> {
    return this.repository
      .createQueryBuilder('order')
      .select('DATE(order.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('order.shopId = :shopId', { shopId })
      .andWhere('order.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('order.status != :status', { status: 'CANCELLED' })
      .groupBy('DATE(order.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  async getAOV(shopId: string, from: Date, to: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('order')
      .select('AVG(order.totalAmount)', 'aov')
      .where('order.shopId = :shopId', { shopId })
      .andWhere('order.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('order.status != :status', { status: 'CANCELLED' })
      .getRawOne<{ aov: number | null }>();

    return Number(result?.aov) || 0;
  }

  async getNewCustomersCount(shopId: string, from: Date, to: Date): Promise<number> {
    const subQuery = this.repository
      .createQueryBuilder('order_inner')
      .select('MIN(order_inner.createdAt)', 'firstOrderAt')
      .addSelect('order_inner.customerPhone', 'customerPhone')
      .where('order_inner.shopId = :shopId', { shopId })
      .andWhere('order_inner.status != :status', { status: 'CANCELLED' })
      .groupBy('order_inner.customerPhone')
      .having('MIN(order_inner.createdAt) BETWEEN :from AND :to', { from, to });

    const result = await this.repository.manager
      .createQueryBuilder()
      .from(`(${subQuery.getQuery()})`, 'new_customers')
      .setParameters({ shopId, from, to, status: 'CANCELLED' })
      .getCount();

    return result;
  }

  async getTotalCustomersCount(shopId: string, from: Date, to: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.customerPhone)', 'count')
      .where('order.shopId = :shopId', { shopId })
      .andWhere('order.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere('order.status != :status', { status: 'CANCELLED' })
      .getRawOne<{ count: string }>();

    return Number(result?.count) || 0;
  }

  async getRepeatCustomerCount(shopId: string, from: Date, to: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('order')
      .select('order.customerPhone', 'customerPhone')
      .addSelect('COUNT(*)', 'orderCount')
      .where('order.shopId = :shopId', { shopId })
      .andWhere('order.createdAt <= :to', { to })
      .andWhere('order.status != :status', { status: 'CANCELLED' })
      .groupBy('order.customerPhone')
      .having('COUNT(*) > 1')
      .getCount();
  }
}
