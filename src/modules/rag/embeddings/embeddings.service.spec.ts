import { EmbeddingsService } from './embeddings.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { OllamaEmbeddings } from '@langchain/ollama';
import { ConfigService } from '@nestjs/config';

describe('EmbeddingsService', () => {
  let service: EmbeddingsService;
  let configService: DeepMocked<ConfigService>;

  beforeEach(() => {
    configService = createMock<ConfigService>();
    configService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'EMBEDDINGS_MODEL') return 'embeddinggemma';
      if (key === 'OLLAMA_BASE_URL') return 'http://localhost:11435';
      throw new Error(`Missing config: ${key}`);
    });

    service = new EmbeddingsService(configService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with custom model from env', () => {
      configService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'EMBEDDINGS_MODEL') return 'custom-model';
        if (key === 'OLLAMA_BASE_URL') return 'http://custom-url:11435';
        throw new Error(`Missing config: ${key}`);
      });

      const serviceWithCustomConfig = new EmbeddingsService(configService);

      expect(serviceWithCustomConfig.model).toBe('custom-model');
    });

    it('should use default model from config', () => {
      expect(service.model).toBe('embeddinggemma');
    });

    it('should use default Ollama URL from config', () => {
      const typedService = service as any;

      expect(typedService.baseUrl).toBe('http://localhost:11435');
    });

    it('should extend OllamaEmbeddings', () => {
      expect(service).toBeInstanceOf(OllamaEmbeddings);
    });
  });

  describe('configuration', () => {
    it('should read EMBEDDINGS_MODEL from config', () => {
      configService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'EMBEDDINGS_MODEL') return 'test-model';
        if (key === 'OLLAMA_BASE_URL') return 'http://localhost:11435';
        throw new Error(`Missing config: ${key}`);
      });

      const serviceWithModel = new EmbeddingsService(configService);

      expect(configService.getOrThrow).toHaveBeenCalledWith('EMBEDDINGS_MODEL');
      expect(serviceWithModel.model).toBe('test-model');
    });

    it('should read OLLAMA_BASE_URL from config', () => {
      configService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'EMBEDDINGS_MODEL') return 'embeddinggemma';
        if (key === 'OLLAMA_BASE_URL') return 'http://test-url:11435';
        throw new Error(`Missing config: ${key}`);
      });

      new EmbeddingsService(configService);

      expect(configService.getOrThrow).toHaveBeenCalledWith('OLLAMA_BASE_URL');
    });
  });
});
