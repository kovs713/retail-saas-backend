import { mockCacheService } from '@/common/utils';
import { CacheService } from '@/core/cache/cache.service';
import { ShopService } from '@/modules/shop/shop.service';
import { UserService } from '@/modules/user/user.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { createMock } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('AuthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: createMock<JwtService>() },
        { provide: UserService, useValue: createMock<UserService>() },
        { provide: ShopService, useValue: createMock<ShopService>() },
        { provide: CacheService, useValue: mockCacheService() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
      ],
      exports: [AuthService],
      controllers: [AuthController],
    }).compile();
  });

  it('should compile and provide AuthService', () => {
    const service = module.get<AuthService>(AuthService);
    expect(service).toBeDefined();
  });

  it('should compile and provide AuthController', () => {
    const controller = module.get<AuthController>(AuthController);
    expect(controller).toBeDefined();
  });
});
