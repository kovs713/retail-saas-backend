import { EmbeddingsService } from './embeddings.service';

import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('EmbeddingsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [{ provide: EmbeddingsService, useValue: createMock<EmbeddingsService>() }],
      exports: [EmbeddingsService],
    }).compile();
  });

  it('should compile and provide EmbeddingsService', () => {
    const service = module.get<EmbeddingsService>(EmbeddingsService);
    expect(service).toBeDefined();
  });
});
