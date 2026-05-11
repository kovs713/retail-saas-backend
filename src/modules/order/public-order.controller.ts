import { ShopService } from '@/modules/shop/shop.service';
import { CreateOrderDto, OrderResponseDto } from './dto';
import { OrderService } from './order.service';
import { ApiResponse as AppApiResponse } from '@/common/dto';

import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Public orders')
@Controller('public/orders')
export class PublicOrderController {
  private readonly logger = new Logger(PublicOrderController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly shopService: ShopService,
  ) {}

  @Post(':shopSlug')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new order (no authentication required)',
  })
  @ApiParam({
    name: 'shopSlug',
    description: 'Shop slug',
    example: 'my-shop',
  })
  @ApiBody({
    type: CreateOrderDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async createOrder(
    @Param('shopSlug')
    shopSlug: string,
    @Body()
    createOrderDto: CreateOrderDto,
  ): Promise<AppApiResponse<OrderResponseDto>> {
    this.logger.log(`Creating order for shop slug: ${shopSlug}`);

    const shop = await this.shopService.findBySlug(shopSlug);

    if (!shop.isActive) {
      throw new BadRequestException('Shop is not active');
    }

    const order = await this.orderService.create(shop.id, createOrderDto);
    const response = this.orderService.toResponseDto(order);

    this.logger.log(`Order created: ${order.id} for shop ${shop.id}`);

    return { success: true, data: response };
  }
}
