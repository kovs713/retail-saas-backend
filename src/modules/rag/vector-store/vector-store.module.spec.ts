import { ChromaDBClient } from '@/common/types';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorStoreModule } from './vector-store.module';
import { VectorStoreService } from './vector-store.service';

import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('VectorStoreModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        VectorStoreService,
        { provide: EmbeddingsService, useValue: createMock<EmbeddingsService>() },
        { provide: ChromaDBClient, useValue: createMock() },
      ],
      exports: [VectorStoreService],
    }).compile();
  });

  it('should compile and provide VectorStoreService', () => {
    const service = module.get<VectorStoreService>(VectorStoreService);
    expect(service).toBeDefined();
  });

  it('forRootAsync should return a dynamic module', () => {
    const dynamicModule = VectorStoreModule.forRootAsync();

    expect(dynamicModule.module).toBeDefined();
    expect(dynamicModule.providers).toBeDefined();
    expect(dynamicModule.exports).toContain(VectorStoreService);
  });
});
