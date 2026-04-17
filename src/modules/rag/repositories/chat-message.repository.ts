import { ChatMessage } from '../entities/';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ChatMessageRepository extends Repository<ChatMessage> {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly repository: Repository<ChatMessage>,
  ) {
    super(ChatMessage, repository.manager);
  }

  async listBySessionId(sessionId: string): Promise<ChatMessage[]> {
    return this.repository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }
}
