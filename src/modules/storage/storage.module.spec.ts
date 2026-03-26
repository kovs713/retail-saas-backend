import { MinioClient } from '@/common/types';
import { StorageController } from './storage.controller';
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
        { provide: MinioClient, useValue: createMock() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
      ],
      controllers: [StorageController],
      exports: [StorageService],
    }).compile();
  });

  it('should compile and provide StorageService', () => {
    const service = module.get<StorageService>(StorageService);
    expect(service).toBeDefined();
  });

  it('should compile and provide StorageController', () => {
    const controller = module.get<StorageController>(StorageController);
    expect(controller).toBeDefined();
  });
});
