import { EmbeddingsService } from './embeddings.service';

import { ConfigService } from '@nestjs/config';
import { OllamaEmbeddings } from '@langchain/ollama';

describe('EmbeddingsService', () => {
  let service: EmbeddingsService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as unknown as ConfigService;

    service = new EmbeddingsService(configService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default model from env', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'EMBEDDINGS_MODEL') return 'custom-model';
        if (key === 'OLLAMA_BASE_URL') return 'http://custom-url:11435';
        return defaultValue;
      });

      const serviceWithCustomConfig = new EmbeddingsService(configService);

      expect(serviceWithCustomConfig.model).toBe('custom-model');
    });

    it('should use default model if env not set', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: string) => {
        return defaultValue;
      });

      const serviceWithDefaults = new EmbeddingsService(configService);

      expect(serviceWithDefaults.model).toBe('embeddinggemma');
    });

    it('should use default Ollama URL if env not set', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: string) => {
        return defaultValue;
      });

      const serviceWithDefaults = new EmbeddingsService(configService);

      const typedService = serviceWithDefaults as any;

      expect(typedService.baseUrl).toBe('http://localhost:11435');
    });

    it('should extend OllamaEmbeddings', () => {
      expect(service).toBeInstanceOf(OllamaEmbeddings);
    });
  });

  describe('configuration', () => {
    it('should read EMBEDDINGS_MODEL from config', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'EMBEDDINGS_MODEL') return 'test-model';
        return undefined;
      });

      const serviceWithModel = new EmbeddingsService(configService);

      expect(configService.get).toHaveBeenCalledWith('EMBEDDINGS_MODEL', 'embeddinggemma');
      expect(serviceWithModel.model).toBe('test-model');
    });

    it('should read OLLAMA_BASE_URL from config', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OLLAMA_BASE_URL') return 'http://test-url:11435';
        return undefined;
      });

      new EmbeddingsService(configService);

      expect(configService.get).toHaveBeenCalledWith('OLLAMA_BASE_URL', 'http://localhost:11435');
    });
  });
});
