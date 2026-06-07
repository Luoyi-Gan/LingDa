import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import { makeAvatar } from '../common/utils/avatar.util';
import { CreateGroupDto } from './dto/create-group.dto';

const EMOJI_POOL = ['💬', '🎉', '🌈', '🍕', '🐱', '🐼', '🌸', '🎮'];
const COLOR_POOL = [
  '#7766DD',
  '#E8725A',
  '#3B9B8F',
  '#4A6FA5',
  '#C8567E',
  '#FF9500',
  '#34C759',
  '#0A84FF',
];

@Injectable()
export class SocialGroupService {
  constructor(private readonly prisma: PrismaService) {}

  // ============== POST /social/groups ==============
  // 创建朋友群聊。校验：
  //   · 所有 memberId 都是好友（accepted Friendship）
  //   · 至少 2 名好友（最终成员含自己 ≥ 3）
  async create(userId: string, dto: CreateGroupDto) {
    const peers = Array.from(new Set(dto.memberIds.filter((u) => u && u !== userId)));
    if (peers.length < 2) {
      throw new BusinessException(
        ERROR_CODES.VALIDATION_FAILED,
        '至少选择 2 位好友',
      );
    }

    // 校验都是 accepted 好友
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [
          { userId1: userId, userId2: { in: peers } },
          { userId1: { in: peers }, userId2: userId },
        ],
      },
      select: { userId1: true, userId2: true },
    });
    const friendSet = new Set<string>();
    for (const f of friendships) {
      friendSet.add(f.userId1 === userId ? f.userId2 : f.userId1);
    }
    const notFriend = peers.filter((p) => !friendSet.has(p));
    if (notFriend.length > 0) {
      throw new BusinessException(
        ERROR_CODES.VALIDATION_FAILED,
        `仅可邀请好友：${notFriend.join(', ')}`,
      );
    }

    // 群名兜底：用所有成员名拼接
    let name = (dto.name || '').trim();
    if (!name) {
      const users = await this.prisma.user.findMany({
        where: { userId: { in: [userId, ...peers] } },
        select: { userId: true, username: true },
        take: 5,
      });
      name = users.map((u) => u.username).join('、');
      if (peers.length + 1 > 5) name += `等 ${peers.length + 1} 人`;
      if (name.length > 110) name = name.slice(0, 110) + '…';
    }

    const seed = (userId + name).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const iconEmoji = dto.iconEmoji || EMOJI_POOL[seed % EMOJI_POOL.length];
    const iconColor = dto.iconColor || COLOR_POOL[seed % COLOR_POOL.length];

    // 一事务：创建 group + 所有成员
    const group = await this.prisma.$transaction(async (tx) => {
      const g = await tx.socialGroup.create({
        data: {
          name,
          creatorId: userId,
          iconEmoji,
          iconColor,
        },
      });
      const memberRows = [
        { groupId: g.groupId, userId, role: 'owner' as const },
        ...peers.map((u) => ({ groupId: g.groupId, userId: u, role: 'member' as const })),
      ];
      await tx.socialGroupMember.createMany({ data: memberRows });
      return g;
    });

    return {
      groupId: group.groupId,
      convId: `sgroup_${group.groupId}`,
      name: group.name,
      iconEmoji: group.iconEmoji,
      iconColor: group.iconColor,
      memberCount: peers.length + 1,
    };
  }

  // ============== GET /social/groups ==============
  // 我加入的所有群（按创建时间倒序）
  async listMine(userId: string) {
    const memberships = await this.prisma.socialGroupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinTime: 'desc' },
    });
    return {
      list: memberships.map((m) => ({
        groupId: m.group.groupId,
        convId: `sgroup_${m.group.groupId}`,
        name: m.group.name,
        iconEmoji: m.group.iconEmoji,
        iconColor: m.group.iconColor,
        memberCount: m.group._count.members,
        role: m.role,
        joinedAt: m.joinTime.toISOString(),
      })),
    };
  }

  // ============== GET /social/groups/:groupId ==============
  async detail(groupId: number, userId: string) {
    const me = await this.prisma.socialGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!me) {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '你不是该群成员');
    }
    const group = await this.prisma.socialGroup.findUnique({
      where: { groupId },
      include: {
        members: {
          include: {
            user: { select: { userId: true, username: true } },
          },
          orderBy: { joinTime: 'asc' },
        },
      },
    });
    if (!group) throw new BusinessException(ERROR_CODES.NOT_FOUND, '群不存在');

    return {
      groupId: group.groupId,
      convId: `sgroup_${group.groupId}`,
      name: group.name,
      iconEmoji: group.iconEmoji,
      iconColor: group.iconColor,
      creatorId: group.creatorId,
      myRole: me.role,
      members: group.members.map((m) => {
        const av = makeAvatar(m.user.username);
        return {
          userId: m.user.userId,
          username: m.user.username,
          role: m.role,
          avatarText: av.text,
          avatarColor: av.color,
        };
      }),
    };
  }

  // ============== DELETE /social/groups/:groupId/members/me ==============
  async leave(groupId: number, userId: string) {
    const me = await this.prisma.socialGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!me) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '你不是该群成员');
    }
    // 群主退出 → 直接解散
    if (me.role === 'owner') {
      await this.prisma.socialGroup.delete({ where: { groupId } });
      return { groupId, dissolved: true };
    }
    await this.prisma.socialGroupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
    return { groupId, dissolved: false };
  }

  // 内部辅助：当前用户是否群成员
  async assertMember(groupId: number, userId: string) {
    const m = await this.prisma.socialGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!m) {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '你不是该群成员');
    }
    return m;
  }
}
