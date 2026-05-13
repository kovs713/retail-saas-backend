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
          useFactory: (configService: ConfigService): EvotorOptions => ({
            baseUrl: configService.getOrThrow<string>(
              'EVOTOR_BASE_URL',
              'https://api.evotor.ru/api/v1/inventories',
            ),
            token: configService.getOrThrow<string>('EVOTOR_TOKEN'),
          }),
        },

        EvotorApiService,
      ],
      exports: [EvotorApiService],
    };
  }
}
