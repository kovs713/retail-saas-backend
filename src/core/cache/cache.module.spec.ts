import { CacheTTL, RedisClient } from '@/common/types';
import { CacheService } from './cache.service';

import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('CacheModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: RedisClient, useValue: createMock() },
        { provide: CacheTTL, useValue: 3600 },
      ],
      exports: [CacheService],
    }).compile();
  });

  it('should compile and provide CacheService', () => {
    const service = module.get(CacheService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(CacheService);
  });
});
