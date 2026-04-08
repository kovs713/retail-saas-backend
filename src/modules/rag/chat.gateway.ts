import { LoggerService } from '@/core/logger/logger.service';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

// TODO: Add WebSocket JWT Auth Guard
// TODO: Add ChatSessionService
// TODO: Add RagService injection
// TODO: Implement chat:message handler

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:message')
  handleMessage(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
    this.logger.log(`Received chat message from ${client.id}`, JSON.stringify(data));
    // TODO: Implement chat logic
    return { event: 'chat:response', data: { answer: 'Not implemented yet' } };
  }
}
