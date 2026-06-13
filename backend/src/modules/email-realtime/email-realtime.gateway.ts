import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: 'email',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class EmailRealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EmailRealtimeGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`Email socket connected: ${client.id}`);
  }

  @SubscribeMessage('email.join')
  joinUserRoom(@ConnectedSocket() client: Socket, @MessageBody() body: { userId?: string }) {
    if (!body?.userId) return { ok: false };
    client.join(this.userRoom(body.userId));
    return { ok: true };
  }

  emitMessageReceived(userId: string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit('email.message.received', payload);
  }

  emitThreadUpdated(userId: string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit('email.thread.updated', payload);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}
