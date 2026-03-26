import { mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { User } from './entities';
import { UserRepository } from './repositories';
import { UserService } from './user.service';

import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('UserModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        UserService,
        UserRepository,
        { provide: getRepositoryToken(User), useValue: createMock() },
        { provide: CacheService, useValue: mockCacheService() },
      ],
      exports: [UserService],
    }).compile();
  });

  it('should compile and provide UserService', () => {
    const service = module.get<UserService>(UserService);
    expect(service).toBeDefined();
  });

  it('should compile and provide UserRepository', () => {
    const repo = module.get<UserRepository>(UserRepository);
    expect(repo).toBeDefined();
  });
});
