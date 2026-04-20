import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvotorAuthGuard } from './common/guards';
import { RateLimitInterceptor } from './common/interceptors';
import { DeviceController } from './device.controller';
import { DocumentController } from './document.controller';
import { ProductController } from './product.controller';
import { StoreController } from './store.controller';

import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  controllers: [AppController, StoreController, DeviceController, ProductController, DocumentController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: EvotorAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
  ],
})
export class AppModule {}
