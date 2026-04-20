import { ChatEvent, StorefrontView } from './entities';
import { OrderRepository } from '@/modules/order/repositories';
import { AnalyticsRepository } from './repositories';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly orderRepository: OrderRepository,
  ) {}

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

  async logStorefrontView(shopId: string): Promise<StorefrontView> {
    this.logger.log(`Logging storefront view for shop ${shopId}`);
    return this.analyticsRepository.createStorefrontView({
      shopId,
    });
  }

  async getStorefrontViewCount(shopId: string, from: Date, to: Date) {
    return this.analyticsRepository.getStorefrontViewCount(shopId, from, to);
  }

  async getRevenueWithPercent(shopId: string): Promise<{ current: number; percentFromLastMonth: number }> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [current, lastMonth] = await Promise.all([
      this.orderRepository.getTotalRevenue(shopId, firstDayOfMonth, now),
      this.orderRepository.getTotalRevenue(shopId, firstDayOfLastMonth, lastDayOfLastMonth),
    ]);

    let percentFromLastMonth = 0;
    if (lastMonth > 0) {
      percentFromLastMonth = Number((((current - lastMonth) / lastMonth) * 100).toFixed(1));
    } else if (current > 0) {
      percentFromLastMonth = 100;
    }

    return { current, percentFromLastMonth };
  }

  async getOrdersWithPercent(shopId: string): Promise<{ current: number; percentFromLastMonth: number }> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [current, lastMonth] = await Promise.all([
      this.orderRepository.getTotalOrders(shopId, firstDayOfMonth, now),
      this.orderRepository.getTotalOrders(shopId, firstDayOfLastMonth, lastDayOfLastMonth),
    ]);

    let percentFromLastMonth = 0;
    if (lastMonth > 0) {
      percentFromLastMonth = Number((((current - lastMonth) / lastMonth) * 100).toFixed(1));
    } else if (current > 0) {
      percentFromLastMonth = 100;
    }

    return { current, percentFromLastMonth };
  }

  async getShopGrowth(shopId: string) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [revenueCurrent, revenueLast, ordersCurrent, ordersLast] = await Promise.all([
      this.orderRepository.getTotalRevenue(shopId, firstDayOfMonth, now),
      this.orderRepository.getTotalRevenue(shopId, firstDayOfLastMonth, lastDayOfLastMonth),
      this.orderRepository.getTotalOrders(shopId, firstDayOfMonth, now),
      this.orderRepository.getTotalOrders(shopId, firstDayOfLastMonth, lastDayOfLastMonth),
    ]);

    const revenueGrowth = this.calculatePercent(revenueLast, revenueCurrent);
    const ordersGrowth = this.calculatePercent(ordersLast, ordersCurrent);

    const growth = Math.round((revenueGrowth + ordersGrowth) / 2);

    return { growth };
  }

  private calculatePercent(previous: number, current: number): number {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0 && current > 0) return 100;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }
}
