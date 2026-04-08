import { RagChatConfig } from '@/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import { ChatSessionDto } from '../dto';
import { RagChatOptions } from '../rag.types';
import { ChatSessionRepository } from '../repositories';

import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class ChatSessionService {
  private readonly logger = new LoggerService(ChatSessionService.name);

  constructor(
    @Inject(RagChatConfig)
    private readonly ragChatConfig: RagChatOptions,
    private readonly repository: ChatSessionRepository,
  ) {}

  async createSession(shopId: string): Promise<ChatSessionDto> {
    const session: ChatSessionDto = {
      id: randomUUID(),
      shopId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.repository.save(session, this.ragChatConfig.ChatSessionTtl);
    this.logger.log(`Created chat session: ${session.id} for shop: ${shopId}`);
    return session;
  }

  async getSession(sessionId: string): Promise<ChatSessionDto | null> {
    return this.repository.findById(sessionId);
  }

  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<ChatSessionDto | null> {
    const session = await this.getSession(sessionId);
    if (!session) {
      this.logger.warn(`Session not found: ${sessionId}`);
      return null;
    }

    session.messages.push({ role, content, timestamp: new Date().toISOString() });
    session.updatedAt = new Date().toISOString();

    await this.repository.save(session, this.ragChatConfig.ChatSessionTtl);
    return session;
  }

  async getOrCreateSession(sessionId: string | undefined, shopId: string): Promise<ChatSessionDto> {
    if (sessionId) {
      const existing = await this.getSession(sessionId);
      if (existing) return existing;
    }
    return this.createSession(shopId);
  }
}
