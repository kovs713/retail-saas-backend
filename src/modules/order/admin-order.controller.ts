import { Roles, Tenant } from '@/common/decorators';
import { ApiResponse as AppApiResponse } from '@/common/dto';
import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { TenantContext } from '@/common/types';
import {
  OrderListResponseDto,
  OrderResponseDto,
  UpdateOrderStatusDto,
} from './dto';
import { OrderService } from './order.service';

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Admin orders')
@Controller('admin/orders')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get orders for the shop owner',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by status',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders list',
    type: OrderListResponseDto,
  })
  async getOrders(
    @Tenant()
    tenantContext: TenantContext,
    @Query('page')
    page: number = 1,
    @Query('limit')
    limit: number = 20,
    @Query('status')
    status?: string,
  ): Promise<AppApiResponse<OrderListResponseDto>> {
    const result = await this.orderService.findByShopId(tenantContext.shopId, {
      page,
      limit,
      status,
    });

    return {
      success: true,
      data: {
        data: result.data.map((order) =>
          this.orderService.toResponseDto(order),
        ),
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    };
  }

  @Patch(':id/status')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update order status',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Order status updated',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async updateOrderStatus(
    @Param('id')
    id: string,
    @Body()
    updateStatusDto: UpdateOrderStatusDto,
    @Tenant()
    tenantContext: TenantContext,
  ): Promise<AppApiResponse<OrderResponseDto>> {
    const order = await this.orderService.updateStatus(
      id,
      tenantContext.shopId,
      updateStatusDto,
    );
    const response = this.orderService.toResponseDto(order);

    return {
      success: true,
      data: response,
      message: 'Order status updated successfully',
    };
  }
}
