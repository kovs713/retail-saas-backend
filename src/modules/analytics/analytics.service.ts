import { ChatEvent, StorefrontView } from './entities';
import { AnalyticsRepository } from './repositories';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  // Chat Events
  async logChatEvent(
    shopId: string,
    userQuery: string,
    answerLength: number,
    sourcesCount: number,
  ): Promise<ChatEvent> {
    this.logger.log(`Logging chat event for shop ${shopId}`);
    return this.analyticsRepository.createChatEvent({
      shopId,
      userQuery,
      answerLength,
      sourcesCount,
    });
  }

  async getChatStats(shopId: string, from: Date, to: Date) {
    return this.analyticsRepository.getChatStats(shopId, from, to);
  }

  async getTopQuestions(shopId: string, limit: number = 10) {
    return this.analyticsRepository.getTopQuestions(shopId, limit);
  }

  // Storefront Views
  async logStorefrontView(shopId: string): Promise<StorefrontView> {
    this.logger.log(`Logging storefront view for shop ${shopId}`);
    return this.analyticsRepository.createStorefrontView({
      shopId,
    });
  }

  async getStorefrontViewCount(shopId: string, from: Date, to: Date) {
    return this.analyticsRepository.getStorefrontViewCount(shopId, from, to);
  }
}
