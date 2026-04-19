import { LoggerService } from '@/core/logger/logger.service';
import { ChatSessionService } from './chat-session.service';
import { ChatMessageRepository, ChatSessionRepository } from './repositories';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('ChatSessionService', () => {
  let service: ChatSessionService;
  let sessionRepository: DeepMocked<ChatSessionRepository>;
  let messageRepository: DeepMocked<ChatMessageRepository>;

  const mockSession = {
    id: 'session-1',
    shopId: 'shop-1',
    userId: 'user-1',
    title: 'Need phones',
    status: 'active' as const,
    warmStatus: 'pending' as const,
    warmProductSummary: null,
    warmProductSnapshotAt: null,
    lastMessageAt: new Date('2024-01-01T00:00:00.000Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    deletedAt: null,
    messages: [],
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
          provide: ChatMessageRepository,
          useValue: createMock<ChatMessageRepository>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = module.get<ChatSessionService>(ChatSessionService);
    sessionRepository = module.get(ChatSessionRepository);
    messageRepository = module.get(ChatMessageRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create owned session with default metadata', async () => {
      sessionRepository.create.mockReturnValue(mockSession as any);
      sessionRepository.save.mockResolvedValue(mockSession as any);

      const result = await service.createSession('shop-1', 'user-1');

      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          shopId: 'shop-1',
          userId: 'user-1',
          title: 'New chat',
          status: 'active',
          warmStatus: 'pending',
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: 'session-1',
          shopId: 'shop-1',
          userId: 'user-1',
          title: 'Need phones',
          status: 'active',
          warmStatus: 'pending',
          warmProductSummary: null,
          warmProductSnapshotAt: null,
          messages: [],
          lastMessageAt: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        }),
      );
    });
  });

  describe('getOwnedSession', () => {
    it('should return owned session', async () => {
      sessionRepository.findOwnedById.mockResolvedValue(mockSession as any);

      const result = await service.getOwnedSession('session-1', 'shop-1', 'user-1');

      expect(sessionRepository.findOwnedById).toHaveBeenCalledWith('session-1', 'shop-1', 'user-1');
      expect(result).toEqual(
        expect.objectContaining({
          id: 'session-1',
          shopId: 'shop-1',
          userId: 'user-1',
          title: 'Need phones',
          status: 'active',
          warmStatus: 'pending',
          warmProductSummary: null,
          warmProductSnapshotAt: null,
          messages: [],
          lastMessageAt: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        }),
      );
    });

    it('should throw when session missing', async () => {
      sessionRepository.findOwnedById.mockResolvedValue(null);

      await expect(service.getOwnedSession('missing', 'shop-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listSessions', () => {
    it('should return metadata sorted by latest activity', async () => {
      sessionRepository.listOwnedByUser.mockResolvedValue([mockSession as any]);

      const result = await service.listSessions('shop-1', 'user-1');

      expect(sessionRepository.listOwnedByUser).toHaveBeenCalledWith('shop-1', 'user-1', 'active');
      expect(result[0]).toEqual({
        id: 'session-1',
        title: 'Need phones',
        status: 'active',
        warmStatus: 'pending',
        lastMessageAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });
  });

  describe('appendMessage', () => {
    it('should set title from first user message and update activity', async () => {
      const session = {
        ...mockSession,
        title: 'New chat',
        messages: [],
      };
      sessionRepository.findOwnedById.mockResolvedValue(session as any);
      messageRepository.create.mockReturnValue({
        sessionId: 'session-1',
        role: 'user',
        content: 'Need latest smartphones',
      } as any);
      messageRepository.save.mockResolvedValue({
        id: 'message-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'Need latest smartphones',
        createdAt: new Date('2024-01-01T00:00:05.000Z'),
      } as any);
      sessionRepository.save.mockResolvedValue({
        ...session,
        title: 'Need latest smartphones',
      } as any);

      const result = await service.appendMessage('session-1', 'shop-1', 'user-1', 'user', 'Need latest smartphones');

      expect(messageRepository.create).toHaveBeenCalledWith({
        sessionId: 'session-1',
        role: 'user',
        content: 'Need latest smartphones',
      });
      expect(sessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Need latest smartphones',
          lastMessageAt: expect.any(Date),
        }),
      );
      expect(result.title).toBe('Need latest smartphones');
    });
  });

  describe('archiveSession', () => {
    it('should archive owned session', async () => {
      sessionRepository.findOwnedById.mockResolvedValue(mockSession as any);
      sessionRepository.save.mockResolvedValue({ ...mockSession, status: 'archived' } as any);

      const result = await service.archiveSession('session-1', 'shop-1', 'user-1');

      expect(result.status).toBe('archived');
    });
  });

  describe('deleteSession', () => {
    it('should soft delete owned session', async () => {
      sessionRepository.findOwnedById.mockResolvedValue(mockSession as any);
      sessionRepository.softDeleteById.mockResolvedValue(undefined);

      await service.deleteSession('session-1', 'shop-1', 'user-1');

      expect(sessionRepository.softDeleteById).toHaveBeenCalledWith('session-1');
    });
  });
});
