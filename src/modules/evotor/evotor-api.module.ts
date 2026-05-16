import { EvotorConfig, EvotorOptions } from '@/common/types';
import { EvotorApiService } from './evotor-api.service';

import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({})
export class EvotorApiModule {
  static forRoot(): DynamicModule {
    return {
      module: EvotorApiModule,
      providers: [
        {
          provide: EvotorConfig,
          inject: [ConfigService],
          useFactory: (configService: ConfigService): EvotorOptions => {
            const timeoutMs = Number(
              configService.getOrThrow<number>('EVOTOR_BRIDGE_TIMEOUT_MS'),
            );

            return {
              baseUrl: configService.getOrThrow<string>(
                'EVOTOR_BRIDGE_BASE_URL',
              ),
              adminToken: configService.getOrThrow<string>(
                'EVOTOR_BRIDGE_ADMIN_TOKEN',
              ),
              timeoutMs: timeoutMs,
            };
          },
        },

        EvotorApiService,
      ],
      exports: [EvotorApiService],
    };
  }
}
