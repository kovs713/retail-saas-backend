import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { CreateShopDto } from '../dto/create-shop.dto';
import { UpdateShopDto } from '../dto/update-shop.dto';

import { ShopService } from '../shop.service';

@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post()
  async create(@Body() createShopDto: CreateShopDto) {
    return this.shopService.create(createShopDto);
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.shopService.findBySlug(slug);
  }

  @Get('id/:id')
  async findById(@Param('id') id: string) {
    return this.shopService.findById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateShopDto: UpdateShopDto) {
    return this.shopService.update(id, updateShopDto);
  }
}
