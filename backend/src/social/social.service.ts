import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import { makeAvatar } from '../common/utils/avatar.util';
import {
  AuditFriendRequestDto,
  ListFriendRequestsQueryDto,
} from './dto/social.dto';

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  // ============== GET /social/friends ==============
  async listFriends(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      include: {
        user1: { select: { userId: true, username: true } },
        user2: { select: { userId: true, username: true } },
      },
      orderBy: { createTime: 'desc' },
    });

    return {
      list: rows.map((f) => {
        const other = f.userId1 === userId ? f.user2 : f.user1;
        const av = makeAvatar(other.username);
        return {
          userId: other.userId,
          username: other.username,
          avatarText: av.text,
          avatarColor: av.color,
          online: false, // Step 3.9 接入 WebSocket presence 后填真值
          lastSeen: '',
          since: f.createTime.toISOString(),
        };
      }),
    };
  }

  // ============== POST /social/friend-requests ==============
  async sendFriendRequest(userId: string, targetUserId: string) {
    // 0. 应用层 not-self 校验(DB CHECK 已移除)
    if (userId === targetUserId) {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '不能添加自己为好友');
    }

    // 1. target 存在
    const target = await this.prisma.user.findUnique({
      where: { userId: targetUserId },
      select: { userId: true },
    });
    if (!target) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '目标用户不存在');
    }

    // 2. 对方拉黑了我 → 40001
    const blockedByTarget = await this.prisma.blacklist.findFirst({
      where: { blockerId: targetUserId, blockedId: userId },
    });
    if (blockedByTarget) {
      throw new BusinessException(ERROR_CODES.BLOCKED_BY_TARGET);
    }

    // 3. 我拉黑了对方 → 应先解黑(给精确提示)
    const iBlockedTarget = await this.prisma.blacklist.findFirst({
      where: { blockerId: userId, blockedId: targetUserId },
    });
    if (iBlockedTarget) {
      throw new BusinessException(
        ERROR_CODES.FORBIDDEN,
        '你已拉黑对方,先解除黑名单',
      );
    }

    // 4. 已存在 pending / accepted → 40002
    const existing = await this.prisma.friendship.findFirst({
      where: {
        status: { in: ['pending', 'accepted'] },
        OR: [
          { userId1: userId, userId2: targetUserId },
          { userId1: targetUserId, userId2: userId },
        ],
      },
    });
    if (existing) {
      throw new BusinessException(ERROR_CODES.DUPLICATE_FRIEND_REQUEST);
    }

    // 5. 写入(若历史 rejected,DB UNIQUE 会顶 → 复用)
    try {
      const f = await this.prisma.friendship.create({
        data: { userId1: userId, userId2: targetUserId, status: 'pending' },
      });
      return { friendId: f.friendId, status: f.status };
    } catch (err) {
      // 历史曾被拒过,(user1,user2) 唯一冲突 → 把那条改回 pending
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const old = await this.prisma.friendship.findFirst({
          where: { userId1: userId, userId2: targetUserId },
        });
        if (old) {
          const updated = await this.prisma.friendship.update({
            where: { friendId: old.friendId },
            data: { status: 'pending', createTime: new Date() },
          });
          return { friendId: updated.friendId, status: updated.status };
        }
      }
      throw err;
    }
  }

  // ============== GET /social/friend-requests ==============
  async listFriendRequests(userId: string, query: ListFriendRequestsQueryDto) {
    const direction = query.direction ?? 'incoming';
    const where: Prisma.FriendshipWhereInput = {
      status: 'pending',
      ...(direction === 'incoming'
        ? { userId2: userId }
        : { userId1: userId }),
    };
    const rows = await this.prisma.friendship.findMany({
      where,
      include: {
        user1: { select: { userId: true, username: true } },
        user2: { select: { userId: true, username: true } },
      },
      orderBy: { createTime: 'desc' },
    });

    return {
      list: rows.map((f) => {
        const other = direction === 'incoming' ? f.user1 : f.user2;
        const av = makeAvatar(other.username);
        return {
          friendId: f.friendId,
          userId: other.userId,
          username: other.username,
          avatarText: av.text,
          avatarColor: av.color,
          createTime: f.createTime.toISOString(),
        };
      }),
    };
  }

  // ============== PATCH /social/friend-requests/:friendId ==============
  async auditFriendRequest(
    userId: string,
    friendId: number,
    dto: AuditFriendRequestDto,
  ) {
    const f = await this.prisma.friendship.findUnique({ where: { friendId } });
    if (!f) throw new BusinessException(ERROR_CODES.NOT_FOUND, '请求不存在');
    if (f.userId2 !== userId) {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '仅接收方可处理');
    }
    if (f.status !== 'pending') {
      throw new BusinessException(
        ERROR_CODES.DUPLICATE_FRIEND_REQUEST,
        '该请求已处理',
      );
    }
    const newStatus = dto.action === 'accept' ? 'accepted' : 'rejected';
    await this.prisma.friendship.update({
      where: { friendId },
      data: { status: newStatus },
    });
    return { friendId, status: newStatus };
  }

  // ============== DELETE /social/friends/:userId ==============
  async removeFriend(userId: string, targetUserId: string) {
    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId1: userId, userId2: targetUserId },
          { userId1: targetUserId, userId2: userId },
        ],
      },
    });
    return { ok: true };
  }

  // ============== GET /social/blocks ==============
  async listBlocks(userId: string) {
    const rows = await this.prisma.blacklist.findMany({
      where: { blockerId: userId },
      include: {
        blocked: { select: { userId: true, username: true } },
      },
      orderBy: { createTime: 'desc' },
    });
    return {
      list: rows.map((b) => {
        const av = makeAvatar(b.blocked.username);
        return {
          userId: b.blocked.userId,
          username: b.blocked.username,
          avatarText: av.text,
          avatarColor: av.color,
          since: b.createTime.toISOString(),
        };
      }),
    };
  }

  // ============== POST /social/blocks ==============
  async blockUser(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '不能拉黑自己');
    }
    const target = await this.prisma.user.findUnique({
      where: { userId: targetUserId },
      select: { userId: true },
    });
    if (!target) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '目标用户不存在');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. 删掉双方所有好友关系(任何状态)
      await tx.friendship.deleteMany({
        where: {
          OR: [
            { userId1: userId, userId2: targetUserId },
            { userId1: targetUserId, userId2: userId },
          ],
        },
      });

      // 2. UPSERT 黑名单(已存在则忽略)
      try {
        await tx.blacklist.create({
          data: { blockerId: userId, blockedId: targetUserId },
        });
      } catch (err) {
        if (
          !(
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          )
        ) {
          throw err;
        }
      }
      return { ok: true };
    });
  }

  // ============== DELETE /social/blocks/:userId ==============
  async unblockUser(userId: string, targetUserId: string) {
    await this.prisma.blacklist.deleteMany({
      where: { blockerId: userId, blockedId: targetUserId },
    });
    return { ok: true };
  }
}
