import { AppService } from './app.service';

import { Controller, Get, Param } from '@nestjs/common';

@Controller()
export class DeviceController {
  constructor(private readonly appService: AppService) {}

  @Get('devices')
  getDevices() {
    return {
      items: this.appService.getDevices(),
      paging: {},
    };
  }

  @Get('stores/:storeId/devices')
  getStoreDevices(
    @Param('storeId')
    storeId: string,
  ) {
    return {
      items: this.appService.getDevicesByStoreId(storeId),
      paging: {},
    };
  }
}
