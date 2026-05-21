import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { AnalyticsRepository } from '@/modules/analytics/repositories';
import { Order } from '@/modules/order/entities';
import { Category, Product, ProductImage } from '@/modules/product/entities';
import { Location, Shop } from '@/modules/shop/entities';
import { User } from '@/modules/user/entities';
import { getPostgresConnection } from '../../setup';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('AnalyticsRepository Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let repository: AnalyticsRepository;

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
      providers: [AnalyticsRepository],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    repository = moduleFixture.get<AnalyticsRepository>(AnalyticsRepository);
  }, 120000);

  afterEach(async () => {
    await dataSource.query('DELETE FROM chat_events');
    await dataSource.query('DELETE FROM storefront_views');
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

  const setCreatedAt = async (
    table: 'chat_events' | 'storefront_views',
    id: string,
    date: Date,
  ): Promise<void> => {
    await dataSource.query(
      `UPDATE ${table} SET "createdAt" = $1 WHERE id = $2`,
      [date, id],
    );
  };

  it('createChatEvent persists event and getChatEventsByShopId returns only that shop ordered by newest first', async () => {
    const shopA = await createShop(
      'Analytics Shop A',
      `analytics-shop-a-${Date.now()}`,
    );
    const shopB = await createShop(
      'Analytics Shop B',
      `analytics-shop-b-${Date.now()}`,
    );
    const olderEvent = await repository.createChatEvent({
      shopId: shopA.id,
      userQuery: 'older question',
      answerLength: 10,
      sourcesCount: 1,
    });
    const newerEvent = await repository.createChatEvent({
      shopId: shopA.id,
      userQuery: 'newer question',
      answerLength: 20,
      sourcesCount: 2,
    });
    await repository.createChatEvent({
      shopId: shopB.id,
      userQuery: 'other shop question',
      answerLength: 30,
      sourcesCount: 3,
    });

    await setCreatedAt(
      'chat_events',
      olderEvent.id,
      new Date('2024-01-10T00:00:00.000Z'),
    );
    await setCreatedAt(
      'chat_events',
      newerEvent.id,
      new Date('2024-01-20T00:00:00.000Z'),
    );

    const events = await repository.getChatEventsByShopId(shopA.id);

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.id)).toEqual([
      newerEvent.id,
      olderEvent.id,
    ]);
  });

  it('getChatStats returns only events inside the requested range for the target shop', async () => {
    const shopA = await createShop(
      'Stats Shop A',
      `stats-shop-a-${Date.now()}`,
    );
    const shopB = await createShop(
      'Stats Shop B',
      `stats-shop-b-${Date.now()}`,
    );
    const inRangeEvent = await repository.createChatEvent({
      shopId: shopA.id,
      userQuery: 'in-range',
      answerLength: 10,
      sourcesCount: 1,
    });
    const oldEvent = await repository.createChatEvent({
      shopId: shopA.id,
      userQuery: 'old',
      answerLength: 20,
      sourcesCount: 2,
    });
    await repository.createChatEvent({
      shopId: shopB.id,
      userQuery: 'other-shop',
      answerLength: 30,
      sourcesCount: 3,
    });

    await setCreatedAt(
      'chat_events',
      inRangeEvent.id,
      new Date('2024-02-10T00:00:00.000Z'),
    );
    await setCreatedAt(
      'chat_events',
      oldEvent.id,
      new Date('2024-01-10T00:00:00.000Z'),
    );

    const stats = await repository.getChatStats(
      shopA.id,
      new Date('2024-02-01T00:00:00.000Z'),
      new Date('2024-02-28T23:59:59.999Z'),
    );

    expect(stats).toHaveLength(1);
    expect(stats[0].id).toBe(inRangeEvent.id);
  });

  it('getTopQuestions aggregates repeated questions for one shop and honors limit', async () => {
    const shopA = await createShop(
      'Top Questions A',
      `top-questions-a-${Date.now()}`,
    );
    const shopB = await createShop(
      'Top Questions B',
      `top-questions-b-${Date.now()}`,
    );
    await repository.createChatEvent({
      shopId: shopA.id,
      userQuery: 'What is this?',
      answerLength: 10,
      sourcesCount: 1,
    });
    await repository.createChatEvent({
      shopId: shopA.id,
      userQuery: 'What is this?',
      answerLength: 20,
      sourcesCount: 2,
    });
    await repository.createChatEvent({
      shopId: shopA.id,
      userQuery: 'How much?',
      answerLength: 30,
      sourcesCount: 1,
    });
    await repository.createChatEvent({
      shopId: shopA.id,
      userQuery: 'Where is it?',
      answerLength: 40,
      sourcesCount: 1,
    });
    await repository.createChatEvent({
      shopId: shopB.id,
      userQuery: 'What is this?',
      answerLength: 50,
      sourcesCount: 1,
    });

    const topTwo = await repository.getTopQuestions(shopA.id, 2);

    expect(topTwo).toHaveLength(2);
    expect(topTwo[0]).toEqual({ question: 'What is this?', count: '2' });
    expect(topTwo[1].count).toBe('1');
    expect(['How much?', 'Where is it?']).toContain(topTwo[1].question);
  });

  it('createStorefrontView persists views and count methods stay scoped by date and shop', async () => {
    const shopA = await createShop(
      'Views Shop A',
      `views-shop-a-${Date.now()}`,
    );
    const shopB = await createShop(
      'Views Shop B',
      `views-shop-b-${Date.now()}`,
    );
    const olderView = await repository.createStorefrontView({
      shopId: shopA.id,
    });
    const inRangeView = await repository.createStorefrontView({
      shopId: shopA.id,
    });
    await repository.createStorefrontView({ shopId: shopB.id });

    await setCreatedAt(
      'storefront_views',
      olderView.id,
      new Date('2024-01-10T00:00:00.000Z'),
    );
    await setCreatedAt(
      'storefront_views',
      inRangeView.id,
      new Date('2024-02-10T00:00:00.000Z'),
    );

    const views = await repository.getStorefrontViewsByShopId(shopA.id);
    const count = await repository.getStorefrontViewCount(
      shopA.id,
      new Date('2024-02-01T00:00:00.000Z'),
      new Date('2024-02-28T23:59:59.999Z'),
    );

    expect(views).toHaveLength(2);
    expect(views.map((view) => view.id)).toEqual([
      inRangeView.id,
      olderView.id,
    ]);
    expect(count).toBe(1);
  });
});
