import { AnalyticsRepository } from '@/modules/analytics/repositories';
import { EvotorApiService } from '@/modules/evotor/evotor-api.service';
import { EvotorIntegrationRepository } from '@/modules/evotor/repositories';
import { OrderRepository } from '@/modules/order/repositories';
import { ProductRepository } from '@/modules/product/repositories';
import { ChatSessionRepository } from '@/modules/rag/chat/repositories';
import { RegistrationApplication } from '@/modules/registration-application/entities';
import { ShopRepository } from '@/modules/shop/repositories';

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrationStatus } from '@/common/enums';
import {
  AdminDashboardPeriod,
  AdminDashboardQueryDto,
  AdminDashboardSummaryDto,
} from './dto';

interface RecentShopInfo {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    private readonly shopRepository: ShopRepository,
    private readonly productRepository: ProductRepository,
    private readonly evotorRepository: EvotorIntegrationRepository,
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly chatSessionRepository: ChatSessionRepository,
    private readonly orderRepository: OrderRepository,
    private readonly evotorApiService: EvotorApiService,
    @InjectRepository(RegistrationApplication)
    private readonly registrationAppRepository: Repository<RegistrationApplication>,
  ) {}

  async getSummary(
    query: AdminDashboardQueryDto,
  ): Promise<AdminDashboardSummaryDto> {
    const { from, to } = this.resolvePeriod(query);

    const [
      totalShops,
      activeShops,
      disconnectedEvotor,
      storefrontViews,
      chatEvents,
      chatSessions,
      recentShops,
      pendingApplications,
      pendingOrders,
      shopsWithoutProducts,
      bridgeStores,
      bridgeProducts,
    ] = await Promise.all([
      this.shopRepository.countAll(),
      this.shopRepository.countActive(),
      this.evotorRepository.countByStatus('disconnected'),
      this.analyticsRepository.countStorefrontViewsByPeriod(from, to),
      this.analyticsRepository.countChatEventsByPeriod(from, to),
      this.chatSessionRepository.countByPeriod(from, to),
      this.shopRepository.findRecent(10),
      this.registrationAppRepository.count({
        where: { status: RegistrationStatus.PENDING },
      }),
      this.orderRepository.countByStatus('PENDING'),
      this.productRepository.countByShopWithoutProducts(),
      this.evotorApiService
        .listAdminStores({ take: 1 })
        .then((r) => r.total)
        .catch(() => 0),
      this.evotorApiService
        .listAdminProducts({ take: 1 })
        .then((r) => r.total)
        .catch(() => 0),
    ]);

    const shopsWithProducts = Math.max(0, totalShops - shopsWithoutProducts);

    const catalogReadinessRate =
      totalShops > 0
        ? Math.round((shopsWithProducts / totalShops) * 100) / 100
        : 0;

    const overview = {
      activeStorefronts: activeShops,
      evotorConnectedShops: bridgeStores,
      productsSynced: bridgeProducts,
      storefrontViews,
      chatSessions,
      pendingRegistrations: pendingApplications,
      evotorConnectionRate:
        activeShops > 0
          ? Math.round((bridgeStores / activeShops) * 100) / 100
          : 0,
      catalogReadinessRate,
    };

    const attention = {
      disconnectedEvotor,
      shopsWithoutProducts,
      pendingRegistrations: pendingApplications,
      pendingOrders,
    };

    const activity = {
      chatEvents,
      chatSessions,
    };

    const recentShopsDto = await this.buildRecentShops(recentShops);
    const recentEvents = await this.buildRecentEvents();

    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      overview,
      attention,
      activity,
      recentShops: recentShopsDto,
      recentEvents,
    };
  }

  private resolvePeriod(query: AdminDashboardQueryDto): {
    from: Date;
    to: Date;
  } {
    const now = new Date();
    const to = query.to
      ? new Date(query.to)
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        );

    if (query.from) {
      return { from: new Date(query.from), to };
    }

    const period = query.period ?? AdminDashboardPeriod.SEVEN_DAYS;
    const from = new Date(to);

    switch (period) {
      case AdminDashboardPeriod.TODAY:
        from.setHours(0, 0, 0, 0);
        break;
      case AdminDashboardPeriod.SEVEN_DAYS:
        from.setDate(from.getDate() - 7);
        break;
      case AdminDashboardPeriod.THIRTY_DAYS:
        from.setDate(from.getDate() - 30);
        break;
    }

    return { from, to };
  }

  private async buildRecentShops(shops: RecentShopInfo[]): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      productsCount: number;
      evotorStatus: string;
      ragStatus: string;
      createdAt: string;
    }>
  > {
    const evotorIntegrations = await this.evotorRepository.findAll();
    const evotorByShop = new Map(evotorIntegrations.map((i) => [i.shopId, i]));

    const result: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      productsCount: number;
      evotorStatus: string;
      ragStatus: string;
      createdAt: string;
    }> = [];

    for (const shop of shops) {
      const productsCount = await this.productRepository.countByShop(shop.id);
      const evotor = evotorByShop.get(shop.id);
      const evotorStatus = evotor
        ? evotor.status === 'connected'
          ? 'ACTIVE'
          : 'DISCONNECTED'
        : 'NOT_CONNECTED';

      const ragStatus = productsCount > 0 ? 'CATALOG_ONLY' : 'NOT_CONFIGURED';

      result.push({
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        status: shop.isActive ? 'ACTIVE' : 'INACTIVE',
        productsCount,
        evotorStatus,
        ragStatus,
        createdAt: shop.createdAt.toISOString(),
      });
    }

    return result;
  }

  private async buildRecentEvents(): Promise<
    Array<{
      id: string;
      type: string;
      title: string;
      shopName: string | null;
      status: string;
      createdAt: string;
    }>
  > {
    const events: Array<{
      id: string;
      type: string;
      title: string;
      shopName: string | null;
      status: string;
      createdAt: Date;
    }> = [];

    const [recentChatEvents, recentOrders, recentSessions] = await Promise.all([
      this.analyticsRepository.findRecentChatEvents(5),
      this.orderRepository.findRecent(5),
      this.chatSessionRepository.findRecent(5),
    ]);

    for (const event of recentChatEvents) {
      events.push({
        id: event.id,
        type: 'CHAT_EVENT',
        title: event.userQuery.substring(0, 80),
        shopName: null,
        status: 'PROCESSED',
        createdAt: event.createdAt,
      });
    }

    for (const order of recentOrders) {
      events.push({
        id: order.id,
        type: 'ORDER',
        title: `Order #${order.id.substring(0, 8)} - ${order.totalAmount}`,
        shopName: null,
        status: order.status,
        createdAt: order.createdAt,
      });
    }

    for (const session of recentSessions) {
      events.push({
        id: session.id,
        type: 'CHAT_EVENT',
        title: `Session: ${session.title}`,
        shopName: null,
        status: session.status,
        createdAt: session.createdAt,
      });
    }

    events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return events.slice(0, 10).map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    }));
  }
}
