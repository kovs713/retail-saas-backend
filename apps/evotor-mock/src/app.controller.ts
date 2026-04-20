import { AppService } from './app.service';

import { Body, Controller, Get, Post } from '@nestjs/common';

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
    },
  ) {
    return this.appService.seedStore(body.storeId, body.productCount ?? 0);
  }
}
