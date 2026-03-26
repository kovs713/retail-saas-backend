import { LoggerService } from './logger.service';

import { Test, TestingModule } from '@nestjs/testing';

describe('LoggerModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [LoggerService],
      exports: [LoggerService],
    }).compile();
  });

  it('should compile and provide LoggerService', () => {
    const service = module.get<LoggerService>(LoggerService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(LoggerService);
  });
});
