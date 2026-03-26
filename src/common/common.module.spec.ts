import { AuthGuard, RolesGuard } from './guards';

import { createMock } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('CommonModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1d' } })],
      providers: [AuthGuard, RolesGuard, { provide: ConfigService, useValue: createMock<ConfigService>() }, Reflector],
      exports: [AuthGuard, RolesGuard, JwtModule],
    }).compile();
  });

  it('should compile and provide AuthGuard', () => {
    const guard = module.get<AuthGuard>(AuthGuard);
    expect(guard).toBeDefined();
  });

  it('should compile and provide RolesGuard', () => {
    const guard = module.get<RolesGuard>(RolesGuard);
    expect(guard).toBeDefined();
  });

  it('should export JwtService', () => {
    const jwtService = module.get<JwtService>(JwtService);
    expect(jwtService).toBeDefined();
  });
});
