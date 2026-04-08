import { CacheService } from '@/core/cache/cache.service';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface ChatSession {
  id: string;
  shopId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  createdAt: string;
  updatedAt: string;
}

const SESSION_TTL = 1800; // 30 minutes

@Injectable()
export class ChatSessionService {
  constructor(private readonly cacheService: CacheService) {}

  async createSession(shopId: string): Promise<ChatSession> {
    const session: ChatSession = {
      id: randomUUID(),
      shopId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.saveSession(session);
    return session;
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    return this.cacheService.get<ChatSession>(this.getSessionKey(sessionId));
  }

  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<ChatSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    session.messages.push({ role, content, timestamp: new Date().toISOString() });
    session.updatedAt = new Date().toISOString();

    await this.saveSession(session);
    return session;
  }

  async getOrCreateSession(sessionId: string | undefined, shopId: string): Promise<ChatSession> {
    if (sessionId) {
      const existing = await this.getSession(sessionId);
      if (existing) return existing;
    }
    return this.createSession(shopId);
  }

  private async saveSession(session: ChatSession): Promise<void> {
    await this.cacheService.set(this.getSessionKey(session.id), session, SESSION_TTL);
  }

  private getSessionKey(sessionId: string): string {
    return `chat:session:${sessionId}`;
  }
}
