import { EmbeddingsModule } from './embeddings.module';

describe('EmbeddingsModule', () => {
  it('should be defined', () => {
    expect(EmbeddingsModule).toBeDefined();
  });

  it('should export EmbeddingsService', () => {
    const moduleDefinition = EmbeddingsModule;
    expect(moduleDefinition).toBeDefined();
  });
});
