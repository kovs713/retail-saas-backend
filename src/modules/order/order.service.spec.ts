import {
  createOrder,
  createConfirmedOrder,
  createCompletedOrder,
  createCancelledOrder,
  createReadyOrder,
} from '@/core/database/factories';
import { ProductRepository } from '@/modules/product/repositories';
import { OrderResponseDto, UpdateOrderStatusDto } from './dto';
import { OrderService } from './order.service';
import { OrderRepository } from './repositories';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: DeepMocked<OrderRepository>;
  let productRepository: DeepMocked<ProductRepository>;

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
          provide: ProductRepository,
          useValue: createMock<ProductRepository>(),
        },
      ],
    }).compile();

    service = module.get(OrderService);
    orderRepository = module.get(OrderRepository);
    productRepository = module.get(ProductRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should calculate total from catalog prices instead of client prices', async () => {
      productRepository.find.mockResolvedValue([
        {
          id: 'product-1',
          shopId: 'shop-1',
          sku: 'SKU-1',
          name: 'Product 1',
          price: 100,
        } as any,
      ]);
      orderRepository.create.mockReturnValue(mockOrder);
      orderRepository.save.mockResolvedValue(mockOrder);

      await service.create('shop-1', {
        customerName: 'Alice',
        customerPhone: '+123456789',
        items: [{ productId: 'product-1', quantity: 2, price: 1 }],
      });

      expect(orderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalAmount: 200,
          items: [{ productId: 'product-1', quantity: 2, price: 100 }],
        }),
      );
    });

    it('should reject orders with products outside the target shop', async () => {
      productRepository.find.mockResolvedValue([]);

      await expect(
        service.create('shop-1', {
          customerName: 'Alice',
          customerPhone: '+123456789',
          items: [{ productId: 'missing-product', quantity: 1, price: 100 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should reject invalid status transitions with bad request', async () => {
      orderRepository.findByIdAndShopId.mockResolvedValue(
        createCompletedOrder({ id: 'order_001', shopId: 'shop_001' }),
      );

      await expect(
        service.updateStatus('order_001', 'shop_001', { status: 'CONFIRMED' } as UpdateOrderStatusDto),
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
      expect(orderRepository.findByShopId).toHaveBeenCalledWith('shop_001', { page: 1, limit: 20, status: undefined });
    });

    it('should return paginated orders with custom pagination and status filter', async () => {
      const mockOrders = [mockOrder];
      orderRepository.findByShopId.mockResolvedValue([mockOrders, 5]);

      const result = await service.findByShopId('shop_001', { page: 2, limit: 10, status: 'PENDING' });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(orderRepository.findByShopId).toHaveBeenCalledWith('shop_001', { page: 2, limit: 10, status: 'PENDING' });
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

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('non-existent')).rejects.toThrow('Order non-existent not found');
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

      await expect(service.findByIdAndShopId('order_001', 'shop_002')).rejects.toThrow(NotFoundException);
      await expect(service.findByIdAndShopId('order_001', 'shop_002')).rejects.toThrow(
        'Order order_001 not found for this shop',
      );
    });
  });

  describe('updateStatus', () => {
    it('should update order status with valid transition PENDING -> CONFIRMED', async () => {
      orderRepository.findByIdAndShopId.mockResolvedValue(mockOrder);
      orderRepository.save.mockResolvedValue(createConfirmedOrder({ id: 'order_001', shopId: 'shop_001' }));

      const result = await service.updateStatus('order_001', 'shop_001', {
        status: 'CONFIRMED',
      } as UpdateOrderStatusDto);

      expect(result.status).toBe('CONFIRMED');
      expect(orderRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'CONFIRMED' }));
    });

    it('should allow PENDING -> CANCELLED transition', async () => {
      orderRepository.findByIdAndShopId.mockResolvedValue(mockOrder);
      orderRepository.save.mockResolvedValue(createCancelledOrder({ id: 'order_001', shopId: 'shop_001' }));

      await service.updateStatus('order_001', 'shop_001', { status: 'CANCELLED' } as UpdateOrderStatusDto);

      expect(orderRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'CANCELLED' }));
    });

    it('should allow CONFIRMED -> READY transition', async () => {
      const confirmedOrder = createConfirmedOrder({ id: 'order_001', shopId: 'shop_001' });
      orderRepository.findByIdAndShopId.mockResolvedValue(confirmedOrder);
      orderRepository.save.mockResolvedValue(createReadyOrder({ id: 'order_001', shopId: 'shop_001' }));

      await service.updateStatus('order_001', 'shop_001', { status: 'READY' } as UpdateOrderStatusDto);

      expect(orderRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'READY' }));
    });

    it('should allow READY -> COMPLETED transition', async () => {
      const readyOrder = createReadyOrder({ id: 'order_001', shopId: 'shop_001' });
      orderRepository.findByIdAndShopId.mockResolvedValue(readyOrder);
      orderRepository.save.mockResolvedValue(createCompletedOrder({ id: 'order_001', shopId: 'shop_001' }));

      await service.updateStatus('order_001', 'shop_001', { status: 'COMPLETED' } as UpdateOrderStatusDto);

      expect(orderRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'COMPLETED' }));
    });

    it('should reject COMPLETED -> any transition', async () => {
      orderRepository.findByIdAndShopId.mockResolvedValue(
        createCompletedOrder({ id: 'order_001', shopId: 'shop_001' }),
      );

      await expect(
        service.updateStatus('order_001', 'shop_001', { status: 'CANCELLED' } as UpdateOrderStatusDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject CANCELLED -> any transition', async () => {
      orderRepository.findByIdAndShopId.mockResolvedValue(
        createCancelledOrder({ id: 'order_001', shopId: 'shop_001' }),
      );

      await expect(
        service.updateStatus('order_001', 'shop_001', { status: 'PENDING' } as UpdateOrderStatusDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject CONFIRMED -> PENDING transition', async () => {
      orderRepository.findByIdAndShopId.mockResolvedValue(
        createConfirmedOrder({ id: 'order_001', shopId: 'shop_001' }),
      );

      await expect(
        service.updateStatus('order_001', 'shop_001', { status: 'PENDING' } as UpdateOrderStatusDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
