import { AuthGuard, RolesGuard } from '@/common/guards';
import { mockAuthGuard, mockGuard } from '@/common/utils';
import { AdminOrderController } from './admin-order.controller';
import { OrderService } from './order.service';
import { Order } from './entities';

import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('AdminOrderController', () => {
  let controller: AdminOrderController;
  let orderService: DeepMocked<OrderService>;

  const mockTenantContext = { shopId: 'shop-1' };

  const mockOrder: Order = {
    id: 'order-1',
    shopId: 'shop-1',
    shop: null as any,
    customerName: 'Alice',
    customerPhone: '+123456789',
    items: [{ productId: 'product-1', quantity: 2, price: 100 }],
    totalAmount: 200,
    status: 'PENDING',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrderController],
      providers: [
        {
          provide: OrderService,
          useValue: createMock<OrderService>(),
        },
        {
          provide: JwtService,
          useValue: createMock<JwtService>(),
        },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard({ sub: 'user-1', email: 'test@test.com', shopId: 'shop-1', role: 'owner' }))
      .overrideGuard(RolesGuard)
      .useValue(mockGuard())
      .compile();

    controller = module.get<AdminOrderController>(AdminOrderController);
    orderService = module.get(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrders', () => {
    it('should return paginated orders with default pagination', async () => {
      orderService.findByShopId.mockResolvedValue({
        data: [mockOrder],
        total: 1,
        page: 1,
        limit: 20,
      });
      orderService.toResponseDto.mockReturnValue({
        id: 'order-1',
        shopId: 'shop-1',
        customerName: 'Alice',
        customerPhone: '+123456789',
        items: [{ productId: 'product-1', quantity: 2, price: 100 }],
        totalAmount: 200,
        status: 'PENDING',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      });

      const result = await controller.getOrders(mockTenantContext, 1, 20);

      expect(result.success).toBe(true);
      expect(result.data!.data).toHaveLength(1);
      expect(result.data!.total).toBe(1);
      expect(orderService.findByShopId).toHaveBeenCalledWith('shop-1', { page: 1, limit: 20, status: undefined });
    });

    it('should return filtered orders by status', async () => {
      orderService.findByShopId.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await controller.getOrders(mockTenantContext, 1, 10, 'PENDING');

      expect(orderService.findByShopId).toHaveBeenCalledWith('shop-1', { page: 1, limit: 10, status: 'PENDING' });
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status and return response', async () => {
      const updatedOrder = { ...mockOrder, status: 'CONFIRMED' as const };
      orderService.updateStatus.mockResolvedValue(updatedOrder);
      orderService.toResponseDto.mockReturnValue({
        id: 'order-1',
        shopId: 'shop-1',
        customerName: 'Alice',
        customerPhone: '+123456789',
        items: [{ productId: 'product-1', quantity: 2, price: 100 }],
        totalAmount: 200,
        status: 'CONFIRMED',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      });

      const result = await controller.updateOrderStatus('order-1', { status: 'CONFIRMED' as any }, mockTenantContext);

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe('CONFIRMED');
      expect(result.message).toBe('Order status updated successfully');
      expect(orderService.updateStatus).toHaveBeenCalledWith('order-1', 'shop-1', { status: 'CONFIRMED' });
    });
  });
});
