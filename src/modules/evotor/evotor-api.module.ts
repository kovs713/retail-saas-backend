import { EvotorApiService } from './evotor-api.service';

import { Module } from '@nestjs/common';

@Module({
  providers: [EvotorApiService],
  exports: [EvotorApiService],
})
export class EvotorApiModule {}
