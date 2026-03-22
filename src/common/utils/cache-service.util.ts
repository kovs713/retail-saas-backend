import { CacheService } from '@/core/cache/cache.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';

export const mockCacheService = (): DeepMocked<CacheService> => {
  const mock = createMock<CacheService>();
  mock.get.mockResolvedValue(null);
  mock.set.mockResolvedValue(undefined);
  mock.del.mockResolvedValue(undefined);
  mock.delPattern.mockResolvedValue(undefined);
  mock.generateKey.mockImplementation((...parts) => parts.filter((p) => p !== undefined && p !== null).join(':'));
  return mock;
};
