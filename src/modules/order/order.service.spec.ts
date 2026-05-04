import {
  createOrder,
  createConfirmedOrder,
  createCompletedOrder,
  createCancelledOrder,
  createReadyOrder,
} from '@/core/database/factories';
import { Product } from '@/modules/product/entities';
import { ProductService } from '@/modules/product/product.service';
import { OrderResponseDto, UpdateOrderStatusDto } from './dto';
import { Order } from './entities';
import { OrderService } from './order.service';
import { OrderRepository } from './repositories';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager, Repository } from 'typeorm';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: DeepMocked<OrderRepository>;
  let productService: DeepMocked<ProductService>;
  let dataSource: DeepMocked<DataSource>;
  let manager: DeepMocked<EntityManager>;
  let transactionOrderRepository: DeepMocked<Repository<Order>>;
  let transactionProductRepository: DeepMocked<Repository<Product>>;

  const mockOrder = createOrder({ id: 'order_001', shopId: 'shop_001' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: OrderRepository,
          useValue: createMock<OrderRepository>(),
        },
        {
          provide: ProductService,
          useValue: createMock<ProductService>(),
        },
        {
          provide: DataSource,
          useValue: createMock<DataSource>(),
        },
      ],
    }).compile();

    service = module.get(OrderService);
    orderRepository = module.get(OrderRepository);
    productService = module.get(ProductService);
    dataSource = module.get(DataSource);
    manager = createMock<EntityManager>();
    transactionOrderRepository = createMock<Repository<Order>>();
    transactionProductRepository = createMock<Repository<Product>>();

    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    );
    manager.getRepository.mockImplementation((entity) => {
      if (entity === Order) {
        return transactionOrderRepository as never;
      }
      if (entity === Product) {
        return transactionProductRepository as never;
      }

      return createMock<Repository<any>>() as never;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function mockTransactionalProductLoad(products: Product[]): any {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      withDeleted: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(products),
    };

    transactionProductRepository.createQueryBuilder.mockReturnValue(
      queryBuilder as never,
    );

    return queryBuilder;
  }

  function mockTransactionalOrderLoad(order: Order | null): any {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(order),
    };

    transactionOrderRepository.createQueryBuilder.mockReturnValue(
      queryBuilder as never,
    );

    return queryBuilder;
  }

  describe('create', () => {
    it('should calculate total from catalog prices instead of client prices', async () => {
      mockTransactionalProductLoad([
        {
          id: 'product-1',
          shopId: 'shop-1',
          sku: 'SKU-1',
          name: 'Product 1',
          price: 100,
          quantity: 10,
        } as any,
      ]);
      transactionOrderRepository.create.mockReturnValue(mockOrder as never);
      transactionOrderRepository.save.mockResolvedValue(mockOrder as never);
      transactionProductRepository.save.mockImplementation(async (value) =>
        Promise.resolve(value as never),
      );

      await service.create('shop-1', {
        customerName: 'Alice',
        customerPhone: '+123456789',
        items: [{ productId: 'product-1', quantity: 2, price: 1 }],
      });

      expect(transactionOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalAmount: 200,
          items: [{ productId: 'product-1', quantity: 2, price: 100 }],
        }),
      );
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should reject orders with products outside the target shop', async () => {
      mockTransactionalProductLoad([]);

      await expect(
        service.create('shop-1', {
          customerName: 'Alice',
          customerPhone: '+123456789',
          items: [{ productId: 'missing-product', quantity: 1, price: 100 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should decrement stock for each ordered item', async () => {
      mockTransactionalProductLoad([
        {
          id: 'product-1',
          shopId: 'shop-1',
          sku: 'SKU-1',
          name: 'Product 1',
          price: 100,
          quantity: 5,
        } as any,
      ]);
      transactionOrderRepository.create.mockReturnValue(mockOrder as never);
      transactionOrderRepository.save.mockResolvedValue(mockOrder as never);
      transactionProductRepository.save.mockImplementation(async (value) =>
        Promise.resolve(value as never),
      );

      await service.create('shop-1', {
        customerName: 'Alice',
        customerPhone: '+123456789',
        items: [{ productId: 'product-1', quantity: 2, price: 1 }],
      });

      expect(transactionProductRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'product-1',
          quantity: 3,
        }),
      );
    });

    it('should reject orders when requested quantity exceeds stock', async () => {
      mockTransactionalProductLoad([
        {
          id: 'product-1',
          shopId: 'shop-1',
          sku: 'SKU-1',
          name: 'Product 1',
          price: 100,
          quantity: 1,
        } as any,
      ]);

      await expect(
        service.create('shop-1', {
          customerName: 'Alice',
          customerPhone: '+123456789',
          items: [{ productId: 'product-1', quantity: 2, price: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(transactionProductRepository.save).not.toHaveBeenCalled();
    });

    it('should reject duplicate order lines when total requested quantity exceeds stock', async () => {
      mockTransactionalProductLoad([
        {
          id: 'product-1',
          shopId: 'shop-1',
          sku: 'SKU-1',
          name: 'Product 1',
          price: 100,
          quantity: 5,
        } as any,
      ]);

      await expect(
        service.create('shop-1', {
          customerName: 'Alice',
          customerPhone: '+123456789',
          items: [
            { productId: 'product-1', quantity: 3, price: 1 },
            { productId: 'product-1', quantity: 3, price: 1 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(transactionProductRepository.save).not.toHaveBeenCalled();
    });

    it('should re-sync touched products after committed transaction', async () => {
      mockTransactionalProductLoad([
        {
          id: 'product-1',
          shopId: 'shop-1',
          sku: 'SKU-1',
          name: 'Product 1',
          price: 100,
          quantity: 5,
        } as any,
      ]);
      transactionOrderRepository.create.mockReturnValue(mockOrder as never);
      transactionOrderRepository.save.mockResolvedValue(mockOrder as never);
      transactionProductRepository.save.mockImplementation(async (value) =>
        Promise.resolve(value as never),
      );

      await service.create('shop-1', {
        customerName: 'Alice',
        customerPhone: '+123456789',
        items: [{ productId: 'product-1', quantity: 2, price: 1 }],
      });

      expect(productService.syncCatalogProducts).toHaveBeenCalledWith(
        ['product-1'],
        'shop-1',
      );
    });
  });

  describe('updateStatus', () => {
    it('should reject invalid status transitions with bad request', async () => {
      orderRepository.findByIdAndShopId.mockResolvedValue(
        createCompletedOrder({ id: 'order_001', shopId: 'shop_001' }),
      );

      await expect(
        service.updateStatus('order_001', 'shop_001', {
          status: 'CONFIRMED',
        } as UpdateOrderStatusDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('toResponseDto', () => {
    it('should map order to response dto', () => {
      const result = service.toResponseDto(mockOrder);

      expect(result).toEqual<OrderResponseDto>({
        id: 'order_001',
        shopId: 'shop_001',
        customerName: 'Test Customer',
        customerPhone: '+1234567890',
        items: [{ productId: 'prod_001', quantity: 2, price: 100 }],
        totalAmount: 200,
        status: 'PENDING',
        createdAt: mockOrder.createdAt.toISOString(),
        updatedAt: mockOrder.updatedAt.toISOString(),
      });
    });
  });

  describe('findByShopId', () => {
    it('should return paginated orders with default pagination', async () => {
      const mockOrders = [mockOrder];
      orderRepository.findByShopId.mockResolvedValue([mockOrders, 1]);

      const result = await service.findByShopId('shop_001');

      expect(result.data).toEqual(mockOrders);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(orderRepository.findByShopId).toHaveBeenCalledWith('shop_001', {
        page: 1,
        limit: 20,
        status: undefined,
      });
    });

    it('should return paginated orders with custom pagination and status filter', async () => {
      const mockOrders = [mockOrder];
      orderRepository.findByShopId.mockResolvedValue([mockOrders, 5]);

      const result = await service.findByShopId('shop_001', {
        page: 2,
        limit: 10,
        status: 'PENDING',
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(orderRepository.findByShopId).toHaveBeenCalledWith('shop_001', {
        page: 2,
        limit: 10,
        status: 'PENDING',
      });
    });
  });

  describe('findById', () => {
    it('should return order when found', async () => {
      orderRepository.findById.mockResolvedValue(mockOrder);

      const result = await service.findById('order_001');

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('non-existent')).rejects.toThrow(
        'Order non-existent not found',
      );
    });
  });

  describe('findByIdAndShopId', () => {
    it('should return order when found for shop', async () => {
      orderRepository.findByIdAndShopId.mockResolvedValue(mockOrder);

      const result = await service.findByIdAndShopId('order_001', 'shop_001');

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException when order not found for shop', async () => {
      orderRepository.findByIdAndShopId.mockResolvedValue(null);

      await expect(
        service.findByIdAndShopId('order_001', 'shop_002'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findByIdAndShopId('order_001', 'shop_002'),
      ).rejects.toThrow('Order order_001 not found for this shop');
    });
  });

  describe('updateStatus', () => {
    it('should update order status with valid transition PENDING -> CONFIRMED', async () => {
      orderRepository.findByIdAndShopId.mockResolvedValue(mockOrder);
      orderRepository.save.mockResolvedValue(
        createConfirmedOrder({ id: 'order_001', shopId: 'shop_001' }),
      );

      const result = await service.updateStatus('order_001', 'shop_001', {
        status: 'CONFIRMED',
      } as UpdateOrderStatusDto);

      expect(result.status).toBe('CONFIRMED');
      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CONFIRMED' }),
      );
    });

    it('should allow PENDING -> CANCELLED transition', async () => {
      mockTransactionalOrderLoad(mockOrder);
      mockTransactionalProductLoad([
        {
          id: 'prod_001',
          shopId: 'shop_001',
          sku: 'SKU-1',
          name: 'Product 1',
          price: 100,
          quantity: 3,
        } as any,
      ]);
      transactionProductRepository.save.mockImplementation(async (value) =>
        Promise.resolve(value as never),
      );
      transactionOrderRepository.save.mockResolvedValue(
        createCancelledOrder({ id: 'order_001', shopId: 'shop_001' }) as never,
      );

      await service.updateStatus('order_001', 'shop_001', {
        status: 'CANCELLED',
      } as UpdateOrderStatusDto);

      expect(transactionOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CANCELLED' }),
      );
      expect(transactionProductRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'prod_001', quantity: 5 }),
      );
      expect(productService.syncCatalogProducts).toHaveBeenCalledWith(
        ['prod_001'],
        'shop_001',
      );
    });

    it('should allow CONFIRMED -> READY transition', async () => {
      const confirmedOrder = createConfirmedOrder({
        id: 'order_001',
        shopId: 'shop_001',
      });
      orderRepository.findByIdAndShopId.mockResolvedValue(confirmedOrder);
      orderRepository.save.mockResolvedValue(
        createReadyOrder({ id: 'order_001', shopId: 'shop_001' }),
      );

      await service.updateStatus('order_001', 'shop_001', {
        status: 'READY',
      } as UpdateOrderStatusDto);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'READY' }),
      );
    });

    it('should allow READY -> COMPLETED transition', async () => {
      const readyOrder = createReadyOrder({
        id: 'order_001',
        shopId: 'shop_001',
      });
      orderRepository.findByIdAndShopId.mockResolvedValue(readyOrder);
      orderRepository.save.mockResolvedValue(
        createCompletedOrder({ id: 'order_001', shopId: 'shop_001' }),
      );

      await service.updateStatus('order_001', 'shop_001', {
        status: 'COMPLETED',
      } as UpdateOrderStatusDto);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'COMPLETED' }),
      );
    });

    it('should reject COMPLETED -> any transition', async () => {
      mockTransactionalOrderLoad(
        createCompletedOrder({ id: 'order_001', shopId: 'shop_001' }),
      );

      await expect(
        service.updateStatus('order_001', 'shop_001', {
          status: 'CANCELLED',
        } as UpdateOrderStatusDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject CANCELLED -> any transition', async () => {
      orderRepository.findByIdAndShopId.mockResolvedValue(
        createCancelledOrder({ id: 'order_001', shopId: 'shop_001' }),
      );

      await expect(
        service.updateStatus('order_001', 'shop_001', {
          status: 'PENDING',
        } as UpdateOrderStatusDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject CONFIRMED -> PENDING transition', async () => {
      orderRepository.findByIdAndShopId.mockResolvedValue(
        createConfirmedOrder({ id: 'order_001', shopId: 'shop_001' }),
      );

      await expect(
        service.updateStatus('order_001', 'shop_001', {
          status: 'PENDING',
        } as UpdateOrderStatusDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
