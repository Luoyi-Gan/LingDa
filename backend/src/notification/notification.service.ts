import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, unreadOnly = false, limit = 30) {
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;
    const rows = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return {
      list: rows.map((r) => ({
        id: r.id.toString(),
        type: r.type,
        payload: r.payload,
        isRead: r.isRead,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async markRead(id: bigint, userId: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== userId) return { ok: false };
    if (!n.isRead) {
      await this.prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
    }
    return { ok: true };
  }

  async markAllRead(userId: string) {
    const r = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: r.count };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  /** 后端内部用：批量插入 —— 给一组 userId 各发同样的通知 */
  async pushBatch(
    userIds: string[],
    type: string,
    payload: Record<string, any>,
  ) {
    if (!userIds.length) return { created: 0 };
    const r = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, type, payload })),
    });
    return { created: r.count };
  }
}
