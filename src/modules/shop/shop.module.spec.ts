import { mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { Shop } from './entities';
import { ShopRepository } from './repository';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

import { createMock } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('ShopModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ShopService,
        ShopRepository,
        { provide: getRepositoryToken(Shop), useValue: createMock() },
        { provide: CacheService, useValue: mockCacheService() },
        { provide: JwtService, useValue: createMock<JwtService>() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
        Reflector,
      ],
      controllers: [ShopController],
      exports: [ShopService],
    }).compile();
  });

  it('should compile and provide ShopService', () => {
    const service = module.get<ShopService>(ShopService);
    expect(service).toBeDefined();
  });

  it('should compile and provide ShopRepository', () => {
    const repo = module.get<ShopRepository>(ShopRepository);
    expect(repo).toBeDefined();
  });

  it('should compile and provide ShopController', () => {
    const controller = module.get<ShopController>(ShopController);
    expect(controller).toBeDefined();
  });
});
