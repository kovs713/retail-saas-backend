import { AuthGuard } from '@/common/guards';
import { createMockTenantContext, mockAuthGuard } from '@/common/utils';
import { ChatSessionService } from './chat-session.service';
import { ChatSessionController } from './chat-session.controller';

import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

describe('ChatSessionController', () => {
  let controller: ChatSessionController;
  let service: DeepMocked<ChatSessionService>;

  const tenantContext = createMockTenantContext();
  const user = {
    sub: 'user-1',
    email: 'test@example.com',
    shopId: tenantContext.shopId,
    role: 'owner',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ChatSessionService,
          useValue: createMock<ChatSessionService>(),
        },
      ],
      controllers: [ChatSessionController],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard(user))
      .compile();

    controller = module.get(ChatSessionController);
    service = module.get(ChatSessionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create session for current user', async () => {
    service.createSession.mockResolvedValue({ id: 'session-1' } as any);

    const result = await controller.createSession(tenantContext, user);

    expect(service.createSession).toHaveBeenCalledWith(
      tenantContext.shopId,
      user.sub,
    );
    expect(result.success).toBe(true);
  });

  it('should list current user sessions', async () => {
    service.listSessions.mockResolvedValue([
      {
        id: 'session-1',
        title: 'Need phones',
        status: 'active',
        lastMessageAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ] as any);

    const result = await controller.listSessions('active', tenantContext, user);

    expect(service.listSessions).toHaveBeenCalledWith(
      tenantContext.shopId,
      user.sub,
      'active',
    );
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it('should list current user session messages', async () => {
    service.listSessionMessages.mockResolvedValue([
      {
        id: 'message-1',
        role: 'user',
        content: 'Need phones',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    ]);

    const result = await controller.listSessionMessages(
      'session-1',
      tenantContext,
      user,
    );

    expect(service.listSessionMessages).toHaveBeenCalledWith(
      'session-1',
      tenantContext.shopId,
      user.sub,
    );
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it('should archive owned session', async () => {
    service.archiveSession.mockResolvedValue({
      id: 'session-1',
      status: 'archived',
    } as any);

    const result = await controller.archiveSession(
      'session-1',
      tenantContext,
      user,
    );

    expect(service.archiveSession).toHaveBeenCalledWith(
      'session-1',
      tenantContext.shopId,
      user.sub,
    );
    expect(result.success).toBe(true);
  });

  it('should hard delete owned session', async () => {
    service.deleteSession.mockResolvedValue(undefined);

    const result = await controller.deleteSession(
      'session-1',
      tenantContext,
      user,
    );

    expect(service.deleteSession).toHaveBeenCalledWith(
      'session-1',
      tenantContext.shopId,
      user.sub,
    );
    expect(result.success).toBe(true);
  });
});
