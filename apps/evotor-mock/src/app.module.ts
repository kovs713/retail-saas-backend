import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvotorAuthGuard } from './common/guards';
import { RateLimitInterceptor } from './common/interceptors';

import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  controllers: [AppController],
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
