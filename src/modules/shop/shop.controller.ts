import { Roles, Tenant } from '@/common/decorators';
import { ApiResponse as AppApiResponse } from '@/common/dto';
import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { Request, TenantContext } from '@/common/types';
import {
  CreateLocationDto,
  CreateShopDto,
  LocationDto,
  ShopDto,
  UpdateLocationDto,
  UpdateShopDto,
} from './dto';
import { ShopService } from './shop.service';

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Shops')
@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create a new shop (Admin only)',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 201,
    description: 'Shop created successfully',
    type: ShopDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Shop slug already exists',
  })
  async create(
    @Body()
    createShopDto: CreateShopDto,
  ): Promise<AppApiResponse<ShopDto>> {
    const shop = await this.shopService.create(createShopDto);
    return {
      success: true,
      data: ShopDto.fromEntity(shop),
      message: 'Shop created successfully',
    };
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get shop by slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Shop retrieved successfully',
    type: ShopDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Shop not found',
  })
  async findBySlug(
    @Param('slug')
    slug: string,
  ): Promise<AppApiResponse<ShopDto>> {
    const shop = await this.shopService.findBySlug(slug);
    return { success: true, data: ShopDto.fromEntity(shop) };
  }

  @Get('id/:id')
  @ApiOperation({
    summary: 'Get shop by ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Shop ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Shop retrieved successfully',
    type: ShopDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Shop not found',
  })
  async findById(
    @Param('id')
    id: string,
  ): Promise<AppApiResponse<ShopDto>> {
    const shop = await this.shopService.findById(id);
    return { success: true, data: ShopDto.fromEntity(shop) };
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Update shop profile (Owner or Admin)',
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Shop ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Shop updated successfully',
    type: ShopDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Shop not found',
  })
  async update(
    @Param('id')
    id: string,
    @Body()
    updateShopDto: UpdateShopDto,
    @Tenant()
    tenantContext: TenantContext,
    @Req()
    req: Request,
  ): Promise<AppApiResponse<ShopDto>> {
    this.assertShopAccess(id, tenantContext, req);
    const shop = await this.shopService.update(id, updateShopDto);
    return {
      success: true,
      data: ShopDto.fromEntity(shop),
      message: 'Shop updated successfully',
    };
  }

  @Patch(':id/media')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Update shop logo and banner URLs (Owner or Admin)',
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Shop ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Shop media URLs updated successfully',
    type: ShopDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Shop not found',
  })
  async updateMedia(
    @Param('id')
    id: string,
    @Tenant()
    tenantContext: TenantContext,
    @Req()
    req: Request,
    @Body('logoUrl')
    logoUrl?: string,
    @Body('bannerUrl')
    bannerUrl?: string,
  ): Promise<AppApiResponse<ShopDto>> {
    this.assertShopAccess(id, tenantContext, req);
    const shop = await this.shopService.updateMediaUrls(id, logoUrl, bannerUrl);
    return {
      success: true,
      data: ShopDto.fromEntity(shop),
      message: 'Shop media URLs updated successfully',
    };
  }

  @Post(':shopId/locations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Create a location for a shop (Owner or Admin)',
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'shopId',
    type: String,
    description: 'Shop ID',
  })
  @ApiResponse({
    status: 201,
    description: 'Location created successfully',
    type: LocationDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Maximum 3 active locations reached',
  })
  @ApiResponse({
    status: 404,
    description: 'Shop not found',
  })
  async createLocation(
    @Param('shopId')
    shopId: string,
    @Body()
    createLocationDto: CreateLocationDto,
    @Tenant()
    tenantContext: TenantContext,
    @Req()
    req: Request,
  ): Promise<AppApiResponse<LocationDto>> {
    this.assertShopAccess(shopId, tenantContext, req);
    const location = await this.shopService.createLocation(
      shopId,
      createLocationDto,
    );
    return {
      success: true,
      data: LocationDto.fromEntity(location),
      message: 'Location created successfully',
    };
  }

  @Get(':shopId/locations')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'List locations for a shop (Owner or Admin)',
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'shopId',
    type: String,
    description: 'Shop ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Locations retrieved successfully',
    type: [LocationDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Shop not found',
  })
  async findLocations(
    @Param('shopId')
    shopId: string,
    @Tenant()
    tenantContext: TenantContext,
    @Req()
    req: Request,
  ): Promise<AppApiResponse<LocationDto[]>> {
    this.assertShopAccess(shopId, tenantContext, req);
    const locations = await this.shopService.findLocations(shopId);
    return { success: true, data: LocationDto.fromEntities(locations) };
  }

  @Get(':shopId/locations/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Get a location by ID (Owner or Admin)',
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'shopId',
    type: String,
    description: 'Shop ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Location ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Location retrieved successfully',
    type: LocationDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  async findLocation(
    @Param('shopId')
    shopId: string,
    @Param('id')
    id: string,
    @Tenant()
    tenantContext: TenantContext,
    @Req()
    req: Request,
  ): Promise<AppApiResponse<LocationDto>> {
    this.assertShopAccess(shopId, tenantContext, req);
    const location = await this.shopService.findLocation(shopId, id);
    return { success: true, data: LocationDto.fromEntity(location) };
  }

  @Patch(':shopId/locations/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Update a location (Owner or Admin)',
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'shopId',
    type: String,
    description: 'Shop ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Location ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Location updated successfully',
    type: LocationDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  async updateLocation(
    @Param('shopId')
    shopId: string,
    @Param('id')
    id: string,
    @Body()
    updateLocationDto: UpdateLocationDto,
    @Tenant()
    tenantContext: TenantContext,
    @Req()
    req: Request,
  ): Promise<AppApiResponse<LocationDto>> {
    this.assertShopAccess(shopId, tenantContext, req);
    const location = await this.shopService.updateLocation(
      shopId,
      id,
      updateLocationDto,
    );
    return {
      success: true,
      data: LocationDto.fromEntity(location),
      message: 'Location updated successfully',
    };
  }

  @Delete(':shopId/locations/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Delete a location (Owner or Admin)',
  })
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'shopId',
    type: String,
    description: 'Shop ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Location ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Location deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  async deleteLocation(
    @Param('shopId')
    shopId: string,
    @Param('id')
    id: string,
    @Tenant()
    tenantContext: TenantContext,
    @Req()
    req: Request,
  ): Promise<AppApiResponse<void>> {
    this.assertShopAccess(shopId, tenantContext, req);
    await this.shopService.deleteLocation(shopId, id);
    return { success: true, message: 'Location deleted successfully' };
  }

  private assertShopAccess(
    id: string,
    tenantContext: TenantContext,
    req?: Request,
  ): void {
    if (req?.user?.role === Role.ADMIN) {
      return;
    }

    if (tenantContext.shopId !== id) {
      throw new ForbiddenException('You do not have access to this shop');
    }
  }
}
