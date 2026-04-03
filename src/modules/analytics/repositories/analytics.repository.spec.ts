import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ChatEvent, StorefrontView } from '../entities';
import { AnalyticsRepository } from './analytics.repository';

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('AnalyticsRepository', () => {
  let repository: AnalyticsRepository;
  let chatEventRepo: DeepMocked<Repository<ChatEvent>>;
  let storefrontViewRepo: DeepMocked<Repository<StorefrontView>>;

  const mockShopId = 'shop-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsRepository,
        {
          provide: getRepositoryToken(ChatEvent),
          useValue: createMock<Repository<ChatEvent>>(),
        },
        {
          provide: getRepositoryToken(StorefrontView),
          useValue: createMock<Repository<StorefrontView>>(),
        },
      ],
    }).compile();

    repository = module.get<AnalyticsRepository>(AnalyticsRepository);
    chatEventRepo = module.get<DeepMocked<Repository<ChatEvent>>>(getRepositoryToken(ChatEvent));
    storefrontViewRepo = module.get<DeepMocked<Repository<StorefrontView>>>(getRepositoryToken(StorefrontView));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createChatEvent', () => {
    it('should create and save chat event', async () => {
      const chatEventData = {
        shopId: mockShopId,
        userQuery: 'test query',
        answerLength: 100,
        sourcesCount: 3,
      };
      const createdEvent = { id: '1', ...chatEventData } as ChatEvent;
      const savedEvent = { id: '1', ...chatEventData } as ChatEvent;

      chatEventRepo.create.mockReturnValue(createdEvent as any);
      chatEventRepo.save.mockResolvedValue(savedEvent);

      const result = await repository.createChatEvent(chatEventData);

      expect(chatEventRepo.create).toHaveBeenCalledWith(chatEventData);
      expect(chatEventRepo.save).toHaveBeenCalledWith(createdEvent);
      expect(result).toBe(savedEvent);
    });
  });

  describe('getChatEventsByShopId', () => {
    it('should find chat events by shopId ordered by createdAt DESC', async () => {
      const mockEvents = [{ id: '1', shopId: mockShopId, createdAt: new Date() }] as ChatEvent[];

      chatEventRepo.find.mockResolvedValue(mockEvents);

      const result = await repository.getChatEventsByShopId(mockShopId);

      expect(chatEventRepo.find).toHaveBeenCalledWith({
        where: { shopId: mockShopId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(mockEvents);
    });
  });

  describe('getChatStats', () => {
    it('should build query for chat stats with date range', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      chatEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await repository.getChatStats(mockShopId, from, to);

      expect(chatEventRepo.createQueryBuilder).toHaveBeenCalledWith('chat_event');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('chat_event.shopId = :shopId', { shopId: mockShopId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('chat_event.createdAt BETWEEN :from AND :to', {
        from,
        to,
      });
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });

  describe('getTopQuestions', () => {
    it('should build query for top questions with default limit', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      chatEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await repository.getTopQuestions(mockShopId);

      expect(chatEventRepo.createQueryBuilder).toHaveBeenCalledWith('chat_event');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('chat_event.userQuery', 'question');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('COUNT(*)', 'count');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('chat_event.shopId = :shopId', { shopId: mockShopId });
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('chat_event.userQuery');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('COUNT(*)', 'DESC');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalled();
    });

    it('should build query for top questions with custom limit', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      chatEventRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await repository.getTopQuestions(mockShopId, 5);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('createStorefrontView', () => {
    it('should create and save storefront view', async () => {
      const viewData = { shopId: mockShopId };
      const createdView = { id: '1', ...viewData } as StorefrontView;
      const savedView = { id: '1', ...viewData } as StorefrontView;

      storefrontViewRepo.create.mockReturnValue(createdView as any);
      storefrontViewRepo.save.mockResolvedValue(savedView);

      const result = await repository.createStorefrontView(viewData);

      expect(storefrontViewRepo.create).toHaveBeenCalledWith(viewData);
      expect(storefrontViewRepo.save).toHaveBeenCalledWith(createdView);
      expect(result).toBe(savedView);
    });
  });

  describe('getStorefrontViewsByShopId', () => {
    it('should find storefront views by shopId ordered by createdAt DESC', async () => {
      const mockViews = [{ id: '1', shopId: mockShopId, createdAt: new Date() }] as StorefrontView[];

      storefrontViewRepo.find.mockResolvedValue(mockViews);

      const result = await repository.getStorefrontViewsByShopId(mockShopId);

      expect(storefrontViewRepo.find).toHaveBeenCalledWith({
        where: { shopId: mockShopId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(mockViews);
    });
  });

  describe('getStorefrontViewCount', () => {
    it('should build query for view count with date range', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(42),
      };

      storefrontViewRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await repository.getStorefrontViewCount(mockShopId, from, to);

      expect(storefrontViewRepo.createQueryBuilder).toHaveBeenCalledWith('storefront_view');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('storefront_view.shopId = :shopId', { shopId: mockShopId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('storefront_view.createdAt BETWEEN :from AND :to', {
        from,
        to,
      });
      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
    });
  });
});
