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
          useFactory: async (config: ConfigService): Promise<RedisClientType> => {
            const host = config.get<string>('REDIS_HOST') || 'localhost';
            const port = config.get<number>('REDIS_PORT') || 6379;
            const password = config.get<string>('REDIS_PASSWORD');

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

            await client.connect().catch(() => {
              // Ignore connection errors in test environments
            });

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
