import { Order } from '@/modules/order/entities';

import { createShop } from './shop.factory';
import { generateId } from './shared.utils';

type OrderStatus = Order['status'];

const DEFAULTS = {
  customerName: 'Test Customer',
  customerPhone: '+1234567890',
  status: 'PENDING' as OrderStatus,
  defaultItems: [{ productId: 'prod_001', quantity: 2, price: 100 }],
};

function defaultShopId(index: number): string {
  return createShop({ index }).id;
}

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

interface OrderFactoryOptions {
  index?: number;
  overrides?: Partial<Order> & { items?: OrderItem[] };
}

function calcTotal(items: OrderItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

function buildOrder(options: OrderFactoryOptions = {}): Order {
  const { index = 1, overrides = {} } = options;
  const now = new Date();
  const items = overrides.items ?? DEFAULTS.defaultItems;

  return {
    id: overrides.id ?? generateId('order', index),
    shop: (overrides.shop ?? null) as Order['shop'],
    shopId: overrides.shopId ?? defaultShopId(index),
    customerName: overrides.customerName ?? DEFAULTS.customerName,
    customerPhone: overrides.customerPhone ?? DEFAULTS.customerPhone,
    items,
    totalAmount: overrides.totalAmount ?? calcTotal(items),
    status: overrides.status ?? DEFAULTS.status,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  } as Order;
}

export function createOrder(options: OrderFactoryOptions = {}): Order {
  return buildOrder(options);
}

export function createOrders(count: number, options: Omit<OrderFactoryOptions, 'index'> = {}): Order[] {
  return Array.from({ length: count }, (_, i) => buildOrder({ ...options, index: i + 1 }));
}

export function createOrderWithStatus(status: OrderStatus, options: OrderFactoryOptions = {}): Order {
  return buildOrder({ ...options, overrides: { ...options.overrides, status } });
}

export function createPendingOrder(options: OrderFactoryOptions = {}): Order {
  return createOrderWithStatus('PENDING', options);
}

export function createConfirmedOrder(options: OrderFactoryOptions = {}): Order {
  return createOrderWithStatus('CONFIRMED', options);
}

export function createReadyOrder(options: OrderFactoryOptions = {}): Order {
  return createOrderWithStatus('READY', options);
}

export function createCompletedOrder(options: OrderFactoryOptions = {}): Order {
  return createOrderWithStatus('COMPLETED', options);
}

export function createCancelledOrder(options: OrderFactoryOptions = {}): Order {
  return createOrderWithStatus('CANCELLED', options);
}

export function createOrderWithItems(items: OrderItem[], options: OrderFactoryOptions = {}): Order {
  return buildOrder({ ...options, overrides: { ...options.overrides, items } });
}
