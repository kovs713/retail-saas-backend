import { OrderItemResponseDto, OrderListResponseDto, OrderResponseDto } from './order-response.dto';

import { plainToInstance } from 'class-transformer';

describe('OrderResponseDto', () => {
  describe('Transform behavior', () => {
    it('should transform totalAmount to number', () => {
      const raw = {
        id: 'order_001',
        shopId: 'shop_001',
        customerName: 'Test Customer',
        customerPhone: '+1234567890',
        items: [{ productId: 'prod_001', quantity: 2, price: 100 }],
        totalAmount: '200',
        status: 'PENDING',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      };

      const dto = plainToInstance(OrderResponseDto, raw, { excludeExtraneousValues: true });

      expect(dto.totalAmount).toBe(200);
      expect(typeof dto.totalAmount).toBe('number');
    });

    it('should transform Date fields to ISO strings', () => {
      const raw = {
        id: 'order_001',
        shopId: 'shop_001',
        customerName: 'Test Customer',
        customerPhone: '+1234567890',
        items: [],
        totalAmount: 100,
        status: 'PENDING',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      const dto = plainToInstance(OrderResponseDto, raw, { excludeExtraneousValues: true });

      expect(dto.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(dto.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should pass through string date values', () => {
      const raw = {
        id: 'order_001',
        shopId: 'shop_001',
        customerName: 'Test Customer',
        customerPhone: '+1234567890',
        items: [],
        totalAmount: 100,
        status: 'PENDING',
        createdAt: '2024-06-15T12:00:00.000Z',
        updatedAt: '2024-06-16T12:00:00.000Z',
      };

      const dto = plainToInstance(OrderResponseDto, raw, { excludeExtraneousValues: true });

      expect(dto.createdAt).toBe('2024-06-15T12:00:00.000Z');
    });

    it('should return undefined for non-date non-string values', () => {
      const raw = {
        id: 'order_001',
        shopId: 'shop_001',
        customerName: 'Test Customer',
        customerPhone: '+1234567890',
        items: [],
        totalAmount: 100,
        status: 'PENDING',
        createdAt: 12345,
        updatedAt: 12345,
      };

      const dto = plainToInstance(OrderResponseDto, raw, { excludeExtraneousValues: true });

      expect(dto.createdAt).toBeUndefined();
      expect(dto.updatedAt).toBeUndefined();
    });

    it('should transform items with Type decorator', () => {
      const raw = {
        id: 'order_001',
        shopId: 'shop_001',
        customerName: 'Test Customer',
        customerPhone: '+1234567890',
        items: [
          { productId: 'prod_001', sku: 'SKU-1', name: 'Product 1', quantity: 2, price: 50 },
          { productId: 'prod_002', sku: 'SKU-2', name: 'Product 2', quantity: 1, price: 100 },
        ],
        totalAmount: 200,
        status: 'PENDING',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      };

      const dto = plainToInstance(OrderResponseDto, raw, { excludeExtraneousValues: true });

      expect(dto.items).toHaveLength(2);
      expect(dto.items[0]).toBeInstanceOf(OrderItemResponseDto);
      expect(dto.items[0].sku).toBe('SKU-1');
    });
  });
});

describe('OrderListResponseDto', () => {
  it('should transform nested orders with Type decorator', () => {
    const raw = {
      data: [
        {
          id: 'order_001',
          shopId: 'shop_001',
          customerName: 'Test Customer',
          customerPhone: '+1234567890',
          items: [{ productId: 'prod_001', quantity: 2, price: 100 }],
          totalAmount: '200',
          status: 'PENDING',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    };

    const dto = plainToInstance(OrderListResponseDto, raw, { excludeExtraneousValues: true });

    expect(dto.data).toHaveLength(1);
    expect(dto.data[0]).toBeInstanceOf(OrderResponseDto);
    expect(dto.data[0].totalAmount).toBe(200);
    expect(dto.total).toBe(1);
  });
});
