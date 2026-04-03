import { ChatEvent, StorefrontView } from '../entities';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AnalyticsRepository {
  constructor(
    @InjectRepository(ChatEvent)
    private readonly chatEventRepository: Repository<ChatEvent>,
    @InjectRepository(StorefrontView)
    private readonly storefrontViewRepository: Repository<StorefrontView>,
  ) {}

  // Chat Events
  async createChatEvent(chatEvent: Partial<ChatEvent>): Promise<ChatEvent> {
    return this.chatEventRepository.save(this.chatEventRepository.create(chatEvent));
  }

  async getChatEventsByShopId(shopId: string): Promise<ChatEvent[]> {
    return this.chatEventRepository.find({
      where: { shopId },
      order: { createdAt: 'DESC' },
    });
  }

  async getChatStats(shopId: string, from: Date, to: Date) {
    return this.chatEventRepository
      .createQueryBuilder('chat_event')
      .where('chat_event.shopId = :shopId', { shopId })
      .andWhere('chat_event.createdAt BETWEEN :from AND :to', { from, to })
      .getMany();
  }

  async getTopQuestions(shopId: string, limit: number = 10) {
    return this.chatEventRepository
      .createQueryBuilder('chat_event')
      .select('chat_event.userQuery', 'question')
      .addSelect('COUNT(*)', 'count')
      .where('chat_event.shopId = :shopId', { shopId })
      .groupBy('chat_event.userQuery')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  // Storefront Views
  async createStorefrontView(storefrontView: Partial<StorefrontView>): Promise<StorefrontView> {
    return this.storefrontViewRepository.save(this.storefrontViewRepository.create(storefrontView));
  }

  async getStorefrontViewsByShopId(shopId: string): Promise<StorefrontView[]> {
    return this.storefrontViewRepository.find({
      where: { shopId },
      order: { createdAt: 'DESC' },
    });
  }

  async getStorefrontViewCount(shopId: string, from: Date, to: Date) {
    return this.storefrontViewRepository
      .createQueryBuilder('storefront_view')
      .where('storefront_view.shopId = :shopId', { shopId })
      .andWhere('storefront_view.createdAt BETWEEN :from AND :to', { from, to })
      .getCount();
  }
}
