import { ProductService } from '@/modules/product/product.service';
import { ProductRepository } from '@/modules/product/repositories';
import {
  CreateOrderDto,
  OrderResponseDto,
  OrderStatus,
  UpdateOrderStatusDto,
} from './dto';
import { Order } from './entities';
import { OrderRepository } from './repositories';

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { In, IsNull } from 'typeorm';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly productService: ProductService,
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

    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

    const items = createOrderDto.items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new NotFoundException(
          `Product ${item.productId} not found for this shop`,
        );
      }

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: Number(product.price),
      };
    });

    this.ensureSufficientStock(createOrderDto.items, productMap);

    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    await this.applyStockAdjustments(items, shopId, -1);

    try {
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
    } catch (error) {
      await this.rollbackStockAdjustments(items, shopId, 1);
      throw error;
    }
  }

  async findByShopId(
    shopId: string,
    options?: { page?: number; limit?: number; status?: string },
  ): Promise<{ data: Order[]; total: number; page: number; limit: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;

    const [orders, total] = await this.orderRepository.findByShopId(shopId, {
      page,
      limit,
      status: options?.status,
    });

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

  async updateStatus(
    id: string,
    shopId: string,
    updateStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    this.logger.log(`Updating order ${id} status to ${updateStatusDto.status}`);

    const order = await this.findByIdAndShopId(id, shopId);

    this.validateStatusTransition(order.status, updateStatusDto.status);

    const shouldRestoreStock = updateStatusDto.status === OrderStatus.CANCELLED;

    if (shouldRestoreStock) {
      await this.applyStockAdjustments(order.items, shopId, 1);
    }

    try {
      order.status = updateStatusDto.status;

      const updatedOrder = await this.orderRepository.save(order);
      this.logger.log(
        `Order ${id} status updated to ${updateStatusDto.status}`,
      );

      return updatedOrder;
    } catch (error) {
      if (shouldRestoreStock) {
        await this.rollbackStockAdjustments(order.items, shopId, -1);
      }
      throw error;
    }
  }

  private validateStatusTransition(
    currentStatus: Order['status'],
    newStatus: UpdateOrderStatusDto['status'],
  ): void {
    const validTransitions: Record<Order['status'], Order['status'][]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private ensureSufficientStock(
    items: CreateOrderDto['items'],
    productMap: Map<string, { id: string; quantity?: number | null }>,
  ): void {
    for (const item of items) {
      const product = productMap.get(item.productId);
      const availableQuantity = product?.quantity ?? 0;

      if (availableQuantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${item.productId}`,
        );
      }
    }
  }

  private async applyStockAdjustments(
    items: Array<{ productId: string; quantity: number }>,
    shopId: string,
    direction: 1 | -1,
  ): Promise<void> {
    const appliedItems: Array<{ productId: string; quantity: number }> = [];

    try {
      for (const item of items) {
        await this.productService.adjustStock(
          item.productId,
          item.quantity * direction,
          shopId,
        );
        appliedItems.push(item);
      }
    } catch (error) {
      const rollbackDirection: 1 | -1 = direction === 1 ? -1 : 1;
      await this.rollbackStockAdjustments(
        appliedItems,
        shopId,
        rollbackDirection,
      );
      throw error;
    }
  }

  private async rollbackStockAdjustments(
    items: Array<{ productId: string; quantity: number }>,
    shopId: string,
    direction: 1 | -1,
  ): Promise<void> {
    for (const item of items) {
      try {
        await this.productService.adjustStock(
          item.productId,
          item.quantity * direction,
          shopId,
        );
      } catch (rollbackError) {
        const error =
          rollbackError instanceof Error
            ? rollbackError
            : new Error(String(rollbackError));
        this.logger.error(
          `Failed to rollback stock for product ${item.productId}: ${error.message}`,
        );
      }
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
