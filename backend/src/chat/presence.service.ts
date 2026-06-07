import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

/**
 * 在线状态登记中心 —— 内存版,单进程有效。
 * 多实例部署需要换 Redis pub/sub(v2.0)。
 */
@Injectable()
export class PresenceService {
  /** userId → 同一用户的多个连接(多设备 / 多 tab) */
  private readonly userSockets = new Map<string, Set<Socket>>();

  add(userId: string, socket: Socket): { wasOffline: boolean } {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
      this.userSockets.get(userId)!.add(socket);
      return { wasOffline: true };
    }
    this.userSockets.get(userId)!.add(socket);
    return { wasOffline: false };
  }

  remove(userId: string, socket: Socket): { nowOffline: boolean } {
    const set = this.userSockets.get(userId);
    if (!set) return { nowOffline: false };
    set.delete(socket);
    if (set.size === 0) {
      this.userSockets.delete(userId);
      return { nowOffline: true };
    }
    return { nowOffline: false };
  }

  isOnline(userId: string): boolean {
    return (this.userSockets.get(userId)?.size ?? 0) > 0;
  }

  /** 返回某用户的所有活动 socket(可能空数组) */
  getSockets(userId: string): Socket[] {
    return Array.from(this.userSockets.get(userId) ?? []);
  }

  /** 当前所有在线用户 ID(用于会话列表的 online 字段) */
  getOnlineUserIds(): Set<string> {
    return new Set(this.userSockets.keys());
  }
}
