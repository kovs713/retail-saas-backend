import { TypeOrmConfigService } from './typeorm-config.service';

import { ConfigService } from '@nestjs/config';

describe('TypeOrmConfigService', () => {
  let service: TypeOrmConfigService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn(),
      get: jest.fn(),
    } as unknown as ConfigService;

    service = new TypeOrmConfigService(configService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTypeOrmOptions', () => {
    it('should load TypeORM config from environment', () => {
      jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
        const config: Record<string, any> = {
          DB_HOST: 'localhost',
          DB_PORT: 5432,
          DB_USERNAME: 'testuser',
          DB_PASSWORD: 'testpass',
          DB_DATABASE: 'testdb',
          NODE_ENV: 'production',
        };
        return config[key];
      });

      const result = service.createTypeOrmOptions();

      expect(result.type).toBe('postgres');

      const typedResult = result as any;

      expect(typedResult.host).toBe('localhost');

      expect(typedResult.port).toBe(5432);

      expect(typedResult.username).toBe('testuser');

      expect(typedResult.password).toBe('testpass');

      expect(typedResult.database).toBe('testdb');
    });

    it('should use default values when env not set', () => {
      jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
        throw new Error(`Environment variable ${key} not found`);
      });

      expect(() => service.createTypeOrmOptions()).toThrow();
    });

    it('should enable entities synchronization in dev', () => {
      jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
        const config: Record<string, any> = {
          DB_HOST: 'localhost',
          DB_PORT: 5432,
          DB_USERNAME: 'user',
          DB_PASSWORD: 'pass',
          DB_DATABASE: 'db',
          NODE_ENV: 'DEV',
        };
        return config[key];
      });

      const result = service.createTypeOrmOptions();

      expect(result.synchronize).toBe(true);
    });

    it('should disable synchronization in production', () => {
      jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
        const config: Record<string, any> = {
          DB_HOST: 'localhost',
          DB_PORT: 5432,
          DB_USERNAME: 'user',
          DB_PASSWORD: 'pass',
          DB_DATABASE: 'db',
          NODE_ENV: 'production',
        };
        return config[key];
      });

      const result = service.createTypeOrmOptions();

      expect(result.synchronize).toBe(false);
    });

    it('should enable logging in DEV mode', () => {
      jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
        const config: Record<string, any> = {
          DB_HOST: 'localhost',
          DB_PORT: 5432,
          DB_USERNAME: 'user',
          DB_PASSWORD: 'pass',
          DB_DATABASE: 'db',
          NODE_ENV: 'DEV',
        };
        return config[key];
      });

      const result = service.createTypeOrmOptions();

      expect(result.logging).toBe(true);
    });

    it('should disable logging in production', () => {
      jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
        const config: Record<string, any> = {
          DB_HOST: 'localhost',
          DB_PORT: 5432,
          DB_USERNAME: 'user',
          DB_PASSWORD: 'pass',
          DB_DATABASE: 'db',
          NODE_ENV: 'production',
        };
        return config[key];
      });

      const result = service.createTypeOrmOptions();

      expect(result.logging).toBe(false);
    });

    it('should configure entities from modules', () => {
      jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
        const config: Record<string, any> = {
          DB_HOST: 'localhost',
          DB_PORT: 5432,
          DB_USERNAME: 'user',
          DB_PASSWORD: 'pass',
          DB_DATABASE: 'db',
          NODE_ENV: 'production',
        };
        return config[key];
      });

      const result = service.createTypeOrmOptions();

      expect(result.autoLoadEntities).toBe(true);
    });

    it('should set extra options for search_path', () => {
      jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
        const config: Record<string, any> = {
          DB_HOST: 'localhost',
          DB_PORT: 5432,
          DB_USERNAME: 'user',
          DB_PASSWORD: 'pass',
          DB_DATABASE: 'db',
          NODE_ENV: 'production',
        };
        return config[key];
      });

      const result = service.createTypeOrmOptions();

      expect(result.extra).toEqual({
        options: '-c search_path=public',
      });
    });
  });
});
