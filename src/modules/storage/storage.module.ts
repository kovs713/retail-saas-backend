import { MinioClient, MinioConfig, MinioOptions } from '@/common/types';
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
          provide: MinioConfig,
          inject: [ConfigService],
          useFactory: (configService: ConfigService): MinioOptions => ({
            host: configService.getOrThrow<string>('S3_HOST'),
            port: configService.getOrThrow<number>('S3_PORT'),
            accessKey: configService.getOrThrow<string>('S3_USERNAME'),
            secretKey: configService.getOrThrow<string>('S3_PASSWORD'),
            userSSL: configService.getOrThrow<string>('S3_USE_SSL') === 'true',
            bucket: configService.getOrThrow<string>('S3_BUCKET'),
          }),
        },
        {
          provide: MinioClient,
          inject: [MinioConfig],
          useFactory: (bucketSecrets: MinioOptions): Client => {
            return new Client({
              endPoint: bucketSecrets.host,
              port: bucketSecrets.port,
              useSSL: bucketSecrets.userSSL,
              accessKey: bucketSecrets.accessKey,
              secretKey: bucketSecrets.secretKey,
            });
          },
        },

        StorageService,
      ],
      exports: [StorageService],
    };
  }
}
