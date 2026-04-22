import { CacheTTL, RedisClient } from '@/common/types';
import { CacheService } from './cache.service';

import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Global()
@Module({})
export class CacheModule {
  static forRootAsync(): DynamicModule {
    return {
      module: CacheModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: RedisClient,
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<RedisClientType> => {
            const host = configService.getOrThrow<string>('REDIS_HOST');
            const port = configService.getOrThrow<number>('REDIS_PORT');
            const password = configService.getOrThrow<string>('REDIS_PASSWORD');

            const client: RedisClientType = createClient({
              url: `redis://${host}:${port}`,
              password: password || undefined,
              socket: {
                reconnectStrategy: (times) => {
                  if (times > 10) {
                    return new Error('Too many reconnect attempts');
                  }
                  return Math.min(times * 50, 2000);
                },
              },
            });

            await client.connect();

            return client;
          },
        },
        {
          provide: CacheTTL,
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            cacheTtl: config.get<number>('CACHE_TTL') || 3600,
          }),
        },

        CacheService,
      ],
      exports: [CacheService],
    };
  }
}
