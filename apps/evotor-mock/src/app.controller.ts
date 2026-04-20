import { AppService } from './app.service';

import { Controller, Get } from '@nestjs/common';

@Controller('mock')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('status')
  getStatus() {
    return this.appService.getStatus();
  }
}
