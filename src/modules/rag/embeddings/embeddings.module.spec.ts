import { AppLogger } from '@/core/logger/app-logger.service';
import { EmbeddingsModule } from './embeddings.module';
import { EmbeddingsService } from './embeddings.service';

describe('EmbeddingsModule', () => {
  it('forRootAsync should return a dynamic module', () => {
    const dynamicModule = EmbeddingsModule.forRootAsync();

    expect(dynamicModule.module).toBe(EmbeddingsModule);
    expect(dynamicModule.providers).toBeDefined();
    expect(dynamicModule.exports).toContain(EmbeddingsService);
  });

  it('should include AppLogger and EmbeddingsService as providers', () => {
    const dynamicModule = EmbeddingsModule.forRootAsync();

    expect(dynamicModule.providers).toContain(AppLogger);
    expect(dynamicModule.providers).toContain(EmbeddingsService);
  });
});
