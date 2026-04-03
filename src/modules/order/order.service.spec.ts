import { ProductRepository } from '@/modules/product/repositories';
import { OrderResponseDto, UpdateOrderStatusDto } from './dto';
import { Order } from './entities';
import { OrderService } from './order.service';
import { OrderRepository } from './repositories';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: DeepMocked<OrderRepository>;
  let productRepository: DeepMocked<ProductRepository>;

  const mockOrder: Order = {
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
      orderRepository.findByIdAndShopId.mockResolvedValue({ ...mockOrder, status: 'COMPLETED' });

      await expect(
        service.updateStatus('order-1', 'shop-1', { status: 'CONFIRMED' } as UpdateOrderStatusDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('toResponseDto', () => {
    it('should map order to response dto', () => {
      const result = service.toResponseDto(mockOrder);

      expect(result).toEqual<OrderResponseDto>({
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
    });
  });
});
