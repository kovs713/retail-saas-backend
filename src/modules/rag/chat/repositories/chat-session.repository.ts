import { ChatSession } from '../entities';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

@Injectable()
export class ChatSessionRepository extends Repository<ChatSession> {
  constructor(
    @InjectRepository(ChatSession)
    private readonly repository: Repository<ChatSession>,
  ) {
    super(ChatSession, repository.manager);
  }

  async findOwnedById(
    sessionId: string,
    shopId: string,
    userId: string,
  ): Promise<ChatSession | null> {
    return this.repository.findOne({
      where: {
        id: sessionId,
        shopId,
        userId,
      },
      order: {
        messages: {
          createdAt: 'ASC',
        },
      },
      relations: ['messages'],
    });
  }

  async listOwnedByUser(
    shopId: string,
    userId: string,
    status: 'active' | 'archived' = 'active',
  ): Promise<ChatSession[]> {
    return this.repository.find({
      where: {
        shopId,
        userId,
        status,
      },
      order: {
        lastMessageAt: 'DESC',
      },
    });
  }

  async softDeleteById(sessionId: string): Promise<void> {
    await this.repository.softDelete(sessionId);
  }

  async countByPeriod(from: Date, to: Date): Promise<number> {
    return this.repository.count({
      where: {
        createdAt: Between(from, to),
      },
    });
  }

  async findRecent(limit: number = 10): Promise<ChatSession[]> {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.repository.find({
      where: { createdAt: Between(from, now) },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
