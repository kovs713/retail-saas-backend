import { Roles } from '@/common/decorators';
import { ApiResponse as AppApiResponse } from '@/common/dto';
import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { CreateShopDto, ShopDto, UpdateShopDto } from './dto';
import { ShopService } from './shop.service';

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Shops')
@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new shop (Super Admin only)' })
  @ApiBearerAuth('JWT')
  @ApiResponse({ status: 201, description: 'Shop created successfully', type: ShopDto })
  @ApiResponse({ status: 409, description: 'Conflict - Shop slug already exists' })
  async create(@Body() createShopDto: CreateShopDto): Promise<AppApiResponse<ShopDto>> {
    const shop = await this.shopService.create(createShopDto);
    return { success: true, data: ShopDto.fromEntity(shop), message: 'Shop created successfully' };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get shop by slug' })
  @ApiResponse({ status: 200, description: 'Shop retrieved successfully', type: ShopDto })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async findBySlug(@Param('slug') slug: string): Promise<AppApiResponse<ShopDto>> {
    const shop = await this.shopService.findBySlug(slug);
    return { success: true, data: ShopDto.fromEntity(shop) };
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get shop by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Shop ID' })
  @ApiResponse({ status: 200, description: 'Shop retrieved successfully', type: ShopDto })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async findById(@Param('id') id: string): Promise<AppApiResponse<ShopDto>> {
    const shop = await this.shopService.findById(id);
    return { success: true, data: ShopDto.fromEntity(shop) };
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update shop profile (Owner or Super Admin)' })
  @ApiBearerAuth('JWT')
  @ApiParam({ name: 'id', type: String, description: 'Shop ID' })
  @ApiResponse({ status: 200, description: 'Shop updated successfully', type: ShopDto })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async update(@Param('id') id: string, @Body() updateShopDto: UpdateShopDto): Promise<AppApiResponse<ShopDto>> {
    const shop = await this.shopService.update(id, updateShopDto);
    return { success: true, data: ShopDto.fromEntity(shop), message: 'Shop updated successfully' };
  }

  @Patch(':id/media')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update shop logo and banner URLs (Owner or Super Admin)' })
  @ApiBearerAuth('JWT')
  @ApiParam({ name: 'id', type: String, description: 'Shop ID' })
  @ApiResponse({ status: 200, description: 'Shop media URLs updated successfully', type: ShopDto })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async updateMedia(
    @Param('id') id: string,
    @Body('logoUrl') logoUrl?: string,
    @Body('bannerUrl') bannerUrl?: string,
  ): Promise<AppApiResponse<ShopDto>> {
    const shop = await this.shopService.updateMediaUrls(id, logoUrl, bannerUrl);
    return { success: true, data: ShopDto.fromEntity(shop), message: 'Shop media URLs updated successfully' };
  }
}
