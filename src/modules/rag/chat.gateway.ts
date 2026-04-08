import { TenantContext } from '@/common/types';
import { WsAuthGuard } from '@/common/guards/ws-auth.guard';
import { ChatSessionService } from './chat-session.service';
import { Logger } from '@nestjs/common';
import { Injectable, UseGuards } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface ChatMessagePayload {
  sessionId?: string;
  message: string;
  maxResults?: number;
  systemPrompt?: string;
}

export interface ChatResponseData {
  sessionId: string;
  answer: string;
  sources: Array<{ content: string; metadata?: Record<string, unknown> }>;
  timestamp: string;
}

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

  constructor(private readonly sessionService: ChatSessionService) {}

  handleConnection(client: Socket) {
    const tenant = client.data.tenantContext as TenantContext;
    this.logger.log(`Client connected: ${client.id} (shop: ${tenant?.shopId})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:message')
  async handleMessage(@MessageBody() payload: ChatMessagePayload, @ConnectedSocket() client: Socket) {
    const tenant = client.data.tenantContext as TenantContext;
    this.logger.log(`Chat from ${client.id} [shop:${tenant.shopId}]: ${payload.message}`);

    const session = await this.sessionService.getOrCreateSession(payload.sessionId, tenant.shopId);
    await this.sessionService.addMessage(session.id, 'user', payload.message);

    // TODO: Call RagService and emit streaming response
    const responseData: ChatResponseData = {
      sessionId: session.id,
      answer: 'Not implemented yet',
      sources: [],
      timestamp: new Date().toISOString(),
    };

    return { event: 'chat:response', data: responseData };
  }
}
