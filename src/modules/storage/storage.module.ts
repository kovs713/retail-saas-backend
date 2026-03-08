import { MinioClient } from '@/common/types/providers.type';
import { AppLogger } from '@/core/logger/app-logger.service';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

@Global()
@Module({})
export class StorageModule {
  static forRoot(): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        {
          provide: MinioClient,
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const host = configService.getOrThrow<string>('S3_HOST');
            const port = configService.getOrThrow<number>('S3_PORT');
            const accessKey = configService.getOrThrow<string>('S3_USERNAME');
            const secretKey = configService.getOrThrow<string>('S3_PASSWORD');
            const useSSL = configService.get<string>('S3_USE_SSL', 'false') === 'true';

            return new Client({
              endPoint: host,
              port: parseInt(port.toString(), 10),
              useSSL,
              accessKey,
              secretKey,
            });
          },
        },
        StorageService,
        AppLogger,
      ],
      exports: [StorageService],
      controllers: [StorageController],
    };
  }
}
