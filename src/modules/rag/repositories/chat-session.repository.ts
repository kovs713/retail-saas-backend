import { CacheService } from '@/core/cache/cache.service';
import { ChatSessionDto } from '../dto';

import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatSessionRepository {
  private readonly keyPrefix = 'chat:session:';

  constructor(private readonly cacheService: CacheService) {}

  async findById(sessionId: string): Promise<ChatSessionDto | null> {
    return this.cacheService.get<ChatSessionDto>(this.buildKey(sessionId));
  }

  async save(session: ChatSessionDto, ttl: number): Promise<void> {
    await this.cacheService.set(this.buildKey(session.id), session, ttl);
  }

  async delete(sessionId: string): Promise<void> {
    await this.cacheService.del(this.buildKey(sessionId));
  }

  private buildKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }
}
