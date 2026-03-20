import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateShopDto } from '../dto/create-shop.dto';
import { UpdateShopDto } from '../dto/update-shop.dto';

import { AuthGuard } from '@/core/auth/guards/auth.guard';
import { RolesGuard } from '@/core/auth/guards/roles.guard';
import { Roles } from '@/core/auth/decorators/roles.decorator';
import { Role } from '@/core/auth/guards/roles.guard';

import { ShopService } from '../shop.service';

@ApiTags('Shops')
@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new shop (Super Admin only)' })
  @ApiBearerAuth('JWT')
  async create(@Body() createShopDto: CreateShopDto) {
    return this.shopService.create(createShopDto);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get shop by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.shopService.findBySlug(slug);
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get shop by ID' })
  async findById(@Param('id') id: string) {
    return this.shopService.findById(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update shop profile (Owner or Super Admin)' })
  @ApiBearerAuth('JWT')
  async update(@Param('id') id: string, @Body() updateShopDto: UpdateShopDto) {
    return this.shopService.update(id, updateShopDto);
  }

  @Patch(':id/media')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update shop logo and banner URLs (Owner or Super Admin)' })
  @ApiBearerAuth('JWT')
  async updateMedia(@Param('id') id: string, @Body('logoUrl') logoUrl?: string, @Body('bannerUrl') bannerUrl?: string) {
    return this.shopService.updateMediaUrls(id, logoUrl, bannerUrl);
  }
}
