import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import { makeAvatar } from '../common/utils/avatar.util';
import { fromNow } from '../common/utils/time.util';
import {
  DecodedConv,
  decodeConvId,
  encodeGroupConvId,
  encodePrivateConvId,
  encodeSocialGroupConvId,
  groupConvEmoji,
  groupConvIconColor,
} from './conv.util';
import { UnreadService } from './unread.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unread: UnreadService,
  ) {}

  // ============== GET /chat/online-friends ==============
  /**
   * 好友里最近 30 分钟有过消息发送的人,最多 8 条。
   * online/lastSeen 字段在 Step 3.9 WebSocket presence 接入后才能填准确值。
   */
  async listOnlineFriends(userId: string) {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60_000);
    const friends = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      include: {
        user1: { select: { userId: true, username: true } },
        user2: { select: { userId: true, username: true } },
      },
    });
    const friendUsers = friends.map((f) =>
      f.userId1 === userId ? f.user2 : f.user1,
    );
    if (friendUsers.length === 0) return { list: [] };

    const activeIds = new Set(
      (
        await this.prisma.message.groupBy({
          by: ['senderId'],
          where: {
            sendTime: { gt: thirtyMinAgo },
            senderId: { in: friendUsers.map((u) => u.userId) },
          },
        })
      ).map((g) => g.senderId),
    );

    const list = friendUsers
      .filter((u) => activeIds.has(u.userId))
      .slice(0, 8)
      .map((u) => {
        const av = makeAvatar(u.username);
        return {
          userId: u.userId,
          username: u.username,
          avatarText: av.text,
          avatarColor: av.color,
          online: true, // 由 WebSocket Gateway 在 3.9 修正
        };
      });

    return { list };
  }

  // ============== GET /chat/conversations ==============
  async listConversations(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { createTime: true },
    });
    if (!user) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '用户不存在');
    }
    const defaultLastView = user.createTime; // 从未点开的会话以注册时间为基准

    // ----- 群聊会话 = approved 房间，且房间未结束/未取消（解散后不再显示）-----
    const memberships = await this.prisma.matchMember.findMany({
      where: {
        userId,
        status: 'approved',
        room: { status: { notIn: ['finished', 'cancelled'] } },
      },
      include: {
        room: {
          select: {
            roomId: true,
            title: true,
            roomType: true,
            creatorId: true,
            status: true,
          },
        },
      },
    });

    const groupConvs = await Promise.all(
      memberships.map(async (m) => {
        const r = m.room;
        const convId = encodeGroupConvId(r.roomId);
        const lastMsg = await this.prisma.message.findFirst({
          where: { roomId: r.roomId },
          orderBy: { sendTime: 'desc' },
          include: { sender: { select: { username: true } } },
        });
        const lastView = this.unread.getLastView(userId, convId) ?? defaultLastView;
        const unreadCount = await this.prisma.message.count({
          where: {
            roomId: r.roomId,
            sendTime: { gt: lastView },
            senderId: { not: userId },
          },
        });
        const lastTimestamp = lastMsg ? lastMsg.sendTime : null;
        return {
          convId,
          type: 'group' as const,
          name: r.title,
          iconEmoji: groupConvEmoji(r.roomType),
          iconColor: groupConvIconColor(r.roomType),
          avatarText: null,
          avatarColor: null,
          userId: null,
          roomId: r.roomId,
          isOwner: r.creatorId === userId,
          roomStatus: r.status,
          lastMsg: lastMsg
            ? `${lastMsg.sender.username}: ${lastMsg.content}`
            : '(暂无消息)',
          lastTime: lastTimestamp ? fromNow(lastTimestamp) : '',
          lastTimestamp: lastTimestamp ? lastTimestamp.toISOString() : null,
          unread: unreadCount,
          online: false,
        };
      }),
    );

    // ----- 私聊会话 = Message 表里 (sender, receiver) 含当前用户的对端聚合 -----
    const sent = await this.prisma.message.findMany({
      where: { senderId: userId, receiverId: { not: null } },
      select: { receiverId: true },
      distinct: ['receiverId'],
    });
    const received = await this.prisma.message.findMany({
      where: { receiverId: userId },
      select: { senderId: true },
      distinct: ['senderId'],
    });
    const otherIds = Array.from(
      new Set([
        ...sent.map((s) => s.receiverId).filter((x): x is string => !!x),
        ...received.map((s) => s.senderId),
      ]),
    );

    const privateConvs = await Promise.all(
      otherIds.map(async (otherId) => {
        const convId = encodePrivateConvId(otherId);
        const [otherUser, lastMsg] = await Promise.all([
          this.prisma.user.findUnique({
            where: { userId: otherId },
            select: { userId: true, username: true },
          }),
          this.prisma.message.findFirst({
            where: {
              OR: [
                { senderId: userId, receiverId: otherId },
                { senderId: otherId, receiverId: userId },
              ],
            },
            orderBy: { sendTime: 'desc' },
          }),
        ]);
        if (!otherUser) return null;
        const av = makeAvatar(otherUser.username);
        const lastView = this.unread.getLastView(userId, convId) ?? defaultLastView;
        const unreadCount = await this.prisma.message.count({
          where: {
            senderId: otherId,
            receiverId: userId,
            sendTime: { gt: lastView },
          },
        });
        const lastTimestamp = lastMsg ? lastMsg.sendTime : null;
        return {
          convId,
          type: 'private' as const,
          name: otherUser.username,
          iconEmoji: null,
          iconColor: null,
          avatarText: av.text,
          avatarColor: av.color,
          userId: otherUser.userId,
          roomId: null,
          lastMsg: lastMsg ? lastMsg.content : '',
          lastTime: lastTimestamp ? fromNow(lastTimestamp) : '',
          lastTimestamp: lastTimestamp ? lastTimestamp.toISOString() : null,
          unread: unreadCount,
          online: false,
        };
      }),
    );

    // ----- 合入「无消息历史的好友」作为占位私聊（加好友立即出现）-----
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      include: {
        user1: { select: { userId: true, username: true } },
        user2: { select: { userId: true, username: true } },
      },
    });
    const friendIdSet = new Set(otherIds);
    const friendConvs = friendships
      .map((f) => (f.userId1 === userId ? f.user2 : f.user1))
      .filter((fr) => !friendIdSet.has(fr.userId))
      .map((fr) => {
        const av = makeAvatar(fr.username);
        return {
          convId: encodePrivateConvId(fr.userId),
          type: 'private' as const,
          name: fr.username,
          iconEmoji: null,
          iconColor: null,
          avatarText: av.text,
          avatarColor: av.color,
          userId: fr.userId,
          roomId: null,
          lastMsg: '（你们已成为好友，开始聊聊吧）',
          lastTime: '',
          lastTimestamp: null,
          unread: 0,
          online: false,
        };
      });

    // ----- 朋友群聊会话（Wave 3 #7b） -----
    const sgroupMemberships = await this.prisma.socialGroupMember.findMany({
      where: { userId },
      include: { group: true },
    });
    const sgroupConvs = await Promise.all(
      sgroupMemberships.map(async (m) => {
        const g = m.group;
        const convId = encodeSocialGroupConvId(g.groupId);
        const lastMsg = await this.prisma.message.findFirst({
          where: { socialGroupId: g.groupId },
          orderBy: { sendTime: 'desc' },
          include: { sender: { select: { username: true } } },
        });
        const lastView =
          this.unread.getLastView(userId, convId) ?? defaultLastView;
        const unreadCount = await this.prisma.message.count({
          where: {
            socialGroupId: g.groupId,
            sendTime: { gt: lastView },
            senderId: { not: userId },
          },
        });
        const lastTimestamp = lastMsg ? lastMsg.sendTime : null;
        return {
          convId,
          type: 'sgroup' as const,
          name: g.name,
          iconEmoji: g.iconEmoji,
          iconColor: g.iconColor,
          avatarText: null,
          avatarColor: null,
          userId: null,
          roomId: null,
          groupId: g.groupId,
          isOwner: m.role === 'owner',
          lastMsg: lastMsg
            ? `${lastMsg.sender.username}: ${lastMsg.content}`
            : '（新群聊已建立，打个招呼吧 👋）',
          lastTime: lastTimestamp ? fromNow(lastTimestamp) : '',
          lastTimestamp: lastTimestamp ? lastTimestamp.toISOString() : null,
          unread: unreadCount,
          online: false,
        };
      }),
    );

    let list = [
      ...groupConvs,
      ...sgroupConvs,
      ...privateConvs.filter((x) => x !== null),
      ...friendConvs,
    ] as any[];

    // ===== 用户隐藏 / 删除会话过滤（持久化在 Conversation_Hidden）=====
    // 规则：被隐藏的会话默认不显示；
    //       但若之后又有新消息（lastTimestamp > hiddenAt），自动恢复。
    const hiddenRows = await this.prisma.conversationHidden.findMany({
      where: { userId },
      select: { convId: true, hiddenAt: true },
    });
    if (hiddenRows.length) {
      const hiddenMap = new Map(
        hiddenRows.map((r) => [r.convId, r.hiddenAt.getTime()]),
      );
      list = list.filter((c) => {
        const h = hiddenMap.get(c.convId);
        if (h === undefined) return true;
        if (!c.lastTimestamp) return false; // 无新消息 → 继续隐藏
        return new Date(c.lastTimestamp).getTime() > h;
      });
    }

    list.sort((a, b) => {
      const ta = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
      const tb = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
      return tb - ta;
    });

    return { list };
  }

  // ============== POST /chat/conversations/:convId/hide ==============
  /** 用户主动隐藏（删除）某个会话；幂等：再次调用只刷新时间戳 */
  async hideConversation(userId: string, convId: string) {
    if (!convId) throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, 'convId 必填');
    await this.prisma.conversationHidden.upsert({
      where: { userId_convId: { userId, convId } },
      create: { userId, convId },
      update: { hiddenAt: new Date() },
    });
    return { ok: true };
  }

  // ============== DELETE /chat/conversations/:convId/hide ==============
  /** 取消隐藏（用户后悔了） */
  async unhideConversation(userId: string, convId: string) {
    await this.prisma.conversationHidden
      .delete({ where: { userId_convId: { userId, convId } } })
      .catch(() => null); // 没记录就当成功
    return { ok: true };
  }

  // ============== GET /chat/conversations/:convId/messages ==============
  async listMessages(
    userId: string,
    convId: string,
    before?: number,
    pageSize: number = 30,
  ) {
    const decoded = decodeConvId(convId);
    await this.assertCanAccess(userId, decoded);

    // 群聊房间已结束/已取消：不返回历史消息（聊天室关闭）
    if (decoded.type === 'group') {
      const r = await this.prisma.matchRoom.findUnique({
        where: { roomId: decoded.roomId },
        select: { status: true },
      });
      if (r && (r.status === 'finished' || r.status === 'cancelled')) {
        return { list: [] };
      }
    }

    const where = this.buildMessageWhere(userId, decoded);
    if (before) {
      where.msgId = { lt: before };
    }
    const msgs = await this.prisma.message.findMany({
      where,
      orderBy: { msgId: 'desc' },
      take: pageSize,
      include: { sender: { select: { userId: true, username: true } } },
    });

    return {
      list: msgs.map((m) => {
        const av = makeAvatar(m.sender.username);
        return {
          msgId: m.msgId,
          fromUserId: m.sender.userId,
          fromUsername: m.sender.username,
          fromAvatarText: av.text,
          fromAvatarColor: av.color,
          content: m.content,
          sendTime: m.sendTime.toISOString(),
          isMe: m.senderId === userId,
        };
      }),
    };
  }

  // ============== POST /chat/messages ==============
  /**
   * 持久化消息 + 返回需要被推送的对端用户 ID 列表(供 Gateway 做 fan-out)。
   */
  async sendMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<{ message: any; recipientUserIds: string[] }> {
    const hasRoom = dto.roomId !== undefined && dto.roomId !== null;
    const hasTarget = dto.targetUserId !== undefined && dto.targetUserId !== null;
    const hasSocialGroup =
      (dto as any).socialGroupId !== undefined &&
      (dto as any).socialGroupId !== null;

    const setCount = [hasRoom, hasTarget, hasSocialGroup].filter(Boolean).length;
    if (setCount !== 1) {
      throw new BusinessException(
        ERROR_CODES.VALIDATION_FAILED,
        'roomId / targetUserId / socialGroupId 三者必须且仅设一',
      );
    }

    if (hasRoom) return this.sendGroup(userId, dto.roomId!, dto.content);
    if (hasSocialGroup) {
      return this.sendSocialGroup(
        userId,
        (dto as any).socialGroupId as number,
        dto.content,
      );
    }
    return this.sendPrivate(userId, dto.targetUserId!, dto.content);
  }

  private async sendSocialGroup(
    userId: string,
    groupId: number,
    content: string,
  ): Promise<{ message: any; recipientUserIds: string[] }> {
    const me = await this.prisma.socialGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!me) {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '你不是该群成员');
    }
    const msg = await this.prisma.message.create({
      data: { senderId: userId, socialGroupId: groupId, content },
      include: { sender: { select: { userId: true, username: true } } },
    });
    this.unread.markRead(
      userId,
      encodeSocialGroupConvId(groupId),
      msg.sendTime,
    );
    const others = await this.prisma.socialGroupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    return {
      message: this.formatMessage(userId, msg),
      recipientUserIds: others.map((m) => m.userId),
    };
  }

  // ============== POST /chat/conversations/:convId/read ==============
  async markRead(userId: string, convId: string) {
    const decoded = decodeConvId(convId);
    await this.assertCanAccess(userId, decoded);
    this.unread.markRead(userId, convId);
    return { ok: true };
  }

  // ====================================================================
  // 私有辅助
  // ====================================================================

  private async sendGroup(
    userId: string,
    roomId: number,
    content: string,
  ): Promise<{ message: any; recipientUserIds: string[] }> {
    const me = await this.prisma.matchMember.findUnique({
      where: { roomId_userId: { roomId, userId } } as any,
    });
    if (!me || me.status !== 'approved') {
      throw new BusinessException(
        ERROR_CODES.FORBIDDEN,
        '你不是该房间成员,无法发消息',
      );
    }
    // 已结束/已取消的房间不允许发消息
    const room = await this.prisma.matchRoom.findUnique({
      where: { roomId },
      select: { status: true },
    });
    if (room && (room.status === 'finished' || room.status === 'cancelled')) {
      throw new BusinessException(
        ERROR_CODES.ROOM_EXPIRED,
        '聊天室已关闭，无法发送消息',
      );
    }
    const msg = await this.prisma.message.create({
      data: { senderId: userId, roomId, content },
      include: { sender: { select: { userId: true, username: true } } },
    });
    this.unread.markRead(userId, encodeGroupConvId(roomId), msg.sendTime);

    // 群聊推送对象 = 该房间所有 approved 成员
    const approved = await this.prisma.matchMember.findMany({
      where: { roomId, status: 'approved' },
      select: { userId: true },
    });
    return {
      message: this.formatMessage(userId, msg),
      recipientUserIds: approved.map((m) => m.userId),
    };
  }

  private async sendPrivate(
    userId: string,
    targetUserId: string,
    content: string,
  ) {
    if (targetUserId === userId) {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '不能给自己发消息');
    }
    const target = await this.prisma.user.findUnique({
      where: { userId: targetUserId },
    });
    if (!target) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '对方不存在');
    }
    // 互相拉黑校验
    const block = await this.prisma.blacklist.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: userId },
        ],
      },
    });
    if (block) {
      throw new BusinessException(ERROR_CODES.BLOCKED_BY_TARGET);
    }
    // msgPermission 校验
    if (target.msgPermission === 'none') {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '对方关闭了私聊');
    }
    if (target.msgPermission === 'friends') {
      const friend = await this.prisma.friendship.findFirst({
        where: {
          status: 'accepted',
          OR: [
            { userId1: userId, userId2: targetUserId },
            { userId1: targetUserId, userId2: userId },
          ],
        },
      });
      if (!friend) {
        throw new BusinessException(
          ERROR_CODES.FORBIDDEN,
          '对方仅好友可联系',
        );
      }
    }
    const msg = await this.prisma.message.create({
      data: { senderId: userId, receiverId: targetUserId, content },
      include: { sender: { select: { userId: true, username: true } } },
    });
    this.unread.markRead(userId, encodePrivateConvId(targetUserId), msg.sendTime);
    return {
      message: this.formatMessage(userId, msg),
      recipientUserIds: [userId, targetUserId],
    };
  }

  private formatMessage(
    currentUserId: string,
    m: {
      msgId: number;
      senderId: string;
      content: string;
      sendTime: Date;
      sender: { userId: string; username: string };
      roomId?: number | null;
      receiverId?: string | null;
      socialGroupId?: number | null;
    },
  ) {
    const av = makeAvatar(m.sender.username);
    let convId: string | null = null;
    if (m.roomId != null) convId = encodeGroupConvId(m.roomId);
    else if (m.socialGroupId != null)
      convId = encodeSocialGroupConvId(m.socialGroupId);
    else if (m.receiverId != null)
      convId = encodePrivateConvId(
        m.senderId === currentUserId ? m.receiverId : m.senderId,
      );
    return {
      msgId: m.msgId,
      fromUserId: m.sender.userId,
      fromUsername: m.sender.username,
      fromAvatarText: av.text,
      fromAvatarColor: av.color,
      content: m.content,
      sendTime: m.sendTime.toISOString(),
      isMe: m.senderId === currentUserId,
      convId,
    };
  }

  private buildMessageWhere(
    userId: string,
    decoded: DecodedConv,
  ): Prisma.MessageWhereInput {
    if (decoded.type === 'group') {
      return { roomId: decoded.roomId };
    }
    if (decoded.type === 'sgroup') {
      return { socialGroupId: decoded.groupId };
    }
    return {
      OR: [
        { senderId: userId, receiverId: decoded.userId },
        { senderId: decoded.userId, receiverId: userId },
      ],
    };
  }

  private async assertCanAccess(userId: string, decoded: DecodedConv) {
    if (decoded.type === 'group') {
      const m = await this.prisma.matchMember.findUnique({
        where: { roomId_userId: { roomId: decoded.roomId, userId } } as any,
      });
      if (!m || m.status !== 'approved') {
        throw new BusinessException(
          ERROR_CODES.FORBIDDEN,
          '你不是该房间成员',
        );
      }
    } else if (decoded.type === 'sgroup') {
      const m = await this.prisma.socialGroupMember.findUnique({
        where: { groupId_userId: { groupId: decoded.groupId, userId } },
      });
      if (!m) {
        throw new BusinessException(ERROR_CODES.FORBIDDEN, '你不是该群成员');
      }
    } else {
      // 私聊:对端必须存在(被拉黑也允许查历史,只是发不出去)
      const u = await this.prisma.user.findUnique({
        where: { userId: decoded.userId },
        select: { userId: true },
      });
      if (!u) {
        throw new BusinessException(ERROR_CODES.NOT_FOUND, '对方不存在');
      }
    }
  }
}
