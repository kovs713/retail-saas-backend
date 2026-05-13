import { Roles } from '@/common/decorators';
import { ApiResponse as AppApiResponse } from '@/common/dto';
import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { Request } from '@/common/types';
import { ConnectEvotorDto } from './dto';
import { EvotorService } from './evotor.service';

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Evotor')
@ApiBearerAuth('JWT')
@Controller('evotor/shops')
@UseGuards(AuthGuard, RolesGuard)
export class EvotorController {
  constructor(private readonly evotorService: EvotorService) {}

  @Post(':shopId/connect')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Connect a shop to Evotor',
  })
  @ApiParam({ name: 'shopId', type: String })
  async connect(
    @Param('shopId')
    shopId: string,
    @Body()
    body: ConnectEvotorDto,
    @Req()
    req: Request,
  ): Promise<AppApiResponse<unknown>> {
    this.assertShopAccess(shopId, req);
    const integration = await this.evotorService.connect(shopId, body);
    return {
      success: true,
      data: integration,
      message: 'Evotor connected successfully',
    };
  }

  @Get(':shopId/status')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Get evotor connection status for a shop',
  })
  @ApiParam({
    name: 'shopId',
    type: String,
  })
  async getStatus(
    @Param('shopId')
    shopId: string,
    @Req()
    req: Request,
  ): Promise<AppApiResponse<unknown>> {
    this.assertShopAccess(shopId, req);
    const integration = await this.evotorService.getStatus(shopId);
    return { success: true, data: integration };
  }

  @Get(':shopId/presentation-status')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Get Evotor integration presentation status',
  })
  @ApiParam({
    name: 'shopId',
    type: String,
  })
  async getPresentationStatus(
    @Param('shopId')
    shopId: string,
    @Req()
    req: Request,
  ): Promise<AppApiResponse<unknown>> {
    this.assertShopAccess(shopId, req);
    const status = await this.evotorService.getPresentationStatus(shopId);
    return { success: true, data: status };
  }

  @Delete(':shopId/connect')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Disconnect a shop from Evotor',
  })
  @ApiParam({
    name: 'shopId',
    type: String,
  })
  async disconnect(
    @Param('shopId')
    shopId: string,
    @Req()
    req: Request,
  ): Promise<AppApiResponse<unknown>> {
    this.assertShopAccess(shopId, req);
    const integration = await this.evotorService.disconnect(shopId);
    return {
      success: true,
      data: integration,
      message: 'Evotor disconnected successfully',
    };
  }

  @Post(':shopId/sync/products')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Sync products from Evotor into local catalog',
  })
  @ApiParam({
    name: 'shopId',
    type: String,
  })
  async syncProducts(
    @Param('shopId')
    shopId: string,
    @Req()
    req: Request,
  ): Promise<AppApiResponse<unknown>> {
    this.assertShopAccess(shopId, req);
    const result = await this.evotorService.syncProducts(shopId);
    return {
      success: true,
      data: result,
      message: 'Evotor products synced successfully',
    };
  }

  private assertShopAccess(shopId: string, req: Request): void {
    if (req.user?.role === Role.ADMIN.toString()) {
      return;
    }

    if (req.user?.shopId !== shopId) {
      throw new ForbiddenException('You do not have access to this shop');
    }
  }
}
