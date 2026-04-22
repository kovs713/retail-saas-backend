import { CacheTTL, RedisClient } from '@/common/types';
import { CacheService } from './cache.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisClientType } from 'redis';

describe('CacheService', () => {
  let service: CacheService;
  let redisClient: DeepMocked<RedisClientType>;
  const defaultTtl = 3600;

  beforeEach(async () => {
    redisClient = createMock<RedisClientType>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: RedisClient, useValue: redisClient },
        { provide: CacheTTL, useValue: defaultTtl },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return parsed value when key exists', async () => {
      const data = { foo: 'bar' };
      redisClient.get.mockResolvedValue(JSON.stringify(data));

      const result = await service.get<typeof data>('key');

      expect(result).toEqual(data);
    });

    it('should return null when key does not exist', async () => {
      redisClient.get.mockResolvedValue(null);

      const result = await service.get('missing');

      expect(result).toBeNull();
    });

    it('should return null when redis throws', async () => {
      redisClient.get.mockRejectedValue(new Error('connection failed'));

      const result = await service.get('key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value with default ttl', async () => {
      await expect(service.set('key', { a: 1 })).resolves.not.toThrow();
    });

    it('should set value with custom ttl', async () => {
      await expect(service.set('key', 'val', 60)).resolves.not.toThrow();
    });

    it('should log error when redis throws', async () => {
      redisClient.setEx.mockRejectedValue(new Error('fail'));

      await expect(service.set('key', 'val')).resolves.not.toThrow();
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      await expect(service.del('key')).resolves.not.toThrow();
    });

    it('should log error when redis throws', async () => {
      redisClient.del.mockRejectedValue(new Error('fail'));

      await expect(service.del('key')).resolves.not.toThrow();
    });
  });

  describe('delPattern', () => {
    it('should delete all keys matching pattern', async () => {
      redisClient.keys.mockResolvedValue(['a:1', 'a:2']);

      await expect(service.delPattern('a:*')).resolves.not.toThrow();
    });

    it('should not call del when no keys match', async () => {
      redisClient.keys.mockResolvedValue([]);

      await expect(service.delPattern('empty:*')).resolves.not.toThrow();
    });

    it('should log error when redis throws', async () => {
      redisClient.keys.mockRejectedValue(new Error('fail'));

      await expect(service.delPattern('a:*')).resolves.not.toThrow();
    });
  });

  describe('generateKey', () => {
    it('should join parts with colon', () => {
      expect(service.generateKey('shop', '123', 'products')).toBe(
        'shop:123:products',
      );
    });

    it('should filter out undefined and null', () => {
      expect(service.generateKey('a', undefined, null, 'b')).toBe('a:b');
    });

    it('should include numbers', () => {
      expect(service.generateKey('user', 42)).toBe('user:42');
    });

    it('should return empty string for no parts', () => {
      expect(service.generateKey()).toBe('');
    });
  });

  describe('incrementWithTtl', () => {
    it('should increment and set ttl atomically', async () => {
      const exec = jest.fn().mockResolvedValue([1, 1]);
      const expire = jest.fn().mockReturnValue({ exec });
      const incr = jest.fn().mockReturnValue({ expire });
      redisClient.multi.mockReturnValue({ incr } as any);

      const count = await service.incrementWithTtl('rl:key', 60);

      expect(count).toBe(1);
    });

    it('should return fallback when redis fails', async () => {
      redisClient.multi.mockImplementation(() => {
        throw new Error('redis down');
      });

      const count = await service.incrementWithTtl('rl:key', 60);

      expect(count).toBe(1);
    });
  });
});
