import { S3Client, S3Config, S3Options } from '@/common/types';
import { ObjectStorageService } from './object-storage.service';

import {
  CreateBucketCommand,
  S3Client as AwsS3Client,
} from '@aws-sdk/client-s3';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({})
export class ObjectStorageModule {
  static forRoot(): DynamicModule {
    return {
      module: ObjectStorageModule,
      providers: [
        {
          provide: S3Config,
          inject: [ConfigService],
          useFactory: (configService: ConfigService): S3Options => ({
            host: configService.getOrThrow<string>('S3_HOST'),
            port: configService.getOrThrow<number>('S3_PORT'),
            accessKey: configService.getOrThrow<string>('S3_USERNAME'),
            secretKey: configService.getOrThrow<string>('S3_PASSWORD'),
            bucket: configService.getOrThrow<string>('S3_BUCKET'),
            region: configService.get<string>('S3_REGION') ?? 'us-east-1',
            useSSL: configService.getOrThrow<string>('S3_USE_SSL') === 'true',
          }),
        },
        {
          provide: S3Client,
          inject: [S3Config],
          useFactory: async (s3Options: S3Options): Promise<AwsS3Client> => {
            const protocol = s3Options.useSSL ? 'https' : 'http';

            const client = new AwsS3Client({
              region: s3Options.region,
              endpoint: `${protocol}://${s3Options.host}:${s3Options.port}`,
              forcePathStyle: true,
              credentials: {
                accessKeyId: s3Options.accessKey,
                secretAccessKey: s3Options.secretKey,
              },
            });

            try {
              await client.send(
                new CreateBucketCommand({ Bucket: s3Options.bucket }),
              );
            } catch (error: unknown) {
              const code =
                (error as { Code?: string; code?: string })?.Code ??
                (error as { Code?: string; code?: string })?.code;
              if (
                code !== 'BucketAlreadyExists' &&
                code !== 'BucketAlreadyOwnedByYou'
              ) {
                throw error;
              }
            }

            return client;
          },
        },

        ObjectStorageService,
      ],
      exports: [ObjectStorageService],
    };
  }
}
