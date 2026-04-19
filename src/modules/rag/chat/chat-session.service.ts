import { LoggerService } from '@/core/logger/logger.service';
import { ChatSessionDto, ChatSessionMetadataDto } from '../dto';
import { ChatMessage, ChatSession } from './entities';
import { ChatMessageRepository, ChatSessionRepository } from './repositories';

import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ChatSessionService {
  private readonly logger = new LoggerService(ChatSessionService.name);

  constructor(
    private readonly sessionRepository: ChatSessionRepository,
    private readonly messageRepository: ChatMessageRepository,
  ) {}

  private toDto(session: ChatSession): ChatSessionDto {
    return {
      id: session.id,
      shopId: session.shopId,
      userId: session.userId,
      title: session.title,
      status: session.status,
      warmStatus: session.warmStatus,
      warmProductSnapshotAt: session.warmProductSnapshotAt?.toISOString() ?? null,
      warmProductSummary: session.warmProductSummary,
      messages: (session.messages ?? []).map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.createdAt.toISOString(),
      })),
      lastMessageAt: session.lastMessageAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private toMetadataDto(session: ChatSession): ChatSessionMetadataDto {
    return {
      id: session.id,
      title: session.title,
      status: session.status,
      warmStatus: session.warmStatus,
      lastMessageAt: session.lastMessageAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private buildSessionTitle(content: string): string {
    const normalized = content.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      return 'New chat';
    }

    return normalized.slice(0, 80);
  }

  async createSession(shopId: string, userId: string): Promise<ChatSessionDto> {
    const now = new Date();
    const session = this.sessionRepository.create({
      shopId,
      userId,
      title: 'New chat',
      status: 'active',
      warmStatus: 'pending',
      warmProductSummary: null,
      warmProductSnapshotAt: null,
      lastMessageAt: now,
    });

    const savedSession = await this.sessionRepository.save(session);
    savedSession.messages = [];
    this.logger.log(`Created chat session: ${session.id} for shop: ${shopId}`);
    return this.toDto(savedSession);
  }

  async getOwnedSession(sessionId: string, shopId: string, userId: string): Promise<ChatSessionDto> {
    const session = await this.sessionRepository.findOwnedById(sessionId, shopId, userId);
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return this.toDto(session);
  }

  async listSessions(
    shopId: string,
    userId: string,
    status: 'active' | 'archived' = 'active',
  ): Promise<ChatSessionMetadataDto[]> {
    const sessions = await this.sessionRepository.listOwnedByUser(shopId, userId, status);
    return sessions.map((session) => this.toMetadataDto(session));
  }

  async appendMessage(
    sessionId: string,
    shopId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<ChatSessionDto> {
    const session = await this.sessionRepository.findOwnedById(sessionId, shopId, userId);
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const message = this.messageRepository.create({
      sessionId,
      role,
      content,
    });
    const savedMessage = await this.messageRepository.save(message);

    if (role === 'user' && session.title === 'New chat' && (session.messages?.length ?? 0) === 0) {
      session.title = this.buildSessionTitle(content);
    }

    session.lastMessageAt = savedMessage.createdAt ?? new Date();
    session.messages = [...(session.messages ?? []), savedMessage as ChatMessage];

    const savedSession = await this.sessionRepository.save(session);
    return this.toDto({ ...savedSession, messages: session.messages });
  }

  async archiveSession(sessionId: string, shopId: string, userId: string): Promise<ChatSessionDto> {
    const session = await this.sessionRepository.findOwnedById(sessionId, shopId, userId);
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    session.status = 'archived';
    const savedSession = await this.sessionRepository.save(session);
    return this.toDto(savedSession);
  }

  async deleteSession(sessionId: string, shopId: string, userId: string): Promise<void> {
    await this.getOwnedSession(sessionId, shopId, userId);
    await this.sessionRepository.softDeleteById(sessionId);
  }

  async getOrCreateSession(sessionId: string | undefined, shopId: string, userId: string): Promise<ChatSessionDto> {
    if (sessionId) {
      const existing = await this.sessionRepository.findOwnedById(sessionId, shopId, userId);
      if (existing) {
        return this.toDto(existing);
      }
    }

    return this.createSession(shopId, userId);
  }
}
