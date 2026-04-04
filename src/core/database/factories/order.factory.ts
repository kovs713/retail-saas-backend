import { Order } from '@/modules/order/entities';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'READY' | 'COMPLETED' | 'CANCELLED';

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

interface CreateOrderOptions {
  id?: string;
  shopId?: string;
  customerName?: string;
  customerPhone?: string;
  items?: OrderItem[];
  totalAmount?: number;
  status?: OrderStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const DEFAULT_ITEMS: OrderItem[] = [{ productId: 'prod_001', quantity: 2, price: 100 }];

function buildOrder(options: CreateOrderOptions = {}): Order {
  const items = options.items ?? DEFAULT_ITEMS;
  const now = new Date();

  return {
    id: options.id ?? 'order_001',
    shop: null as any,
    shopId: options.shopId ?? 'shop_001',
    customerName: options.customerName ?? 'Test Customer',
    customerPhone: options.customerPhone ?? '+1234567890',
    items,
    totalAmount: options.totalAmount ?? items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    status: options.status ?? 'PENDING',
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
}

export function createOrder(options: CreateOrderOptions = {}): Order {
  return buildOrder(options);
}

export function createOrders(count: number, options: CreateOrderOptions = {}): Order[] {
  return Array.from({ length: count }, (_, i) =>
    buildOrder({
      ...options,
      id: options.id ?? `order_${String(i + 1).padStart(3, '0')}`,
    }),
  );
}

export function createPendingOrder(options: CreateOrderOptions = {}): Order {
  return buildOrder({ ...options, status: 'PENDING' });
}

export function createConfirmedOrder(options: CreateOrderOptions = {}): Order {
  return buildOrder({ ...options, status: 'CONFIRMED' });
}

export function createReadyOrder(options: CreateOrderOptions = {}): Order {
  return buildOrder({ ...options, status: 'READY' });
}

export function createCompletedOrder(options: CreateOrderOptions = {}): Order {
  return buildOrder({ ...options, status: 'COMPLETED' });
}

export function createCancelledOrder(options: CreateOrderOptions = {}): Order {
  return buildOrder({ ...options, status: 'CANCELLED' });
}

export function createOrderWithItems(items: OrderItem[], options: CreateOrderOptions = {}): Order {
  return buildOrder({ ...options, items });
}
