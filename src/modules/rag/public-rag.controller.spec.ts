import { AnalyticsService } from '@/modules/analytics/analytics.service';
import { Shop } from '@/modules/shop/entities';
import { ShopService } from '@/modules/shop/shop.service';
import { ChatDto } from './dto';
import { PublicRagController } from './public-rag.controller';
import { RagService } from './rag.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { NotFoundException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Test, TestingModule } from '@nestjs/testing';

describe('PublicRagController', () => {
  let controller: PublicRagController;
  let ragService: DeepMocked<RagService>;
  let shopService: DeepMocked<ShopService>;
  let analyticsService: DeepMocked<AnalyticsService>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: RagService, useValue: ragService },
        { provide: ShopService, useValue: shopService },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
      controllers: [PublicRagController],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PublicRagController>(PublicRagController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('chat', () => {
    const chatDto: ChatDto = {
      message: 'Hello',
      maxResults: 5,
    };

    it('should return chat response when shop exists', async () => {
      shopService.findBySlug.mockResolvedValue(mockShop);
      ragService.query.mockResolvedValue({
        answer: 'Hello! How can I help you?',
        sources: [],
      });
      analyticsService.logChatEvent.mockResolvedValue({} as any);

      const result = await controller.chat('test-shop', chatDto);

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

      await expect(controller.chat('non-existent', chatDto)).rejects.toThrow(NotFoundException);
    });
  });
});
