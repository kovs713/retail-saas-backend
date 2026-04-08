import { LoggerService } from '@/core/logger/logger.service';
import { ChatSessionDto } from './dto';
import { ChatSessionRepository } from './repositories';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class ChatSessionService {
  private readonly logger = new LoggerService(ChatSessionService.name);
  private readonly sessionTtl: number;

  constructor(
    private readonly repository: ChatSessionRepository,
    private readonly configService: ConfigService,
  ) {
    this.sessionTtl = this.configService.get<number>('CHAT_SESSION_TTL', 1800);
  }

  async createSession(shopId: string): Promise<ChatSessionDto> {
    const session: ChatSessionDto = {
      id: randomUUID(),
      shopId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.repository.save(session, this.sessionTtl);
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

    await this.repository.save(session, this.sessionTtl);
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
