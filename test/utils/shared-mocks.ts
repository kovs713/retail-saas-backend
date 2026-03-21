import { createMock } from '@golevelup/ts-jest';
import { Repository } from 'typeorm';

export const MockGenerators = {
  repository<T extends object>(): ReturnType<typeof createMock<Repository<T>>> {
    return createMock<Repository<T>>();
  },

  jwtService() {
    return {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'owner',
        shopId: 'shop-456',
      }),
    };
  },

  configService() {
    return {
      get: jest.fn((key: string): string | undefined => {
        const config: Record<string, string> = {
          GROQ_API_KEY: 'mock-api-key',
          S3_BUCKET: 'test-bucket',
          S3_REGION: 'us-east-1',
        };
        return config[key];
      }),
      getOrThrow: jest.fn((key: string): string => {
        const config: Record<string, string> = {
          GROQ_API_KEY: 'mock-api-key',
          S3_BUCKET: 'test-bucket',
          S3_REGION: 'us-east-1',
        };
        return config[key] || 'default';
      }),
    };
  },
};
