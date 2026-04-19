import { Roles, Tenant } from '@/common/decorators';
import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { TenantContext } from '@/common/types';
import { ProductRepository } from '@/modules/product/repositories';
import { AnalyticsService } from './analytics.service';
import { ChatEvent } from './entities';

import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly productRepository: ProductRepository,
  ) {}

  @Get('chat-stats')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get chat statistics for a shop within a date range' })
  @ApiQuery({ name: 'from', type: String, required: true, description: 'ISO date string' })
  @ApiQuery({ name: 'to', type: String, required: true, description: 'ISO date string' })
  @ApiResponse({ status: 200, description: 'Returns chat events', type: [ChatEvent] })
  async getChatStats(@Query('from') from: string, @Query('to') to: string, @Tenant() tenantContext: TenantContext) {
    const data = await this.analyticsService.getChatStats(tenantContext.shopId, new Date(from), new Date(to));
    return { success: true, data };
  }

  @Get('top-questions')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get top questions for a shop' })
  @ApiQuery({ name: 'limit', type: Number, required: false, default: 10 })
  @ApiResponse({ status: 200, description: 'Returns top questions and their counts' })
  async getTopQuestions(@Query('limit') limit: number = 10, @Tenant() tenantContext: TenantContext) {
    const data = await this.analyticsService.getTopQuestions(tenantContext.shopId, limit);
    return { success: true, data };
  }

  @Get('storefront-views')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get storefront views count for a shop within a date range' })
  @ApiQuery({ name: 'from', type: String, required: true, description: 'ISO date string' })
  @ApiQuery({ name: 'to', type: String, required: true, description: 'ISO date string' })
  @ApiResponse({ status: 200, description: 'Returns count of storefront views' })
  async getStorefrontViews(
    @Query('from') from: string,
    @Query('to') to: string,
    @Tenant() tenantContext: TenantContext,
  ) {
    const data = await this.analyticsService.getStorefrontViewCount(tenantContext.shopId, new Date(from), new Date(to));
    return { success: true, data };
  }

  @Get('total-revenue')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get total revenue for current month with % change from last month' })
  @ApiResponse({ status: 200, description: 'Returns total revenue and percentage change' })
  async getTotalRevenue(@Tenant() tenantContext: TenantContext) {
    const data = await this.analyticsService.getRevenueWithPercent(tenantContext.shopId);
    return { success: true, data };
  }

  @Get('total-orders')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get total orders for current month with % change from last month' })
  @ApiResponse({ status: 200, description: 'Returns total orders and percentage change' })
  async getTotalOrders(@Tenant() tenantContext: TenantContext) {
    const data = await this.analyticsService.getOrdersWithPercent(tenantContext.shopId);
    return { success: true, data };
  }

  @Get('stock-report')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Export stock report as CSV' })
  @ApiResponse({ status: 200, description: 'Returns CSV file' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="stock-report.csv"')
  async getStockReport(@Res() res: Response, @Tenant() tenantContext: TenantContext): Promise<void> {
    const [products] = await this.productRepository.findAll(tenantContext.shopId, { page: 1, limit: 10000 });

    const csvHeader = 'SKU,Name,Category,Price,Quantity\n';
    const csvRows = products
      .map((product) => {
        const sku = this.escapeCsvField(product.sku);
        const name = this.escapeCsvField(product.name);
        const category = this.escapeCsvField(product.category?.name || '');
        const price = Number(product.price).toFixed(2);
        const quantity = product.quantity;
        return `${sku},${name},${category},${price},${quantity}`;
      })
      .join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="stock-report-${tenantContext.shopId}.csv"`);
    res.send('\uFEFF' + csvContent);
  }

  private escapeCsvField(field: string): string {
    if (!field) return '""';
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}
