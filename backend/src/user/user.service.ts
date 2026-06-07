import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import {
  ROOM_ACCENT,
  ROOM_ACCENT_LABEL,
  RoomType,
} from '../common/constants/room-theme';
import { evaluateAchievements } from '../common/constants/achievements';
import { makeAvatar } from '../common/utils/avatar.util';
import { joinTags, splitTags } from '../common/utils/tags.util';
import { toUserDto, UserDto } from '../common/utils/user-dto.util';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // ============== GET /users/search?userId=xxxx ==============
  // 默认开放搜索（只有未注册 / 账号封禁才返回 null）。
  // 隐私 toggle 留到隐私设置 UI 上线后再恢复 is_searchable 闸门。
  //   · 输入太短 → VALIDATION_FAILED
  //   · 用户不存在 → {user:null, reason:'not_registered'}
  //   · 账号被封 → {user:null, reason:'restricted'}
  //   · 正常用户（包括自己）→ 返回用户卡 + 好友关系 friendStatus
  async searchByUserId(targetUserId: string, currentUserId: string) {
    const q = (targetUserId || '').trim();
    if (q.length < 4) {
      throw new BusinessException(
        ERROR_CODES.VALIDATION_FAILED,
        '请输入完整学号',
      );
    }
    const u = await this.prisma.user.findUnique({
      where: { userId: q },
      select: {
        userId: true,
        username: true,
        college: true,
        major: true,
        tags: true,
        accountStatus: true,
      },
    });
    if (!u) return { user: null, reason: 'not_registered' as const };
    if (u.accountStatus !== 'normal')
      return { user: null, reason: 'restricted' as const };

    // 自己 → friendStatus='self'，前端显示"这是你自己"badge
    let friendStatus:
      | 'self' | 'none' | 'pending_out' | 'pending_in' | 'accepted' = 'none';
    if (q === currentUserId) {
      friendStatus = 'self';
    } else {
      const friendship = await this.prisma.friendship.findFirst({
        where: {
          status: { in: ['pending', 'accepted'] },
          OR: [
            { userId1: currentUserId, userId2: q },
            { userId1: q, userId2: currentUserId },
          ],
        },
        select: { status: true, userId1: true },
      });
      if (friendship) {
        if (friendship.status === 'accepted') friendStatus = 'accepted';
        else
          friendStatus =
            friendship.userId1 === currentUserId ? 'pending_out' : 'pending_in';
      }
    }

    const av = makeAvatar(u.username);
    return {
      user: {
        userId: u.userId,
        username: u.username,
        college: u.college,
        major: u.major,
        tags: splitTags(u.tags),
        avatarText: av.text,
        avatarColor: av.color,
        friendStatus,
      },
    };
  }

  // ============== GET /users/me ==============
  async getMe(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '用户不存在');
    }
    return toUserDto(user, { phone: 'mask' });
  }

  // ============== PATCH /users/me ==============
  async updateMe(userId: string, dto: UpdateMeDto): Promise<UserDto> {
    const data: Prisma.UserUpdateInput = {};
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.realName !== undefined) data.realName = dto.realName;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.college !== undefined) data.college = dto.college;
    if (dto.major !== undefined) data.major = dto.major;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.tags !== undefined) data.tags = joinTags(dto.tags);
    if (dto.isSearchable !== undefined) data.isSearchable = dto.isSearchable;
    if (dto.msgPermission !== undefined) data.msgPermission = dto.msgPermission;

    if (Object.keys(data).length === 0) {
      return this.getMe(userId);
    }

    try {
      const user = await this.prisma.user.update({ where: { userId }, data });
      return toUserDto(user, { phone: 'mask' });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
          throw new BusinessException(ERROR_CODES.NOT_FOUND, '用户不存在');
        }
        if (err.code === 'P2002') {
          const target = (err.meta?.target as string[] | undefined) || [];
          const field = target.includes('username')
            ? '用户名'
            : target.includes('phone')
            ? '手机号'
            : '字段';
          throw new BusinessException(
            ERROR_CODES.VALIDATION_FAILED,
            `${field}已被使用`,
          );
        }
      }
      throw err;
    }
  }

  // ============== GET /users/:userId/profile ==============
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '用户不存在');
    }

    // 并发跑所有聚合查询(避免串行 N 次往返)
    const [
      postCount,
      matchedUserCount,
      ratingGroups,
      finishedRoomCount,
      finishedGroupRoomCount,
    ] = await Promise.all([
      // 1) 发帖数 —— 我作为 creator 且非 cancelled 的房间数
      this.prisma.matchRoom.count({
        where: { creatorId: userId, status: { not: 'cancelled' } },
      }),
      // 2) 搭子数 —— 我作为 approved 成员所在房间里,**去重**的其他 approved 成员数
      this.countMatchedUsers(userId),
      // 3) 1-5 星各档计数 —— GROUP BY score
      this.prisma.matchEvaluate.groupBy({
        by: ['score'],
        where: { toMember: { userId } },
        _count: { score: true },
      }),
      // 4) finished 房间数(成就用)
      this.prisma.matchMember.count({
        where: {
          userId,
          status: 'approved',
          room: { status: 'finished' },
        },
      }),
      // 5) 完成的学习房间数(a6 用)
      this.prisma.matchMember.count({
        where: {
          userId,
          status: 'approved',
          room: { status: 'finished', roomType: 'group' },
        },
      }),
    ]);

    // 把 1-5 星分布填齐 5 档
    const countByScore: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let totalEval = 0;
    let weightedSum = 0;
    for (const g of ratingGroups) {
      const s = g.score as 1 | 2 | 3 | 4 | 5;
      const c = g._count.score;
      countByScore[s] = c;
      totalEval += c;
      weightedSum += s * c;
    }

    const average = totalEval === 0 ? 0 : weightedSum / totalEval;
    const distribution = ([5, 4, 3, 2, 1] as const).map((stars) => ({
      stars,
      count: countByScore[stars],
      pct: totalEval === 0 ? 0 : Math.round((countByScore[stars] / totalEval) * 100),
    }));

    // 成就动态评估
    const achievements = evaluateAchievements({
      finishedRoomCount,
      fiveStarCount: countByScore[5],
      finishedGroupRoomCount,
      ratingAverage: average,
      evaluationCount: totalEval,
    });

    return {
      user: toUserDto(user, { phone: 'omit' }),
      stats: {
        postCount,
        matchedUserCount,
        evaluationCount: totalEval,
      },
      rating: {
        average: Math.round(average * 10) / 10, // 保留 1 位小数,如 4.9
        total: totalEval,
        distribution,
      },
      achievements,
    };
  }

  // ============== GET /users/me/teammates ==============
  // 历史搭子：所有 status='finished' 房间中共同过的 approved 成员，
  // 按共同房间数降序；同时返回每个搭子的好友关系状态、最近一次同房间信息。
  // 用两条查询拼装：1) 聚合 sharedRooms；2) 拉每个 peer 的最近一次共同房间（窗口函数）
  async listTeammates(userId: string) {
    type AggRow = {
      userId: string;
      username: string;
      college: string | null;
      major: string | null;
      sharedRooms: bigint;
    };
    const agg = await this.prisma.$queryRaw<AggRow[]>`
      SELECT
        u.user_id  AS userId,
        u.username AS username,
        u.college  AS college,
        u.major    AS major,
        COUNT(DISTINCT mm2.room_id) AS sharedRooms
      FROM Match_Member mm1
      JOIN Match_Member mm2 ON mm1.room_id = mm2.room_id
      JOIN Match_Room   r   ON r.room_id = mm1.room_id
      JOIN User u           ON u.user_id = mm2.user_id
      WHERE mm1.user_id = ${userId}
        AND mm1.status = 'approved'
        AND mm2.status = 'approved'
        AND mm2.user_id <> ${userId}
        AND r.status = 'finished'
      GROUP BY u.user_id, u.username, u.college, u.major
      ORDER BY sharedRooms DESC
      LIMIT 100
    `;

    if (agg.length === 0) return { list: [] };

    // 取每个 peer 的最近一次共同 finished 房间（用窗口函数 ROW_NUMBER）
    type LastRow = {
      peerId: string;
      roomId: number;
      title: string;
      roomType: string;
      meetTime: Date | null;
    };
    const last = await this.prisma.$queryRaw<LastRow[]>`
      SELECT peerId, roomId, title, roomType, meetTime FROM (
        SELECT
          mm2.user_id AS peerId,
          r.room_id   AS roomId,
          r.title     AS title,
          r.room_type AS roomType,
          r.meet_time AS meetTime,
          ROW_NUMBER() OVER (
            PARTITION BY mm2.user_id
            ORDER BY COALESCE(r.meet_time, r.create_time) DESC
          ) AS rn
        FROM Match_Member mm1
        JOIN Match_Member mm2 ON mm1.room_id = mm2.room_id
        JOIN Match_Room   r   ON r.room_id = mm1.room_id
        WHERE mm1.user_id = ${userId}
          AND mm1.status = 'approved'
          AND mm2.status = 'approved'
          AND mm2.user_id <> ${userId}
          AND r.status = 'finished'
      ) t WHERE rn = 1
    `;
    const lastMap = new Map(last.map((l) => [l.peerId, l]));

    // 一次性查好友关系（避免 N 次往返）
    const peerIds = agg.map((r) => r.userId);
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: { in: ['pending', 'accepted'] },
        OR: [
          { userId1: userId, userId2: { in: peerIds } },
          { userId1: { in: peerIds }, userId2: userId },
        ],
      },
      select: { status: true, userId1: true, userId2: true },
    });
    const fmap = new Map<string, 'pending_out' | 'pending_in' | 'accepted'>();
    for (const f of friendships) {
      const peer = f.userId1 === userId ? f.userId2 : f.userId1;
      if (f.status === 'accepted') fmap.set(peer, 'accepted');
      else fmap.set(peer, f.userId1 === userId ? 'pending_out' : 'pending_in');
    }

    const list = agg.map((r) => {
      const lr = lastMap.get(r.userId);
      const t = (lr?.roomType ?? 'group') as RoomType;
      const av = makeAvatar(r.username);
      return {
        userId: r.userId,
        username: r.username,
        college: r.college,
        major: r.major,
        avatarText: av.text,
        avatarColor: av.color,
        sharedRooms: Number(r.sharedRooms),
        friendStatus: fmap.get(r.userId) ?? 'none',
        lastRoom: lr
          ? {
              roomId: lr.roomId,
              title: lr.title,
              roomType: lr.roomType,
              accent: ROOM_ACCENT[t] ?? '#999999',
              accentLabel: ROOM_ACCENT_LABEL[t] ?? lr.roomType,
              meetTime: lr.meetTime?.toISOString() ?? null,
            }
          : null,
      };
    });

    return { list };
  }

  /**
   * 搭子数 —— 当前用户参与过的所有 approved 房间里,出现过的其他 approved 用户去重计数。
   * 因为 Prisma 不直接支持 COUNT(DISTINCT),走 $queryRaw。
   */
  private async countMatchedUsers(userId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(DISTINCT mm2.user_id) AS cnt
      FROM Match_Member mm1
      JOIN Match_Member mm2 ON mm1.room_id = mm2.room_id
      WHERE mm1.user_id = ${userId}
        AND mm1.status = 'approved'
        AND mm2.status = 'approved'
        AND mm2.user_id <> ${userId}
    `;
    const cnt = rows?.[0]?.cnt;
    return cnt ? Number(cnt) : 0;
  }

  // ============== GET /users/:userId/evaluations ==============
  async listEvaluations(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const target = await this.prisma.user.findUnique({
      where: { userId },
      select: { userId: true },
    });
    if (!target) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '用户不存在');
    }

    const where: Prisma.MatchEvaluateWhereInput = {
      toMember: { userId },
    };

    const [total, evaluations] = await Promise.all([
      this.prisma.matchEvaluate.count({ where }),
      this.prisma.matchEvaluate.findMany({
        where,
        include: {
          fromMember: {
            include: {
              user: { select: { userId: true, username: true } },
            },
          },
          toMember: {
            include: {
              room: { select: { title: true, roomType: true } },
            },
          },
        },
        orderBy: { createTime: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const list = evaluations.map((e) => {
      const from = e.fromMember.user;
      const room = e.toMember.room;
      const avatar = makeAvatar(from.username);
      const roomType = room.roomType as RoomType;
      const activityLabel = ROOM_ACCENT_LABEL[roomType] ?? room.roomType;
      return {
        evaluateId: e.evaluateId,
        fromUserId: from.userId,
        fromUsername: from.username,
        fromAvatarText: avatar.text,
        fromAvatarColor: avatar.color,
        score: e.score,
        content: e.content,
        activity: `${activityLabel} · ${room.title}`,
        activityColor: ROOM_ACCENT[roomType] ?? '#999999',
        roomType: room.roomType,
        createdAt: e.createTime.toISOString(),
      };
    });

    return { list, total, page, pageSize };
  }
}
