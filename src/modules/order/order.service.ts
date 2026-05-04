import { Product } from '@/modules/product/entities';
import { ProductService } from '@/modules/product/product.service';
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
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productService: ProductService,
    private readonly dataSource: DataSource,
  ) {}

  async create(shopId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    this.logger.log(`Creating order for shop ${shopId}`);

    const { order, touchedProductIds } = await this.dataSource.transaction(
      async (manager) => {
        const products = await this.findProductsForUpdate(
          manager,
          createOrderDto.items.map((item) => item.productId),
          shopId,
        );
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

        for (const item of items) {
          const product = productMap.get(item.productId)!;
          product.quantity -= item.quantity;
          await manager.getRepository(Product).save(product);
        }

        const totalAmount = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );

        const transactionOrderRepository = manager.getRepository(Order);
        const order = transactionOrderRepository.create({
          shopId,
          customerName: createOrderDto.customerName,
          customerPhone: createOrderDto.customerPhone,
          items,
          totalAmount,
          status: OrderStatus.PENDING,
        });

        const savedOrder = await transactionOrderRepository.save(order);

        return {
          order: savedOrder,
          touchedProductIds: items.map((item) => item.productId),
        };
      },
    );

    await this.productService.syncCatalogProducts(touchedProductIds, shopId);

    this.logger.log(`Order created: ${order.id}`);

    return order;
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

    if (updateStatusDto.status === OrderStatus.CANCELLED) {
      const { order, touchedProductIds } = await this.dataSource.transaction(
        async (manager) => {
          const transactionOrderRepository = manager.getRepository(Order);
          const order = await transactionOrderRepository
            .createQueryBuilder('order')
            .where('order.id = :id', { id })
            .andWhere('order.shopId = :shopId', { shopId })
            .setLock('pessimistic_write')
            .getOne();

          if (!order) {
            throw new NotFoundException(`Order ${id} not found for this shop`);
          }

          this.validateStatusTransition(order.status, updateStatusDto.status);

          const products = await this.findProductsForUpdate(
            manager,
            order.items.map((item) => item.productId),
            shopId,
            true,
          );
          const productMap = new Map(
            products.map((product) => [product.id, product]),
          );

          for (const item of order.items) {
            const product = productMap.get(item.productId);
            if (!product) {
              throw new NotFoundException(
                `Product ${item.productId} not found for this shop`,
              );
            }

            product.quantity += item.quantity;
            await manager.getRepository(Product).save(product);
          }

          order.status = updateStatusDto.status;
          const updatedOrder = await transactionOrderRepository.save(order);

          return {
            order: updatedOrder,
            touchedProductIds: order.items.map((item) => item.productId),
          };
        },
      );

      await this.productService.syncCatalogProducts(touchedProductIds, shopId);
      this.logger.log(
        `Order ${id} status updated to ${updateStatusDto.status}`,
      );

      return order;
    }

    const order = await this.findByIdAndShopId(id, shopId);

    this.validateStatusTransition(order.status, updateStatusDto.status);

    order.status = updateStatusDto.status;

    const updatedOrder = await this.orderRepository.save(order);
    this.logger.log(`Order ${id} status updated to ${updateStatusDto.status}`);

    return updatedOrder;
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
    productMap: Map<string, Product>,
  ): void {
    const quantityPerProduct = new Map<string, number>();

    for (const item of items) {
      const currentQty = quantityPerProduct.get(item.productId) ?? 0;
      quantityPerProduct.set(item.productId, currentQty + item.quantity);
    }

    for (const [productId, totalQty] of quantityPerProduct) {
      const product = productMap.get(productId);
      const availableQty = product?.quantity ?? 0;

      if (availableQty < totalQty) {
        throw new BadRequestException(
          `Insufficient stock for product ${productId}. Requested: ${totalQty}, Available: ${availableQty}`,
        );
      }
    }
  }

  private async findProductsForUpdate(
    manager: EntityManager,
    productIds: string[],
    shopId: string,
    includeDeleted = false,
  ): Promise<Product[]> {
    if (productIds.length === 0) {
      return [];
    }

    const repository = manager.getRepository(Product);
    const queryBuilder = repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category');

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    queryBuilder
      .where('product.id IN (:...productIds)', { productIds })
      .andWhere('product.shopId = :shopId', { shopId });

    if (!includeDeleted) {
      queryBuilder.andWhere('product.deletedAt IS NULL');
    }

    return queryBuilder.setLock('pessimistic_write').getMany();
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
