import { OrderStatus } from '@/modules/order/dto';
import {
  createCancelledOrder,
  createCompletedOrder,
  createConfirmedOrder,
  createOrder,
  createOrders,
  createOrderWithStatus,
  createPendingOrder,
  createReadyOrder,
} from './order.factory';

describe('order.factory', () => {
  const defaultItems = [{ productId: 'prod_001', quantity: 2, price: 100 }];
  const defaultTotal = 200; // 2 * 100

  describe('createOrder', () => {
    it('should create order with default values', () => {
      const order = createOrder();

      expect(order.id).toBe('order_001');
      expect(order.shopId).toBe('shop_001');
      expect(order.customerName).toBe('Test Customer');
      expect(order.customerPhone).toBe('+1234567890');
      expect(order.status).toBe(OrderStatus.PENDING);
    });

    it('should create order with default items', () => {
      const order = createOrder();

      expect(order.items).toEqual(defaultItems);
    });

    it('should calculate totalAmount from items', () => {
      const order = createOrder();

      expect(order.totalAmount).toBe(defaultTotal);
    });

    it('should calculate totalAmount for multiple items', () => {
      const items = [
        { productId: 'prod_001', quantity: 2, price: 100 },
        { productId: 'prod_002', quantity: 1, price: 50 },
      ];
      const order = createOrder({ items });

      expect(order.totalAmount).toBe(250); // 2*100 + 1*50
    });

    it('should create order with custom index', () => {
      const order = createOrder({ index: 5 });

      expect(order.id).toBe('order_005');
      expect(order.shopId).toBe('shop_005');
    });

    it('should allow overriding items and totalAmount', () => {
      const items = [{ productId: 'prod_002', quantity: 3, price: 200 }];
      const order = createOrder({ items, totalAmount: 999 });

      expect(order.items).toEqual(items);
      expect(order.totalAmount).toBe(999);
    });

    it('should allow overriding customer details', () => {
      const order = createOrder({
        customerName: 'John Doe',
        customerPhone: '+9876543210',
      });

      expect(order.customerName).toBe('John Doe');
      expect(order.customerPhone).toBe('+9876543210');
    });

    it('should allow overriding status', () => {
      const order = createOrder({ status: OrderStatus.COMPLETED });

      expect(order.status).toBe(OrderStatus.COMPLETED);
    });

    it('should allow overriding shopId', () => {
      const order = createOrder({ shopId: 'custom-shop' });

      expect(order.shopId).toBe('custom-shop');
    });

    it('should create order with timestamps', () => {
      const order = createOrder();

      expect(order.createdAt).toBeInstanceOf(Date);
      expect(order.updatedAt).toBeInstanceOf(Date);
    });

    it('should exclude index from resulting object', () => {
      const order = createOrder({ index: 1 });

      expect('index' in order).toBe(false);
    });
  });

  describe('createOrders', () => {
    it('should create specified number of orders', () => {
      const orders = createOrders(3);

      expect(orders).toHaveLength(3);
    });

    it('should create orders with sequential indices', () => {
      const orders = createOrders(3);

      expect(orders[0].id).toBe('order_001');
      expect(orders[1].id).toBe('order_002');
      expect(orders[2].id).toBe('order_003');
    });

    it('should apply overrides to all orders', () => {
      const orders = createOrders(2, { status: OrderStatus.CONFIRMED });

      expect(orders[0].status).toBe(OrderStatus.CONFIRMED);
      expect(orders[1].status).toBe(OrderStatus.CONFIRMED);
    });

    it('should create orders with distinct IDs', () => {
      const orders = createOrders(3);

      const ids = orders.map((o) => o.id);
      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('createOrderWithStatus', () => {
    it('should create order with specified status', () => {
      const order = createOrderWithStatus(OrderStatus.CONFIRMED);

      expect(order.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should create order with default values except status', () => {
      const order = createOrderWithStatus(OrderStatus.COMPLETED);

      expect(order.id).toBe('order_001');
      expect(order.status).toBe(OrderStatus.COMPLETED);
    });

    it('should allow additional overrides', () => {
      const order = createOrderWithStatus(OrderStatus.READY, {
        customerName: 'Custom Customer',
      });

      expect(order.status).toBe(OrderStatus.READY);
      expect(order.customerName).toBe('Custom Customer');
    });
  });

  describe('status-specific helpers', () => {
    it('should create pending order', () => {
      expect(createPendingOrder().status).toBe(OrderStatus.PENDING);
    });

    it('should create confirmed order', () => {
      expect(createConfirmedOrder().status).toBe(OrderStatus.CONFIRMED);
    });

    it('should create ready order', () => {
      expect(createReadyOrder().status).toBe(OrderStatus.READY);
    });

    it('should create completed order', () => {
      expect(createCompletedOrder().status).toBe(OrderStatus.COMPLETED);
    });

    it('should create cancelled order', () => {
      expect(createCancelledOrder().status).toBe(OrderStatus.CANCELLED);
    });

    it('should allow overrides on status-specific helpers', () => {
      const order = createPendingOrder({ customerName: 'Test' });

      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.customerName).toBe('Test');
    });
  });
});
