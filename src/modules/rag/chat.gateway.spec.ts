import { WsAuthGuard } from '@/common/guards/ws-auth.guard';
import { CacheService } from '@/core/cache/cache.service';
import { LoggerService } from '@/core/logger/logger.service';
import { ChatSessionService } from './chat-session.service';
import { ChatGateway } from './chat.gateway';
import { RagService } from './rag.service';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let sessionService: DeepMocked<ChatSessionService>;
  let ragService: DeepMocked<RagService>;
  let cacheService: DeepMocked<CacheService>;

  const mockTenantContext = { shopId: 'shop-1' };

  const mockSocket = {
    id: 'socket-1',
    data: {
      user: { sub: 'user-1', email: 'test@example.com' },
      tenantContext: mockTenantContext,
    },
    emit: jest.fn(),
  } as unknown as Socket & { emit: jest.Mock };

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
        ChatGateway,
        {
          provide: ChatSessionService,
          useValue: createMock<ChatSessionService>(),
        },
        {
          provide: RagService,
          useValue: createMock<RagService>(),
        },
        {
          provide: CacheService,
          useValue: createMock<CacheService>(),
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
      ],
    })
      .overrideGuard(WsAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    sessionService = module.get<DeepMocked<ChatSessionService>>(ChatSessionService);
    ragService = module.get<DeepMocked<RagService>>(RagService);
    cacheService = module.get<DeepMocked<CacheService>>(CacheService);

    gateway.server = createMock<Server>();
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should handle client connection without error', () => {
      const socketWithTenant = {
        ...mockSocket,
        data: { tenantContext: mockTenantContext },
      };

      expect(() =>
        gateway.handleConnection(socketWithTenant as Parameters<typeof gateway.handleConnection>[0]),
      ).not.toThrow();
    });
  });

  describe('handleDisconnect', () => {
    it('should handle client disconnection without error', () => {
      expect(() => gateway.handleDisconnect(mockSocket)).not.toThrow();
    });
  });

  describe('handleMessage', () => {
    it('should emit error when tenant context is missing', async () => {
      const socketWithoutTenant = {
        ...mockSocket,
        data: { tenantContext: undefined },
      };

      await gateway.handleMessage(
        { message: 'Hello' },
        socketWithoutTenant as Parameters<typeof gateway.handleMessage>[1],
      );

      expect(socketWithoutTenant.emit).toHaveBeenCalledWith('chat:error', {
        message: 'Missing tenant context',
        code: 'MISSING_TENANT',
      });
    });

    it('should emit error when rate limited', async () => {
      cacheService.incrementWithTtl.mockResolvedValue(21);

      await gateway.handleMessage({ message: 'Hello' }, mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:error', {
        message: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
        retryAfter: 60,
      });
    });

    it('should process message and emit chunks and complete', async () => {
      cacheService.incrementWithTtl.mockResolvedValue(1);
      sessionService.getOrCreateSession.mockResolvedValue(mockSession);
      sessionService.addMessage.mockResolvedValue(mockSession);

      const mockStream = (async function* () {
        await Promise.resolve();
        yield { type: 'chunk' as const, content: 'Hello ' };
        yield { type: 'chunk' as const, content: 'World' };
        yield {
          type: 'complete' as const,
          sources: [{ pageContent: 'Source content', metadata: { source: 'test' } }],
        };
      })();

      ragService.queryStream.mockReturnValue(mockStream);

      await gateway.handleMessage({ message: 'Hello' }, mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:chunk', {
        sessionId: 'session-1',
        chunk: 'Hello ',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:chunk', {
        sessionId: 'session-1',
        chunk: 'World',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:complete', {
        sessionId: 'session-1',
        answer: 'Hello World',
        sources: [{ content: 'Source content', metadata: { source: 'test' } }],
        timestamp: expect.any(String),
      });

      expect(sessionService.addMessage).toHaveBeenCalledTimes(2);
    });

    it('should emit error when queryStream throws', async () => {
      cacheService.incrementWithTtl.mockResolvedValue(1);
      sessionService.getOrCreateSession.mockResolvedValue(mockSession);
      ragService.queryStream.mockImplementation(async function* () {
        await Promise.resolve();
        yield { type: 'chunk' as const, content: '' };
        throw new Error('RAG error');
      });

      await gateway.handleMessage({ message: 'Hello' }, mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:error', {
        message: 'Failed to process chat message',
        code: 'CHAT_ERROR',
      });
    });

    it('should create new session when sessionId not provided', async () => {
      cacheService.incrementWithTtl.mockResolvedValue(1);
      sessionService.getOrCreateSession.mockResolvedValue(mockSession);
      sessionService.addMessage.mockResolvedValue(mockSession);
      ragService.queryStream.mockImplementation(async function* () {
        await Promise.resolve();
        yield { type: 'complete' as const, sources: [] };
      });

      await gateway.handleMessage({ message: 'Hello' }, mockSocket);

      expect(sessionService.getOrCreateSession).toHaveBeenCalledWith(undefined, 'shop-1');
    });

    it('should use existing session when sessionId provided', async () => {
      cacheService.incrementWithTtl.mockResolvedValue(1);
      sessionService.getOrCreateSession.mockResolvedValue(mockSession);
      sessionService.addMessage.mockResolvedValue(mockSession);
      ragService.queryStream.mockImplementation(async function* () {
        await Promise.resolve();
        yield { type: 'complete' as const, sources: [] };
      });

      await gateway.handleMessage({ sessionId: 'existing-session', message: 'Hello' }, mockSocket);

      expect(sessionService.getOrCreateSession).toHaveBeenCalledWith('existing-session', 'shop-1');
    });
  });
});
