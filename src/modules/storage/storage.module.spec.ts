import { MinioClient, MinioConfig } from '@/common/types';
import { StorageService } from './storage.service';

import { createMock } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

describe('StorageModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: MinioConfig, useValue: createMock() },
        { provide: MinioClient, useValue: createMock() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
      ],
      exports: [StorageService],
    }).compile();
  });

  it('should compile and provide StorageService', () => {
    const service = module.get<StorageService>(StorageService);
    expect(service).toBeDefined();
  });
});
