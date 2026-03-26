import { AnalyticsService } from './analytics.service';
import { ChatEvent } from './entities';

import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('chat-stats')
  @ApiOperation({ summary: 'Get chat statistics for a shop within a date range' })
  @ApiQuery({ name: 'shopId', type: String, required: true })
  @ApiQuery({ name: 'from', type: String, required: true, description: 'ISO date string' })
  @ApiQuery({ name: 'to', type: String, required: true, description: 'ISO date string' })
  @ApiResponse({ status: 200, description: 'Returns chat events', type: [ChatEvent] })
  async getChatStats(@Query('shopId') shopId: string, @Query('from') from: string, @Query('to') to: string) {
    return this.analyticsService.getChatStats(shopId, new Date(from), new Date(to));
  }

  @Get('top-questions')
  @ApiOperation({ summary: 'Get top questions for a shop' })
  @ApiQuery({ name: 'shopId', type: String, required: true })
  @ApiQuery({ name: 'limit', type: Number, required: false, default: 10 })
  @ApiResponse({ status: 200, description: 'Returns top questions and their counts' })
  async getTopQuestions(@Query('shopId') shopId: string, @Query('limit') limit: number = 10) {
    return this.analyticsService.getTopQuestions(shopId, limit);
  }

  @Get('storefront-views')
  @ApiOperation({ summary: 'Get storefront views count for a shop within a date range' })
  @ApiQuery({ name: 'shopId', type: String, required: true })
  @ApiQuery({ name: 'from', type: String, required: true, description: 'ISO date string' })
  @ApiQuery({ name: 'to', type: String, required: true, description: 'ISO date string' })
  @ApiResponse({ status: 200, description: 'Returns count of storefront views' })
  async getStorefrontViews(@Query('shopId') shopId: string, @Query('from') from: string, @Query('to') to: string) {
    return this.analyticsService.getStorefrontViewCount(shopId, new Date(from), new Date(to));
  }

  // Note: The stock-report endpoint would be in a separate module or service, but for now we can leave it as a placeholder.
  // According to PRD, it's GET /analytics/stock-report (CSV)
  // We'll create a stub for it.
  @Get('stock-report')
  @ApiOperation({ summary: 'Get stock report as CSV' })
  @ApiQuery({ name: 'shopId', type: String, required: true })
  @ApiResponse({ status: 200, description: 'Returns CSV stock report' })
  getStockReport(@Query('shopId') shopId: string) {
    // TODO: Implement CSV generation for stock report
    return { message: `Stock report endpoint not yet implemented for shop ${shopId}` };
  }
}
