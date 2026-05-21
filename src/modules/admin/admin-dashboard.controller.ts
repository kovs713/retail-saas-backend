import { Roles } from '@/common/decorators';
import { ApiResponse as AppApiResponse } from '@/common/dto';
import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardQueryDto, AdminDashboardSummaryDto } from './dto';

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Admin Dashboard')
@ApiBearerAuth('JWT')
@Controller('admin/dashboard')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get platform dashboard summary' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', '7d', '30d'],
    description: 'Time period for activity data',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Custom start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Custom end date (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
    type: AdminDashboardSummaryDto,
  })
  async getSummary(
    @Query() query: AdminDashboardQueryDto,
  ): Promise<AppApiResponse<AdminDashboardSummaryDto>> {
    const summary = await this.dashboardService.getSummary(query);
    return { success: true, data: summary };
  }
}
