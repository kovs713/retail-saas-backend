import { TenantContext } from '@/common/types';
import { WsAuthGuard } from '@/common/guards/ws-auth.guard';
import { Logger } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface ChatMessagePayload {
  sessionId?: string;
  message: string;
  maxResults?: number;
  systemPrompt?: string;
}

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

  handleConnection(client: Socket) {
    const tenant = client.data.tenantContext as TenantContext;
    this.logger.log(`Client connected: ${client.id} (shop: ${tenant?.shopId})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:message')
  handleMessage(@MessageBody() payload: ChatMessagePayload, @ConnectedSocket() client: Socket) {
    const tenant = client.data.tenantContext as TenantContext;
    this.logger.log(`Chat from ${client.id} [shop:${tenant.shopId}]: ${payload.message}`);

    return {
      event: 'chat:response',
      data: {
        sessionId: payload.sessionId || 'temp',
        answer: 'Not implemented yet',
        sources: [],
        timestamp: new Date().toISOString(),
      },
    };
  }
}
