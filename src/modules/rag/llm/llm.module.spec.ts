import { ChatGroqClient } from '@/common/types';
import { LLMModule } from './llm.module';
import { LLMService } from './llm.service';

import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('LLMModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [LLMService, { provide: ChatGroqClient, useValue: createMock() }],
      exports: [LLMService],
    }).compile();
  });

  it('should compile and provide LLMService', () => {
    const service = module.get<LLMService>(LLMService);
    expect(service).toBeDefined();
  });

  it('forRootAsync should return a dynamic module', () => {
    const dynamicModule = LLMModule.forRootAsync();

    expect(dynamicModule.module).toBeDefined();
    expect(dynamicModule.providers).toBeDefined();
    expect(dynamicModule.exports).toContain(LLMService);
  });
});
