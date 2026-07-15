import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';
import { PresenceService } from './presence.service';
import { decodeConvId } from './conv.util';
import { SendMessageDto } from './dto/send-message.dto';

interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

/**
 * Chat WebSocket Gateway @ /ws/chat
 *
 * 连接:ws://host/ws/chat?token=<jwt>
 *
 * Server → Client:
 *   - message:new          { 完整 message 对象 }
 *   - presence:update      { userId, online }
 *   - conversation:update  { convId, ... }(MVP 阶段未发,前端可在 message:new 后自己刷会话列表)
 *
 * Client → Server:
 *   - message:send         等价于 POST /chat/messages
 *   - conversation:enter   自动标记已读
 *   - conversation:leave   (空操作占位)
 *   - presence:ping        心跳
 */
@WebSocketGateway({
  namespace: '/ws/chat',
  cors: {
    origin: (origin, callback) => {
      const configured = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const development = process.env.NODE_ENV !== 'production';
      const developmentOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
      ];
      const allowed = configured.length ? configured : developmentOrigins;
      callback(null, !origin || (development && developmentOrigins.includes(origin)) || allowed.includes(origin));
    },
    credentials: false,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly chatService: ChatService,
    private readonly presence: PresenceService,
    private readonly prisma: PrismaService,
  ) {}

  // ============== 连接生命周期 ==============
  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(`reject ${client.id}: no token`);
      client.disconnect();
      return;
    }
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token);
    } catch (err: any) {
      this.logger.warn(`reject ${client.id}: invalid token (${err?.message})`);
      client.disconnect();
      return;
    }
    const userId = payload.sub;
    client.data.userId = userId;
    const { wasOffline } = this.presence.add(userId, client);
    this.logger.log(`socket connected (${client.id})`);
    if (wasOffline) {
      await this.notifyPresenceToFriends(userId, true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId: string | undefined = client.data?.userId;
    if (!userId) return;
    const { nowOffline } = this.presence.remove(userId, client);
    this.logger.log(`socket disconnected (${client.id})`);
    if (nowOffline) {
      await this.notifyPresenceToFriends(userId, false);
    }
  }

  // ============== Client → Server ==============
  @SubscribeMessage('message:send')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async onMessageSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ) {
    const userId: string | undefined = client.data?.userId;
    if (!userId) return { ok: false, msg: 'unauthorized' };
    try {
      const { message, recipientUserIds } = await this.chatService.sendMessage(
        userId,
        payload,
      );
      this.broadcastNewMessage(message, recipientUserIds);
      return { ok: true, message };
    } catch (err: any) {
      return { ok: false, code: err?.code, msg: err?.message };
    }
  }

  @SubscribeMessage('conversation:enter')
  async onConvEnter(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { convId: string },
  ) {
    const userId: string | undefined = client.data?.userId;
    if (!userId || !payload?.convId) return { ok: false };
    try {
      decodeConvId(payload.convId); // 校验合法
      await this.chatService.markRead(userId, payload.convId);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, code: err?.code, msg: err?.message };
    }
  }

  @SubscribeMessage('conversation:leave')
  async onConvLeave() {
    return { ok: true };
  }

  @SubscribeMessage('presence:ping')
  async onPing() {
    return { pong: Date.now() };
  }

  // ============== Server → Client(供 REST controller / 内部调用)==============
  broadcastNewMessage(message: any, recipientUserIds: string[]): void {
    const seen = new Set<string>();
    for (const uid of recipientUserIds) {
      if (seen.has(uid)) continue;
      seen.add(uid);
      for (const s of this.presence.getSockets(uid)) {
        s.emit('message:new', message);
      }
    }
  }

  // ============== 私有辅助 ==============
  private extractToken(client: Socket): string | null {
    const fromAuth = (client.handshake.auth?.token as string) || '';
    if (fromAuth) return fromAuth;
    // 也支持 Authorization 头
    const authHeader = (client.handshake.headers?.authorization || '') as string;
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    // 查询参数会进入访问日志，仅开发环境兼容旧客户端。
    if (process.env.NODE_ENV !== 'production') {
      return (client.handshake.query?.token as string) || null;
    }
    return null;
  }

  private async notifyPresenceToFriends(userId: string, online: boolean) {
    const friends = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      select: { userId1: true, userId2: true },
    });
    const friendIds = friends.map((f) =>
      f.userId1 === userId ? f.userId2 : f.userId1,
    );
    const seen = new Set<string>();
    for (const fid of friendIds) {
      if (seen.has(fid)) continue;
      seen.add(fid);
      for (const s of this.presence.getSockets(fid)) {
        s.emit('presence:update', { userId, online });
      }
    }
  }
}
