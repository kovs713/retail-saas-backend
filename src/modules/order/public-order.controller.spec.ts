import { ShopService } from '@/modules/shop/shop.service';
import { Order } from './entities';
import { OrderService } from './order.service';
import { PublicOrderController } from './public-order.controller';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('PublicOrderController', () => {
  let controller: PublicOrderController;
  let orderService: DeepMocked<OrderService>;
  let shopService: DeepMocked<ShopService>;

  const activeShop = {
    id: 'shop-1',
    slug: 'shop-1',
    isActive: true,
  } as any;

  const inactiveShop = {
    ...activeShop,
    isActive: false,
  };

  const order: Order = {
    id: 'order-1',
    shop: null as any,
    shopId: 'shop-1',
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
      controllers: [PublicOrderController],
      providers: [
        {
          provide: OrderService,
          useValue: createMock<OrderService>(),
        },
        {
          provide: ShopService,
          useValue: createMock<ShopService>(),
        },
      ],
    }).compile();

    controller = module.get(PublicOrderController);
    orderService = module.get(OrderService);
    shopService = module.get(ShopService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should reject orders for inactive shops with bad request', async () => {
    shopService.findBySlug.mockResolvedValue(inactiveShop);

    await expect(
      controller.createOrder('shop-1', {
        customerName: 'Alice',
        customerPhone: '+123456789',
        items: [{ productId: 'product-1', quantity: 2, price: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should create order for active shop', async () => {
    shopService.findBySlug.mockResolvedValue(activeShop);
    orderService.create.mockResolvedValue(order);
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

    const result = await controller.createOrder('shop-1', {
      customerName: 'Alice',
      customerPhone: '+123456789',
      items: [{ productId: 'product-1', quantity: 2, price: 1 }],
    });

    expect(orderService.create).toHaveBeenCalledWith('shop-1', {
      customerName: 'Alice',
      customerPhone: '+123456789',
      items: [{ productId: 'product-1', quantity: 2, price: 1 }],
    });
    expect(result.success).toBe(true);
  });
});
