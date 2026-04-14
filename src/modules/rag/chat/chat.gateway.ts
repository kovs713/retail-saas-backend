import { WsAuthGuard } from '@/common/guards/ws-auth.guard';
import { WsValidationPipe } from '@/common/pipes/ws-validation.pipe';
import { JwtConfig, JwtOptions, RagChatConfig, TenantContext, TokenPayload } from '@/common/types';
import { CacheService } from '@/core/cache/cache.service';
import { LoggerService } from '@/core/logger/logger.service';
import { ChatChunkEventDto, ChatCompleteEventDto, ChatErrorEventDto, ChatMessageDto } from '../dto';
import { RagService } from '../rag.service';
import { RagChatOptions } from '../rag.types';
import { ChatSessionService } from './chat-session.service';

import { Inject, Injectable, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface SocketWithData extends Socket {
  data: {
    user?: TokenPayload;
    tenantContext?: TenantContext;
  };
}

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
  },
})
@UseGuards(WsAuthGuard)
@Injectable()
export class ChatGateway {
  private readonly logger = new LoggerService(ChatGateway.name);

  constructor(
    @Inject(RagChatConfig)
    private readonly ragChatConfig: RagChatOptions,
    private readonly sessionService: ChatSessionService,
    private readonly ragService: RagService,
    private readonly cacheService: CacheService,
    private readonly jwtService: JwtService,
    @Inject(JwtConfig) private readonly jwtConfig: JwtOptions,
  ) {}

  async handleConnection(client: SocketWithData) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client connected without token: ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.jwtConfig.secret,
      });

      if (!payload.shopId) {
        this.logger.warn(`Client connected without shopId: ${client.id}`);
        client.disconnect();
        return;
      }

      client.data.user = payload;
      client.data.tenantContext = { shopId: payload.shopId } as TenantContext;
      this.logger.log(`Client connected: ${client.id} (shop: ${payload.shopId})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Invalid token for client ${client.id}: ${errorMessage}`);
      client.disconnect();
    }
  }

  private extractToken(client: Socket): string | null {
    const handshakeAuth = client.handshake.auth?.token as string | undefined;
    const headerAuth = client.handshake.headers?.authorization;
    const auth = handshakeAuth || headerAuth;
    if (!auth) return null;

    if (typeof auth === 'string') {
      const [type, token] = auth.split(' ');
      return type === 'Bearer' ? token : auth;
    }

    return null;
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:message')
  async handleMessage(
    @MessageBody(new WsValidationPipe(ChatMessageDto)) payload: ChatMessageDto,
    @ConnectedSocket() client: SocketWithData,
  ) {
    const tenant = client.data.tenantContext;
    if (!tenant) {
      client.emit('chat:error', { message: 'Missing tenant context', code: 'MISSING_TENANT' } as ChatErrorEventDto);
      return;
    }

    this.logger.log(`Chat from ${client.id} [shop:${tenant.shopId}]: ${payload.message}`);

    const rateLimitKey = `ratelimit:ws:${client.id}`;
    const count = await this.cacheService.incrementWithTtl(rateLimitKey, this.ragChatConfig.WsRateLimitWindow);

    if (count > this.ragChatConfig.WsRateLimitMax) {
      client.emit('chat:error', {
        message: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
        retryAfter: this.ragChatConfig.WsRateLimitWindow,
      } as ChatErrorEventDto);
      return;
    }

    try {
      const session = await this.sessionService.getOrCreateSession(payload.sessionId, tenant.shopId);
      await this.sessionService.addMessage(session.id, 'user', payload.message);

      let fullAnswer = '';
      const sources: Array<{ content: string; metadata?: Record<string, unknown> }> = [];

      for await (const event of this.ragService.queryStream(
        payload.message,
        tenant.shopId,
        payload.maxResults,
        payload.systemPrompt,
      )) {
        if (event.type === 'chunk') {
          fullAnswer += event.content;
          client.emit('chat:chunk', { sessionId: session.id, chunk: event.content } as ChatChunkEventDto);
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
      } as ChatCompleteEventDto);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Chat error: ${error.message}`, error.stack);
      client.emit('chat:error', { message: 'Failed to process chat message', code: 'CHAT_ERROR' } as ChatErrorEventDto);
    }
  }
}
