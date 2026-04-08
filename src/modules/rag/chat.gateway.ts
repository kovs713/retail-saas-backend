import { TenantContext } from '@/common/types';
import { WsAuthGuard } from '@/common/guards/ws-auth.guard';
import { ChatSessionService } from './chat-session.service';
import { RagService } from './rag.service';
import { CacheService } from '@/core/cache/cache.service';
import { Logger } from '@nestjs/common';
import { Injectable, UseGuards } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface SocketWithData extends Socket {
  data: {
    user?: Record<string, unknown>;
    tenantContext?: TenantContext;
  };
}

export interface ChatMessagePayload {
  sessionId?: string;
  message: string;
  maxResults?: number;
  systemPrompt?: string;
}

export interface ChatChunkData {
  sessionId: string;
  chunk: string;
}

export interface ChatCompleteData {
  sessionId: string;
  answer: string;
  sources: Array<{ content: string; metadata?: Record<string, unknown> }>;
  timestamp: string;
}

const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 20; // messages per window

@Injectable()
@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
  },
})
@UseGuards(WsAuthGuard)
export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly sessionService: ChatSessionService,
    private readonly ragService: RagService,
    private readonly cacheService: CacheService,
  ) {}

  handleConnection(client: SocketWithData) {
    const tenant = client.data.tenantContext;
    this.logger.log(`Client connected: ${client.id} (shop: ${tenant?.shopId})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:message')
  async handleMessage(@MessageBody() payload: ChatMessagePayload, @ConnectedSocket() client: SocketWithData) {
    const tenant = client.data.tenantContext;
    if (!tenant) {
      client.emit('chat:error', { message: 'Missing tenant context', code: 'MISSING_TENANT' });
      return;
    }

    this.logger.log(`Chat from ${client.id} [shop:${tenant.shopId}]: ${payload.message}`);

    const rateLimitKey = `ratelimit:ws:${client.id}`;
    const count = await this.cacheService.incrementWithTtl(rateLimitKey, RATE_LIMIT_WINDOW);

    if (count > RATE_LIMIT_MAX) {
      client.emit('chat:error', {
        message: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
        retryAfter: RATE_LIMIT_WINDOW,
      });
      return;
    }

    try {
      const session = await this.sessionService.getOrCreateSession(payload.sessionId, tenant.shopId);
      await this.sessionService.addMessage(session.id, 'user', payload.message);

      let fullAnswer = '';
      const sources: Array<{ content: string; metadata?: Record<string, unknown> }> = [];

      for await (const event of this.ragService.queryStream(
        payload.message,
        tenant,
        payload.maxResults,
        payload.systemPrompt,
      )) {
        if (event.type === 'chunk') {
          fullAnswer += event.content;
          client.emit('chat:chunk', { sessionId: session.id, chunk: event.content } as ChatChunkData);
        } else if (event.type === 'complete') {
          sources.push(...event.sources.map((s) => ({ content: s.pageContent, metadata: s.metadata })));
        }
      }

      await this.sessionService.addMessage(session.id, 'assistant', fullAnswer);

      client.emit('chat:complete', {
        sessionId: session.id,
        answer: fullAnswer,
        sources,
        timestamp: new Date().toISOString(),
      } as ChatCompleteData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Chat error: ${error.message}`, error.stack);
      client.emit('chat:error', { message: 'Failed to process chat message', code: 'CHAT_ERROR' });
    }
  }
}
