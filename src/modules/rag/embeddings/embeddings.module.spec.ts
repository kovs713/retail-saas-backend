import { LoggerService } from '@/core/logger/logger.service';
import { EmbeddingsModule } from './embeddings.module';
import { EmbeddingsService } from './embeddings.service';

describe('EmbeddingsModule', () => {
  it('forRootAsync should return a dynamic module', () => {
    const module = EmbeddingsModule;

    expect(module).toBe(EmbeddingsModule);
    expect(module).toBeDefined();
    expect(module).toContain(EmbeddingsService);
  });

  it('should include LoggerService and EmbeddingsService as providers', () => {
    const module = EmbeddingsModule;

    expect(module).toContain(LoggerService);
    expect(module).toContain(EmbeddingsService);
  });
});
