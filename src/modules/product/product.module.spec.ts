import { mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CategoryRepository, ProductRepository } from './repositories';

import { createMock } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('ProductModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ProductService,
        ProductRepository,
        CategoryRepository,
        { provide: ProductRepository, useValue: createMock<ProductRepository>() },
        { provide: CategoryRepository, useValue: createMock<CategoryRepository>() },
        { provide: CacheService, useValue: mockCacheService() },
        { provide: JwtService, useValue: createMock<JwtService>() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
        Reflector,
      ],
      exports: [ProductService],
      controllers: [ProductController],
    }).compile();
  });

  it('should compile and provide ProductService', () => {
    const service = module.get<ProductService>(ProductService);
    expect(service).toBeDefined();
  });

  it('should compile and provide ProductRepository', () => {
    const repo = module.get<ProductRepository>(ProductRepository);
    expect(repo).toBeDefined();
  });

  it('should compile and provide CategoryRepository', () => {
    const repo = module.get<CategoryRepository>(CategoryRepository);
    expect(repo).toBeDefined();
  });

  it('should compile and provide ProductController', () => {
    const controller = module.get<ProductController>(ProductController);
    expect(controller).toBeDefined();
  });
});
