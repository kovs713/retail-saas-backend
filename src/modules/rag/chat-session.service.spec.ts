import { CacheService } from '@/core/cache/cache.service';
import { LoggerService } from '@/core/logger/logger.service';
import { ChatSessionService } from './chat-session.service';
import { ChatSessionRepository } from './repositories';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

describe('ChatSessionService', () => {
  let service: ChatSessionService;
  let repository: DeepMocked<ChatSessionRepository>;

  const mockSession = {
    id: 'session-1',
    shopId: 'shop-1',
    messages: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatSessionService,
        {
          provide: ChatSessionRepository,
          useValue: createMock<ChatSessionRepository>(),
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
          },
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: CacheService,
          useValue: createMock<CacheService>(),
        },
      ],
    }).compile();

    service = module.get<ChatSessionService>(ChatSessionService);
    repository = module.get<DeepMocked<ChatSessionRepository>>(ChatSessionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      repository.save.mockResolvedValue(undefined);

      const result = await service.createSession('shop-1');

      expect(result.shopId).toBe('shop-1');
      expect(result.id).toBeDefined();
      expect(result.messages).toEqual([]);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should return session when found', async () => {
      repository.findById.mockResolvedValue(mockSession);

      const result = await service.getSession('session-1');

      expect(result).toEqual(mockSession);
      expect(repository.findById).toHaveBeenCalledWith('session-1');
    });

    it('should return null when session not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getSession('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('should add message to existing session', async () => {
      repository.findById.mockResolvedValueOnce(mockSession);
      repository.save.mockResolvedValue(undefined);

      const result = await service.addMessage('session-1', 'user', 'Hello');

      expect(result).toBeDefined();
      expect(result?.messages).toHaveLength(1);
      expect(result?.messages[0].content).toBe('Hello');
      expect(repository.save).toHaveBeenCalled();
    });

    it('should return null when session not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.addMessage('non-existent', 'user', 'Hello');

      expect(result).toBeNull();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('getOrCreateSession', () => {
    it('should return existing session when found', async () => {
      repository.findById.mockResolvedValue(mockSession);

      const result = await service.getOrCreateSession('session-1', 'shop-1');

      expect(result).toEqual(mockSession);
    });

    it('should create new session when id not provided', async () => {
      repository.save.mockResolvedValue(undefined);

      const result = await service.getOrCreateSession(undefined, 'shop-1');

      expect(result.shopId).toBe('shop-1');
      expect(result.id).toBeDefined();
    });

    it('should create new session when existing not found', async () => {
      repository.findById.mockResolvedValue(null);
      repository.save.mockResolvedValue(undefined);

      const result = await service.getOrCreateSession('non-existent', 'shop-1');

      expect(result.shopId).toBe('shop-1');
      expect(result.id).toBeDefined();
    });
  });
});
