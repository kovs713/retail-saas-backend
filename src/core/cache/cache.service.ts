import { CacheTTL, RedisClient } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';

import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class CacheService {
  private readonly logger = new LoggerService(CacheService.name);

  constructor(
    @Inject(RedisClient) private readonly client: RedisClientType,
    @Inject(CacheTTL) private readonly cacheTtl: number,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.cacheTtl;
      await this.client.setEx(key, expiry, serialized);
    } catch {
      this.logger.error(`Setting cache with key ${key} has failed`);
    }
  }

  async incrementWithTtl(key: string, ttlSeconds: number): Promise<number> {
    try {
      const result = await this.client
        .multi()
        .incr(key)
        .expire(key, ttlSeconds, 'NX')
        .exec();
      const incrementResult = result?.[0];
      if (typeof incrementResult === 'number') {
        return incrementResult;
      }
      return 1;
    } catch {
      this.logger.error(`Incrementing key ${key} has failed`);
      return 1;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      this.logger.error(`Deleting cache with key ${key} has failed`);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch {
      this.logger.error(`Deleting cache with pattern ${pattern} has failed`);
    }
  }

  generateKey(...parts: (string | number | undefined | null)[]): string {
    return parts.filter((p) => p !== undefined && p !== null).join(':');
  }
}
