import { OrderStatus } from '@/modules/order/dto';
import { Order } from '@/modules/order/entities';
import { DEFAULT_CONTACTS, DEFAULT_IDS } from './defaults';
import { createMany, generateId } from './shared.utils';

const DEFAULT_ITEMS = [{ productId: 'prod_001', quantity: 2, price: 100 }];

export function createOrder(overrides: Partial<Order> & { index?: number } = {}): Order {
  const { index = 1, ...fields } = overrides;
  const items = overrides.items ?? DEFAULT_ITEMS;
  const now = new Date();
  return {
    id: generateId('order', index),
    shopId: DEFAULT_IDS.shopId(index),
    customerName: DEFAULT_CONTACTS.customerName,
    customerPhone: DEFAULT_CONTACTS.phone,
    items,
    totalAmount: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    status: OrderStatus.PENDING,
    createdAt: now,
    updatedAt: now,
    ...fields,
  } as Order;
}

export function createOrders(count: number, overrides: Partial<Order> = {}): Order[] {
  return createMany(count, (i) => createOrder({ ...overrides, index: i }));
}

export function createOrderWithStatus(status: Order['status'], overrides: Partial<Order> = {}): Order {
  return createOrder({ ...overrides, status });
}

export const createPendingOrder = (o: Partial<Order> = {}) => createOrderWithStatus(OrderStatus.PENDING, o);
export const createConfirmedOrder = (o: Partial<Order> = {}) => createOrderWithStatus(OrderStatus.CONFIRMED, o);
export const createReadyOrder = (o: Partial<Order> = {}) => createOrderWithStatus(OrderStatus.READY, o);
export const createCompletedOrder = (o: Partial<Order> = {}) => createOrderWithStatus(OrderStatus.COMPLETED, o);
export const createCancelledOrder = (o: Partial<Order> = {}) => createOrderWithStatus(OrderStatus.CANCELLED, o);
