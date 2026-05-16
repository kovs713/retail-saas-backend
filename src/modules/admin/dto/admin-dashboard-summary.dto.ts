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

class AdminDashboardKpiDto {
  @ApiProperty({ description: 'Total shops' })
  totalShops: number;

  @ApiProperty({ description: 'Active shops' })
  activeShops: number;

  @ApiProperty({ description: 'Shops with public storefront (active shops)' })
  publicStorefronts: number;

  @ApiProperty({ description: 'Active Evotor connections' })
  evotorConnections: number;

  @ApiProperty({ description: 'Total products' })
  products: number;

  @ApiProperty({
    description: 'Total knowledge sources (document groups in vector store)',
  })
  knowledgeSources: number;

  @ApiProperty({ description: 'Total documents (vector store chunks)' })
  documents: number;

  @ApiProperty({ description: 'Chat sessions in period' })
  chatSessions: number;

  @ApiProperty({ description: 'Total errors / attention items' })
  errors: number;

  @ApiProperty({
    description: 'Pending registration applications',
    required: false,
  })
  pendingApplications?: number;

  @ApiProperty({ description: 'Total orders', required: false })
  ordersCount?: number;

  @ApiProperty({ description: 'Pending orders', required: false })
  pendingOrdersCount?: number;
}

class AdminDashboardAttentionDto {
  @ApiProperty({ description: 'Disconnected Evotor integrations' })
  disconnectedEvotor: number;

  @ApiProperty({ description: 'Shops without products' })
  shopsWithoutProducts: number;

  @ApiProperty({ description: 'Shops without knowledge base' })
  shopsWithoutKnowledgeBase: number;

  @ApiProperty({
    description: 'Pending registration applications',
    required: false,
  })
  pendingApplications?: number;

  @ApiProperty({ description: 'Pending orders', required: false })
  pendingOrders?: number;
}

class AdminDashboardActivityDto {
  @ApiProperty({ description: 'Storefront views in period' })
  storefrontViews: number;

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

  @ApiProperty({ description: 'RAG knowledge base status' })
  ragStatus: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: string;
}

class AdminDashboardRecentEventDto {
  @ApiProperty({ description: 'Event ID' })
  id: string;

  @ApiProperty({
    description: 'Event type',
    enum: [
      'EVOTOR_WEBHOOK',
      'SYNC_JOB',
      'DOCUMENT',
      'CHAT_EVENT',
      'ORDER',
      'REGISTRATION',
    ],
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

  @ApiProperty({ type: AdminDashboardKpiDto })
  kpi: AdminDashboardKpiDto;

  @ApiProperty({ type: AdminDashboardAttentionDto })
  attention: AdminDashboardAttentionDto;

  @ApiProperty({ type: AdminDashboardActivityDto })
  activity: AdminDashboardActivityDto;

  @ApiProperty({ type: [AdminDashboardRecentShopDto] })
  recentShops: AdminDashboardRecentShopDto[];

  @ApiProperty({ type: [AdminDashboardRecentEventDto] })
  recentEvents: AdminDashboardRecentEventDto[];
}
