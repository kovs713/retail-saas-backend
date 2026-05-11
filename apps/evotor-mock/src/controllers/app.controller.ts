import { AppService } from '../app.service';
import { CategoryPreset } from '../types';

import { Body, Controller, Delete, Get, Post } from '@nestjs/common';

@Controller('mock')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('status')
  getStatus() {
    return this.appService.getStatus();
  }

  @Post('seed')
  seed(
    @Body()
    body: {
      storeId: string;
      productCount?: number;
      documentCount?: number;
      catalogPreset?: CategoryPreset;
    },
  ) {
    return this.appService.seedStore(
      body.storeId,
      body.productCount ?? 0,
      body.documentCount ?? 0,
      body.catalogPreset ?? CategoryPreset.DEFAULT,
    );
  }

  @Post('terminal-bindings')
  bindTerminals(
    @Body()
    body: {
      shopId: string;
      phone: string;
      imeis: string[];
    },
  ) {
    return this.appService.bindTerminals(body.shopId, body.phone, body.imeis);
  }

  @Delete('reset')
  reset() {
    return this.appService.reset();
  }
}
