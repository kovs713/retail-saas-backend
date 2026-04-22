import {
  createChatEvent,
  createStorefrontView,
} from '@/core/database/factories';
import { AnalyticsRepository } from '@/modules/analytics/repositories';
import { OrderRepository } from '@/modules/order/repositories';
import { AnalyticsService } from './analytics.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let repository: DeepMocked<AnalyticsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: AnalyticsRepository,
          useValue: createMock<AnalyticsRepository>(),
        },
        {
          provide: OrderRepository,
          useValue: createMock<OrderRepository>(),
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    repository = module.get(AnalyticsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logChatEvent', () => {
    const mockChatEvent = createChatEvent({
      id: 'chat_001',
      shopId: 'shop_001',
    });

    it('should create chat event and return it', async () => {
      repository.createChatEvent.mockResolvedValue(mockChatEvent);

      const result = await service.logChatEvent(
        'shop_001',
        'test query',
        100,
        3,
      );

      expect(result).toEqual(mockChatEvent);
      expect(repository.createChatEvent).toHaveBeenCalledWith({
        shopId: 'shop_001',
        userQuery: 'test query',
        answerLength: 100,
        sourcesCount: 3,
      });
    });
  });

  describe('getChatStats', () => {
    it('should return chat events within date range', async () => {
      const mockEvents = [{ id: 'chat_001' }] as any[];
      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');
      repository.getChatStats.mockResolvedValue(mockEvents);

      const result = await service.getChatStats('shop_001', from, to);

      expect(result).toEqual(mockEvents);
      expect(repository.getChatStats).toHaveBeenCalledWith(
        'shop_001',
        from,
        to,
      );
    });
  });

  describe('getTopQuestions', () => {
    it('should return top questions with default limit', async () => {
      const mockQuestions = [{ question: 'What is this?', count: '5' }];
      repository.getTopQuestions.mockResolvedValue(mockQuestions);

      const result = await service.getTopQuestions('shop_001');

      expect(result).toEqual(mockQuestions);
      expect(repository.getTopQuestions).toHaveBeenCalledWith('shop_001', 10);
    });

    it('should return top questions with custom limit', async () => {
      const mockQuestions = [{ question: 'What is this?', count: '5' }];
      repository.getTopQuestions.mockResolvedValue(mockQuestions);

      await service.getTopQuestions('shop_001', 5);

      expect(repository.getTopQuestions).toHaveBeenCalledWith('shop_001', 5);
    });
  });

  describe('logStorefrontView', () => {
    const mockStorefrontView = createStorefrontView({
      id: 'view_001',
      shopId: 'shop_001',
    });

    it('should create storefront view and return it', async () => {
      repository.createStorefrontView.mockResolvedValue(mockStorefrontView);

      const result = await service.logStorefrontView('shop_001');

      expect(result).toEqual(mockStorefrontView);
      expect(repository.createStorefrontView).toHaveBeenCalledWith({
        shopId: 'shop_001',
      });
    });
  });

  describe('getStorefrontViewCount', () => {
    it('should return storefront view count within date range', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');
      repository.getStorefrontViewCount.mockResolvedValue(42);

      const result = await service.getStorefrontViewCount('shop_001', from, to);

      expect(result).toBe(42);
      expect(repository.getStorefrontViewCount).toHaveBeenCalledWith(
        'shop_001',
        from,
        to,
      );
    });
  });
});
