import { ProductRepository } from '@/modules/product/repositories';
import { CreateOrderDto, OrderResponseDto, OrderStatus, UpdateOrderStatusDto } from './dto';
import { Order } from './entities';
import { OrderRepository } from './repositories';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { In, IsNull } from 'typeorm';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async create(shopId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    this.logger.log(`Creating order for shop ${shopId}`);

    const productIds = createOrderDto.items.map((item) => item.productId);
    const products = await this.productRepository.find({
      where: {
        id: In(productIds),
        shopId,
        deletedAt: IsNull(),
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    const items = createOrderDto.items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found for this shop`);
      }

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: Number(product.price),
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = this.orderRepository.create({
      shopId,
      customerName: createOrderDto.customerName,
      customerPhone: createOrderDto.customerPhone,
      items,
      totalAmount,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await this.orderRepository.save(order);
    this.logger.log(`Order created: ${savedOrder.id}`);

    return savedOrder;
  }

  async findByShopId(
    shopId: string,
    options?: { page?: number; limit?: number; status?: string },
  ): Promise<{ data: Order[]; total: number; page: number; limit: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;

    const [orders, total] = await this.orderRepository.findByShopId(shopId, { page, limit, status: options?.status });

    return {
      data: orders,
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return order;
  }

  async findByIdAndShopId(id: string, shopId: string): Promise<Order> {
    const order = await this.orderRepository.findByIdAndShopId(id, shopId);

    if (!order) {
      throw new NotFoundException(`Order ${id} not found for this shop`);
    }

    return order;
  }

  async updateStatus(id: string, shopId: string, updateStatusDto: UpdateOrderStatusDto): Promise<Order> {
    this.logger.log(`Updating order ${id} status to ${updateStatusDto.status}`);

    const order = await this.findByIdAndShopId(id, shopId);

    // Validate status transition
    this.validateStatusTransition(order.status, updateStatusDto.status);

    order.status = updateStatusDto.status;

    const updatedOrder = await this.orderRepository.save(order);
    this.logger.log(`Order ${id} status updated to ${updateStatusDto.status}`);

    return updatedOrder;
  }

  private validateStatusTransition(currentStatus: Order['status'], newStatus: UpdateOrderStatusDto['status']): void {
    const validTransitions: Record<Order['status'], Order['status'][]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }

  toResponseDto(order: Order): OrderResponseDto {
    return {
      id: order.id,
      shopId: order.shopId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      totalAmount: Number(order.totalAmount),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
