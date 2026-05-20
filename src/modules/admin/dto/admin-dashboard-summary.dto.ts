import { ApiProperty } from '@nestjs/swagger';

class AdminDashboardPeriodDto {
  @ApiProperty({
    description: 'Period start',
    example: '2026-05-09T00:00:00.000Z',
  })
  from: string;

  @ApiProperty({
    description: 'Period end',
    example: '2026-05-16T23:59:59.999Z',
  })
  to: string;
}

class AdminDashboardOverviewDto {
  @ApiProperty({ description: 'Active storefronts (published shops)' })
  activeStorefronts: number;

  @ApiProperty({ description: 'Shops with active Evotor integration' })
  evotorConnectedShops: number;

  @ApiProperty({ description: 'Total products synced across all shops' })
  productsSynced: number;

  @ApiProperty({ description: 'Storefront views in period' })
  storefrontViews: number;

  @ApiProperty({ description: 'Chat sessions in period' })
  chatSessions: number;

  @ApiProperty({ description: 'Pending registration applications' })
  pendingRegistrations: number;

  @ApiProperty({
    description: 'Evotor connection rate (connected / active storefronts)',
  })
  evotorConnectionRate: number;

  @ApiProperty({
    description: 'Catalog readiness rate (shops with products / total shops)',
  })
  catalogReadinessRate: number;
}

class AdminDashboardAttentionDto {
  @ApiProperty({ description: 'Disconnected Evotor integrations' })
  disconnectedEvotor: number;

  @ApiProperty({ description: 'Shops without products' })
  shopsWithoutProducts: number;

  @ApiProperty({ description: 'Pending registration applications' })
  pendingRegistrations: number;

  @ApiProperty({ description: 'Pending orders' })
  pendingOrders: number;
}

class AdminDashboardActivityDto {
  @ApiProperty({ description: 'Chat events in period' })
  chatEvents: number;

  @ApiProperty({ description: 'Chat sessions in period' })
  chatSessions: number;
}

class AdminDashboardRecentShopDto {
  @ApiProperty({ description: 'Shop ID' })
  id: string;

  @ApiProperty({ description: 'Shop name' })
  name: string;

  @ApiProperty({ description: 'Shop slug' })
  slug: string;

  @ApiProperty({ description: 'Shop active status' })
  status: string;

  @ApiProperty({ description: 'Product count' })
  productsCount: number;

  @ApiProperty({ description: 'Evotor integration status' })
  evotorStatus: string;

  @ApiProperty({
    description: 'RAG knowledge base status',
    enum: ['NOT_CONFIGURED', 'CATALOG_ONLY', 'READY'],
  })
  ragStatus: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: string;
}

class AdminDashboardRecentEventDto {
  @ApiProperty({ description: 'Event ID' })
  id: string;

  @ApiProperty({
    description: 'Event type',
    enum: ['CHAT_EVENT', 'ORDER'],
  })
  type: string;

  @ApiProperty({ description: 'Event title / description' })
  title: string;

  @ApiProperty({ description: 'Shop name', nullable: true })
  shopName: string | null;

  @ApiProperty({ description: 'Event status' })
  status: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: string;
}

export class AdminDashboardSummaryDto {
  @ApiProperty({ type: AdminDashboardPeriodDto })
  period: AdminDashboardPeriodDto;

  @ApiProperty({ type: AdminDashboardOverviewDto })
  overview: AdminDashboardOverviewDto;

  @ApiProperty({ type: AdminDashboardAttentionDto })
  attention: AdminDashboardAttentionDto;

  @ApiProperty({ type: AdminDashboardActivityDto })
  activity: AdminDashboardActivityDto;

  @ApiProperty({ type: [AdminDashboardRecentShopDto] })
  recentShops: AdminDashboardRecentShopDto[];

  @ApiProperty({ type: [AdminDashboardRecentEventDto] })
  recentEvents: AdminDashboardRecentEventDto[];
}
