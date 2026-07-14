import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import {
  ROOM_ACCENT,
  ROOM_ACCENT_LABEL,
  RoomType,
} from '../common/constants/room-theme';
import { makeAvatar } from '../common/utils/avatar.util';
import { formatMeet, toCountdown } from '../common/utils/time.util';

@Injectable()
export class HallService {
  constructor(private readonly prisma: PrismaService) {}

  // ============== GET /hall/dashboard ==============
  async getDashboard(userId: string) {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60_000);

    const [user, upcomingMember, counts, hotCandidates, onlineCount, matchToday] =
      await Promise.all([
        // 1. 用户基本信息
        this.prisma.user.findUnique({
          where: { userId },
          select: { userId: true, username: true },
        }),
        // 2. upcoming —— 我加入的、未来最近一条
        this.prisma.matchMember.findFirst({
          where: {
            userId,
            status: 'approved',
            room: {
              status: { in: ['open', 'full'] },
              meetTime: { gt: now },
            },
          },
          include: { room: true },
          orderBy: { room: { meetTime: 'asc' } },
        }),
        // 3. counts —— 三类 status='open' + meetTime>now 的数量
        this.queryCounts(now),
        // 4. hot —— 各类前 8 候选,稍后在内存里按 pct 合并取 4
        this.queryHotCandidates(now),
        // 5. onlineCount —— 最近 30 分钟有发过消息的不同用户数
        this.queryOnlineCount(thirtyMinAgo),
        // 6. matchToday —— 今天新成为 approved 的成员数
        this.prisma.matchMember.count({
          where: {
            status: 'approved',
            joinTime: { gte: startOfToday },
          },
        }),
      ]);

    if (!user) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '用户不存在');
    }

    const userAvatar = makeAvatar(user.username);

    // upcoming
    let upcoming = null;
    if (upcomingMember) {
      const r = upcomingMember.room;
      const t = r.roomType as RoomType;
      upcoming = {
        roomId: r.roomId,
        roomType: r.roomType,
        title: r.title,
        accent: ROOM_ACCENT[t] ?? '#999999',
        accentLabel: ROOM_ACCENT_LABEL[t] ?? r.roomType,
        meetLabel: r.meetTime ? formatMeet(r.meetTime) : '',
        countdown: r.meetTime ? toCountdown(r.meetTime) : '',
        meetLocation: r.meetLocation ?? '',
        currentNum: r.currentNum,
        totalNum: r.totalNum,
      };
    }

    // hot —— 合并三类候选,按 pct 排序取前 4
    const hot = hotCandidates
      .map((r) => {
        const t = r.roomType as RoomType;
        return {
          roomId: r.roomId,
          roomType: r.roomType,
          accent: ROOM_ACCENT[t] ?? '#999999',
          accentLabel: ROOM_ACCENT_LABEL[t] ?? r.roomType,
          title: r.title,
          subtitle: this.buildSubtitle(r),
          meetLabel: r.meetTime ? formatMeet(r.meetTime) : '',
          currentNum: r.currentNum,
          totalNum: r.totalNum,
          pct: Math.round((r.currentNum / r.totalNum) * 100),
        };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);

    return {
      user: {
        userId: user.userId,
        username: user.username,
        avatarText: userAvatar.text,
        avatarColor: userAvatar.color,
      },
      upcoming,
      counts,
      hot,
      onlineCount,
      matchToday,
    };
  }

  // ====================================================================
  // 私有辅助
  // ====================================================================

  private async queryCounts(now: Date) {
    const where = (rt: RoomType) => ({
      roomType: rt,
      status: 'open',
      OR: [{ meetTime: null }, { meetTime: { gt: now } }],
    });
    const [carpool, entertainment, group] = await Promise.all([
      this.prisma.matchRoom.count({ where: where('carpool') }),
      this.prisma.matchRoom.count({ where: where('entertainment') }),
      this.prisma.matchRoom.count({ where: where('group') }),
    ]);
    return { carpool, entertainment, group };
  }

  /**
   * 各类抓前 8 条 currentNum DESC 的候选,合并 24 行,在内存里按 pct 排序取前 4。
   * 真"按比例排序"在 SQL 层做需要 raw,本期先用近似;currentNum 高的本来就大概率比例高。
   */
  private async queryHotCandidates(now: Date) {
    const baseWhere = (rt: RoomType) => ({
      roomType: rt,
      status: 'open',
      OR: [{ meetTime: null }, { meetTime: { gt: now } }],
    });
    const include = {
      carpool: true,
      entertainment: true,
      group: true,
    };
    const orderBy = [{ currentNum: 'desc' as const }];
    const take = 8;
    const [carpool, entertainment, group] = await Promise.all([
      this.prisma.matchRoom.findMany({
        where: baseWhere('carpool'),
        include,
        orderBy,
        take,
      }),
      this.prisma.matchRoom.findMany({
        where: baseWhere('entertainment'),
        include,
        orderBy,
        take,
      }),
      this.prisma.matchRoom.findMany({
        where: baseWhere('group'),
        include,
        orderBy,
        take,
      }),
    ]);
    return [...carpool, ...entertainment, ...group];
  }

  private buildSubtitle(r: any): string {
    if (r.roomType === 'carpool' && r.carpool) {
      return `${r.carpool.startLocation} → ${r.carpool.endLocation}`;
    }
    if (r.roomType === 'group' && r.group) {
      return r.group.groupTarget || r.group.courseName || '';
    }
    return r.meetLocation ?? '';
  }

  /**
   * 最近 30 分钟有发过消息的不同 sender 数。
   * Prisma 没原生 COUNT(DISTINCT),走 groupBy。
   */
  private async queryOnlineCount(since: Date): Promise<number> {
    const senders = await this.prisma.message.groupBy({
      by: ['senderId'],
      where: { sendTime: { gt: since } },
    });
    return senders.length;
  }
}
