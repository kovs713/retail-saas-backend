import { AnalyticsService } from './analytics.service';
import { ChatEvent, StorefrontView } from './entities';
import { AnalyticsRepository } from './repositories';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let repository: DeepMocked<AnalyticsRepository>;

  const mockShopId = 'shop-123';
  const mockChatEvent: Partial<ChatEvent> = {
    shopId: mockShopId,
    userQuery: 'test query',
    answerLength: 100,
    sourcesCount: 3,
  };
  const mockStorefrontView: Partial<StorefrontView> = {
    shopId: mockShopId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: AnalyticsRepository,
          useValue: createMock<AnalyticsRepository>(),
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    repository = module.get<DeepMocked<AnalyticsRepository>>(AnalyticsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logChatEvent', () => {
    it('should log chat event and return created event', async () => {
      const createdEvent = { id: '1', ...mockChatEvent } as ChatEvent;
      repository.createChatEvent.mockResolvedValue(createdEvent);

      const result = await service.logChatEvent(mockShopId, 'test query', 100, 3);

      expect(repository.createChatEvent).toHaveBeenCalledWith({
        shopId: mockShopId,
        userQuery: 'test query',
        answerLength: 100,
        sourcesCount: 3,
      });
      expect(result).toBe(createdEvent);
    });
  });

  describe('getChatStats', () => {
    it('should get chat statistics for shop with date range', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');
      const mockStats = [{ id: '1', shopId: mockShopId }];
      repository.getChatStats.mockResolvedValue(mockStats as any);

      const result = await service.getChatStats(mockShopId, from, to);

      expect(repository.getChatStats).toHaveBeenCalledWith(mockShopId, from, to);
      expect(result).toBe(mockStats);
    });
  });

  describe('getTopQuestions', () => {
    it('should get top questions with default limit', async () => {
      const mockQuestions = [
        { question: 'What is this?', count: '10' },
        { question: 'How does it work?', count: '5' },
      ];
      repository.getTopQuestions.mockResolvedValue(mockQuestions);

      const result = await service.getTopQuestions(mockShopId);

      expect(repository.getTopQuestions).toHaveBeenCalledWith(mockShopId, 10);
      expect(result).toBe(mockQuestions);
    });

    it('should get top questions with custom limit', async () => {
      const mockQuestions = [{ question: 'What is this?', count: '10' }];
      repository.getTopQuestions.mockResolvedValue(mockQuestions);

      const result = await service.getTopQuestions(mockShopId, 5);

      expect(repository.getTopQuestions).toHaveBeenCalledWith(mockShopId, 5);
      expect(result).toBe(mockQuestions);
    });
  });

  describe('logStorefrontView', () => {
    it('should log storefront view and return created view', async () => {
      const createdView = { id: '1', ...mockStorefrontView } as StorefrontView;
      repository.createStorefrontView.mockResolvedValue(createdView);

      const result = await service.logStorefrontView(mockShopId);

      expect(repository.createStorefrontView).toHaveBeenCalledWith({
        shopId: mockShopId,
      });
      expect(result).toBe(createdView);
    });
  });

  describe('getStorefrontViewCount', () => {
    it('should get storefront view count for shop with date range', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');
      const mockCount = 42;
      repository.getStorefrontViewCount.mockResolvedValue(mockCount);

      const result = await service.getStorefrontViewCount(mockShopId, from, to);

      expect(repository.getStorefrontViewCount).toHaveBeenCalledWith(mockShopId, from, to);
      expect(result).toBe(mockCount);
    });
  });
});
