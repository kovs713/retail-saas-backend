import { AppService } from '../app.service';

import { Controller, Get } from '@nestjs/common';

@Controller('stores')
export class StoreController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getStores() {
    return {
      items: this.appService.getStores(),
      paging: {},
    };
  }
}
