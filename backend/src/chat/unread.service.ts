import { Injectable } from '@nestjs/common';

/**
 * 应用层"已读位置"缓存 —— DB 没有 cursor 表(v2.0 规划)。
 *
 * 数据结构:Map<userId, Map<convId, Date>>。
 * 进程重启清零,前端能接受。多实例部署时需要换 Redis。
 */
@Injectable()
export class UnreadService {
  private readonly lastView = new Map<string, Map<string, Date>>();

  /** 取某用户在某会话的最后已读时间;不存在返回 null */
  getLastView(userId: string, convId: string): Date | null {
    return this.lastView.get(userId)?.get(convId) ?? null;
  }

  /** 标记已读到现在 */
  markRead(userId: string, convId: string, at: Date = new Date()): void {
    if (!this.lastView.has(userId)) {
      this.lastView.set(userId, new Map());
    }
    this.lastView.get(userId)!.set(convId, at);
  }
}
