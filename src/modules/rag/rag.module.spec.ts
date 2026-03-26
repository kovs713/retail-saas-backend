import { AuthGuard } from '@/common/guards';
import { mockGuard } from '@/common/utils';
import { LLMService } from './llm/llm.service';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { VectorStoreService } from './vector-store/vector-store.service';

import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('RagModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: LLMService, useValue: createMock<LLMService>() },
        { provide: VectorStoreService, useValue: createMock<VectorStoreService>() },
      ],
      controllers: [RagController],
      exports: [RagService],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockGuard())
      .compile();
  });

  it('should compile and provide RagService', () => {
    const service = module.get<RagService>(RagService);
    expect(service).toBeDefined();
  });

  it('should compile and provide RagController', () => {
    const controller = module.get<RagController>(RagController);
    expect(controller).toBeDefined();
  });
});
