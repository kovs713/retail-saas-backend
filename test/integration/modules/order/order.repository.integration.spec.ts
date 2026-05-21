import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { Order } from '@/modules/order/entities';
import { OrderRepository } from '@/modules/order/repositories';
import { Category, Product, ProductImage } from '@/modules/product/entities';
import { Location, Shop } from '@/modules/shop/entities';
import { User } from '@/modules/user/entities';
import { getPostgresConnection } from '../../setup';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('OrderRepository Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let repository: OrderRepository;

  beforeAll(async () => {
    const connection = getPostgresConnection();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: connection.host,
          port: connection.port,
          username: connection.username,
          password: connection.password,
          database: connection.database,
          autoLoadEntities: true,
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([
          Shop,
          Location,
          User,
          Product,
          ProductImage,
          Category,
          ChatEvent,
          StorefrontView,
          Order,
        ]),
      ],
      providers: [OrderRepository],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    repository = moduleFixture.get<OrderRepository>(OrderRepository);
  }, 120000);

  afterEach(async () => {
    await dataSource.query('DELETE FROM orders');
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM categories');
    await dataSource.query('DELETE FROM shops');
    await dataSource.query('DELETE FROM users');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 30000);

  const createShop = async (name: string, slug: string): Promise<Shop> => {
    return dataSource.getRepository(Shop).save(
      dataSource.getRepository(Shop).create({
        name,
        slug,
      }),
    );
  };

  const createOrder = async (
    shopId: string,
    status: Order['status'],
    customerName: string,
  ): Promise<Order> => {
    return dataSource.getRepository(Order).save(
      dataSource.getRepository(Order).create({
        shopId,
        customerName,
        customerPhone: '+123456789',
        items: [{ productId: 'product-1', quantity: 1, price: 100 }],
        totalAmount: 100,
        status,
      }),
    );
  };

  it('findByShopId returns newest shop orders first with default pagination', async () => {
    const shop = await createShop('Orders Shop', `orders-shop-${Date.now()}`);
    const olderOrder = await createOrder(shop.id, 'PENDING', 'Older');
    const newerOrder = await createOrder(shop.id, 'CONFIRMED', 'Newer');

    const [orders, total] = await repository.findByShopId(shop.id);

    expect(total).toBe(2);
    expect(orders).toHaveLength(2);
    expect(orders[0].id).toBe(newerOrder.id);
    expect(orders[1].id).toBe(olderOrder.id);
  });

  it('findByShopId applies custom pagination', async () => {
    const shop = await createShop('Paged Shop', `paged-shop-${Date.now()}`);
    await createOrder(shop.id, 'PENDING', 'First');
    const secondOrder = await createOrder(shop.id, 'PENDING', 'Second');
    await createOrder(shop.id, 'PENDING', 'Third');

    const [orders, total] = await repository.findByShopId(shop.id, {
      page: 2,
      limit: 1,
    });

    expect(total).toBe(3);
    expect(orders).toHaveLength(1);
    expect(orders[0].id).toBe(secondOrder.id);
  });

  it('findByShopId filters by status inside the target shop only', async () => {
    const shopA = await createShop('Shop A', `shop-a-${Date.now()}`);
    const shopB = await createShop('Shop B', `shop-b-${Date.now()}`);
    const targetOrder = await createOrder(shopA.id, 'PENDING', 'Target');
    await createOrder(shopA.id, 'COMPLETED', 'Completed');
    await createOrder(shopB.id, 'PENDING', 'Other shop');

    const [orders, total] = await repository.findByShopId(shopA.id, {
      status: 'PENDING',
    });

    expect(total).toBe(1);
    expect(orders).toHaveLength(1);
    expect(orders[0].id).toBe(targetOrder.id);
    expect(orders[0].shopId).toBe(shopA.id);
  });

  it('findByIdAndShopId returns null for order from another shop', async () => {
    const shopA = await createShop('Shop A', `find-order-a-${Date.now()}`);
    const shopB = await createShop('Shop B', `find-order-b-${Date.now()}`);
    const order = await createOrder(shopA.id, 'PENDING', 'Scoped');

    const result = await repository.findByIdAndShopId(order.id, shopB.id);

    expect(result).toBeNull();
  });

  it('findById returns persisted order by id', async () => {
    const shop = await createShop('By Id Shop', `by-id-shop-${Date.now()}`);
    const order = await createOrder(shop.id, 'PENDING', 'By Id');

    const result = await repository.findById(order.id);

    expect(result?.id).toBe(order.id);
    expect(result?.customerName).toBe('By Id');
  });
});
