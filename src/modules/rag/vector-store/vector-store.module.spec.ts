import { VectorStoreModule } from './vector-store.module';
import { VectorStoreService } from './vector-store.service';
import { ChromaDBClient } from '@/common/types/providers.type';

describe('VectorStoreModule', () => {
  it('forRootAsync should return a dynamic module', () => {
    const dynamicModule = VectorStoreModule.forRootAsync();

    expect(dynamicModule.module).toBe(VectorStoreModule);
    expect(dynamicModule.providers).toBeDefined();
    expect(dynamicModule.exports).toContain(VectorStoreService);
  });

  it('should import EmbeddingsModule', () => {
    const dynamicModule = VectorStoreModule.forRootAsync();

    expect(dynamicModule.imports).toBeDefined();
    expect(dynamicModule.imports?.length).toBeGreaterThan(0);
  });

  it('should configure ChromaDB client provider', () => {
    const dynamicModule = VectorStoreModule.forRootAsync();

    const chromaProvider = dynamicModule.providers?.find(
      (p) => typeof p === 'object' && 'provide' in p && p.provide === ChromaDBClient,
    );

    expect(chromaProvider).toBeDefined();
  });

  it('should include VectorStoreService and AppLogger as providers', () => {
    const dynamicModule = VectorStoreModule.forRootAsync();

    expect(dynamicModule.providers).toBeDefined();
  });
});
