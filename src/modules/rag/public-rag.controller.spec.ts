import { CacheService } from '@/core/cache/cache.service';
import { AnalyticsService } from '@/modules/analytics/analytics.service';
import { Shop } from '@/modules/shop/entities';
import { ShopService } from '@/modules/shop/shop.service';
import { ChattDto } from './dto';
import { PublicRagController } from './public-rag.controller';
import { RagService } from './rag.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { HttpException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';

describe('PublicRagController', () => {
  let controller: PublicRagController;
  let ragService: DeepMocked<RagService>;
  let shopService: DeepMocked<ShopService>;
  let analyticsService: DeepMocked<AnalyticsService>;
  let cacheService: DeepMocked<CacheService>;

  const mockShop = {
    id: 'test-shop-id',
    slug: 'test-shop',
    name: 'Test Shop',
    ownerId: 'test-owner-id',
    owner: {} as any,
    chatEvents: [],
    storefrontViews: [],
    orders: [],
    description: null,
    address: null,
    phone: null,
    workingHours: null,
    logoUrl: null,
    bannerUrl: null,
    isActive: true,
    createdAt: new Date(),
  } as Shop;

  beforeEach(async () => {
    ragService = createMock<DeepMocked<RagService>>();
    shopService = createMock<DeepMocked<ShopService>>();
    analyticsService = createMock<DeepMocked<AnalyticsService>>();
    cacheService = createMock<DeepMocked<CacheService>>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: RagService, useValue: ragService },
        { provide: ShopService, useValue: shopService },
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: CacheService, useValue: cacheService },
      ],
      controllers: [PublicRagController],
    }).compile();

    controller = module.get<PublicRagController>(PublicRagController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('chat', () => {
    const chatDto: ChattDto = {
      message: 'Hello',
      maxResults: 5,
    };

    const mockRequest = {
      ip: '127.0.0.1',
      connection: {
        remoteAddress: '127.0.0.1',
      },
    } as Request;

    it('should return chat response when shop exists', async () => {
      shopService.findBySlug.mockResolvedValue(mockShop);
      ragService.query.mockResolvedValue({
        answer: 'Hello! How can I help you?',
        sources: [],
      });
      analyticsService.logChatEvent.mockResolvedValue({} as any);

      const result = await controller.chat('test-shop', chatDto, mockRequest);

      expect(result).toEqual({
        success: true,
        data: {
          answer: 'Hello! How can I help you?',
          sources: [],
          timestamp: expect.any(String),
        },
      });
      expect(shopService.findBySlug).toHaveBeenCalledWith('test-shop');
      expect(analyticsService.logChatEvent).toHaveBeenCalledWith(
        mockShop.id,
        chatDto.message,
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should propagate NotFoundException when shop not found', async () => {
      shopService.findBySlug.mockRejectedValue(new NotFoundException('Shop not found'));

      await expect(controller.chat('non-existent', chatDto, mockRequest)).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException when rate limit exceeded', async () => {
      cacheService.get.mockResolvedValue(20); // At limit
      shopService.findBySlug.mockResolvedValue(mockShop);

      await expect(controller.chat('test-shop', chatDto, mockRequest)).rejects.toThrow(HttpException);
    });
  });
});
