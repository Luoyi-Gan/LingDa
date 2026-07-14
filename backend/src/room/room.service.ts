import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import {
  pickStudyBadge,
  pickStudyBadgeColor,
  ROOM_ACCENT,
  ROOM_ACCENT_LABEL,
  RoomType,
  lightenColor,
} from '../common/constants/room-theme';
import { makeAvatar } from '../common/utils/avatar.util';
import { joinTags, splitTags } from '../common/utils/tags.util';
import { formatMeet } from '../common/utils/time.util';
import { CreateCarpoolDto } from './dto/create-carpool.dto';
import { CreateEntertainmentDto } from './dto/create-entertainment.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import {
  ListEntertainmentQueryDto,
  ListRoomsQueryDto,
} from './dto/list-rooms.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class RoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // ============== POST /rooms/carpool ==============
  async createCarpool(userId: string, dto: CreateCarpoolDto) {
    this.validateMeetTime(dto.meetTime);
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.matchRoom.create({
        data: {
          creatorId: userId,
          roomType: 'carpool',
          joinRule: dto.joinRule ?? 'direct',
          joinPassword: dto.joinRule === 'password' ? dto.joinPassword : null,
          tags: joinTags(dto.tags),
          title: dto.title,
          content: dto.content,
          totalNum: dto.totalNum,
          currentNum: 1,
          meetTime: dto.meetTime ? new Date(dto.meetTime) : null,
          meetLocation: dto.meetLocation,
          status: 'open',
        },
      });
      await tx.carpoolRoom.create({
        data: {
          roomId: room.roomId,
          startLocation: dto.startLocation,
          endLocation: dto.endLocation,
          carType: dto.carType,
          costSplit: dto.costSplit,
        },
      });
      await tx.matchMember.create({
        data: { roomId: room.roomId, userId, status: 'approved' },
      });
      return this.toCreateResp(room);
    });
  }

  // ============== POST /rooms/entertainment ==============
  async createEntertainment(userId: string, dto: CreateEntertainmentDto) {
    this.validateMeetTime(dto.meetTime);
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.matchRoom.create({
        data: {
          creatorId: userId,
          roomType: 'entertainment',
          joinRule: dto.joinRule ?? 'direct',
          joinPassword: dto.joinRule === 'password' ? dto.joinPassword : null,
          tags: joinTags(dto.tags),
          title: dto.title,
          content: dto.content,
          totalNum: dto.totalNum,
          currentNum: 1,
          meetTime: dto.meetTime ? new Date(dto.meetTime) : null,
          meetLocation: dto.meetLocation,
          status: 'open',
        },
      });
      await tx.entertainmentRoom.create({
        data: {
          roomId: room.roomId,
          entType: dto.entType,
          cost: dto.cost,
          equipment: dto.equipment,
        },
      });
      await tx.matchMember.create({
        data: { roomId: room.roomId, userId, status: 'approved' },
      });
      return this.toCreateResp(room);
    });
  }

  // ============== POST /rooms/group ==============
  async createGroup(userId: string, dto: CreateGroupDto) {
    this.validateMeetTime(dto.meetTime);
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.matchRoom.create({
        data: {
          creatorId: userId,
          roomType: 'group',
          joinRule: dto.joinRule ?? 'direct',
          joinPassword: dto.joinRule === 'password' ? dto.joinPassword : null,
          tags: joinTags(dto.tags),
          title: dto.title,
          content: dto.content,
          totalNum: dto.totalNum,
          currentNum: 1,
          meetTime: dto.meetTime ? new Date(dto.meetTime) : null,
          meetLocation: dto.meetLocation,
          status: 'open',
        },
      });
      await tx.groupRoom.create({
        data: {
          roomId: room.roomId,
          courseName: dto.courseName,
          groupTarget: dto.groupTarget,
          requireSkill: dto.requireSkill,
        },
      });
      await tx.matchMember.create({
        data: { roomId: room.roomId, userId, status: 'approved' },
      });
      return this.toCreateResp(room);
    });
  }

  // ============== GET /rooms/carpool ==============
  async listCarpool(query: ListRoomsQueryDto) {
    const where = this.buildListWhere('carpool');
    const total = await this.prisma.matchRoom.count({ where });
    const rooms = await this.prisma.matchRoom.findMany({
      where,
      include: {
        carpool: true,
        members: {
          where: { status: 'approved' },
          include: { user: { select: { userId: true, username: true } } },
          orderBy: { joinTime: 'asc' },
        },
      },
      orderBy: this.buildOrderBy(query.sort),
      skip: this.skip(query.page, query.pageSize),
      take: query.pageSize,
    });
    return {
      list: rooms.map((r) => this.toCarpoolListItem(r)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  // ============== GET /rooms/entertainment ==============
  async listEntertainment(query: ListEntertainmentQueryDto) {
    const where: Prisma.MatchRoomWhereInput = this.buildListWhere('entertainment');
    if (query.cat && query.cat !== '全部') {
      where.entertainment = { entType: query.cat };
    }
    const total = await this.prisma.matchRoom.count({ where });
    const rooms = await this.prisma.matchRoom.findMany({
      where,
      include: {
        entertainment: true,
        creator: { select: { userId: true, username: true } },
      },
      orderBy: this.buildOrderBy(query.sort),
      skip: this.skip(query.page, query.pageSize),
      take: query.pageSize,
    });
    return {
      list: rooms.map((r) => this.toEntertainmentListItem(r)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  // ============== GET /rooms/group ==============
  async listGroup(query: ListRoomsQueryDto) {
    const where = this.buildListWhere('group');
    const total = await this.prisma.matchRoom.count({ where });
    const rooms = await this.prisma.matchRoom.findMany({
      where,
      include: { group: true },
      orderBy: this.buildOrderBy(query.sort),
      skip: this.skip(query.page, query.pageSize),
      take: query.pageSize,
    });
    return {
      list: rooms.map((r) => this.toGroupListItem(r)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  // ============== GET /rooms/:roomId ==============
  async getDetail(roomId: number, currentUserId: string) {
    const room = await this.prisma.matchRoom.findUnique({
      where: { roomId },
      include: {
        carpool: true,
        entertainment: true,
        group: true,
        creator: { select: { userId: true, username: true, tags: true } },
        members: {
          orderBy: { joinTime: 'asc' },
          include: { user: { select: { userId: true, username: true } } },
        },
      },
    });
    if (!room) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');
    }

    // 房主评分(实时聚合)
    const creatorAgg = await this.prisma.matchEvaluate.aggregate({
      where: { toMember: { userId: room.creator.userId } },
      _avg: { score: true },
      _count: { score: true },
    });
    const creatorPostCount = await this.prisma.matchRoom.count({
      where: { creatorId: room.creator.userId, status: { not: 'cancelled' } },
    });
    const creatorAvatar = makeAvatar(room.creator.username);

    // 我的成员状态
    const myMember = room.members.find(
      (m) => m.userId === currentUserId,
    );

    // 是否可评价(房间 finished + 我是 approved 成员 + 还有未评价对象)
    let canEvaluate = false;
    if (room.status === 'finished' && myMember && myMember.status === 'approved') {
      const otherApproved = room.members.filter(
        (m) => m.status === 'approved' && m.userId !== currentUserId,
      );
      if (otherApproved.length > 0) {
        const evaluatedCount = await this.prisma.matchEvaluate.count({
          where: { fromMemberId: myMember.memberId },
        });
        canEvaluate = evaluatedCount < otherApproved.length;
      }
    }

    return {
      room: this.toDetailRoom(room),
      creator: {
        userId: room.creator.userId,
        username: room.creator.username,
        avatarText: creatorAvatar.text,
        avatarColor: creatorAvatar.color,
        rating:
          creatorAgg._count.score > 0
            ? Math.round((creatorAgg._avg.score ?? 0) * 10) / 10
            : 0,
        ratingCount: creatorAgg._count.score,
        postCount: creatorPostCount,
        tags: splitTags(room.creator.tags),
      },
      members: room.members.map((m) => {
        const av = makeAvatar(m.user.username);
        return {
          memberId: m.memberId,
          userId: m.userId,
          username: m.user.username,
          avatarText: av.text,
          avatarColor: av.color,
          isOwner: m.userId === room.creatorId,
          status: m.status,
          joinTime: m.joinTime.toISOString(),
        };
      }),
      myMembership: myMember
        ? {
            exists: true,
            memberId: myMember.memberId,
            status: myMember.status,
            isOwner: myMember.userId === room.creatorId,
          }
        : { exists: false },
      canEvaluate,
    };
  }

  // ============== PATCH /rooms/:roomId/cancel ==============
  async cancel(roomId: number, userId: string) {
    const room = await this.prisma.matchRoom.findUnique({ where: { roomId } });
    if (!room) throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');
    if (room.creatorId !== userId) {
      throw new BusinessException(ERROR_CODES.NOT_ROOM_OWNER);
    }
    if (room.status === 'finished') {
      throw new BusinessException(
        ERROR_CODES.ROOM_EXPIRED,
        '已结束的房间不可解散',
      );
    }
    await this.prisma.matchRoom.update({
      where: { roomId },
      data: { status: 'cancelled' },
    });
    return { roomId, status: 'cancelled' };
  }

  // ============== PATCH /rooms/:roomId/finish ==============
  async finish(roomId: number, userId: string) {
    const room = await this.prisma.matchRoom.findUnique({
      where: { roomId },
      include: { members: { where: { status: 'approved' } } },
    });
    if (!room) throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');
    if (room.creatorId !== userId) {
      throw new BusinessException(ERROR_CODES.NOT_ROOM_OWNER);
    }
    if (room.status !== 'open' && room.status !== 'full') {
      throw new BusinessException(
        ERROR_CODES.ROOM_EXPIRED,
        '当前状态不可标记完成',
      );
    }
    await this.prisma.matchRoom.update({
      where: { roomId },
      data: { status: 'finished' },
    });

    // 给所有已通过的成员（含房主）推「已结束·去评价」通知
    const userIds = room.members.map((m) => m.userId);
    if (userIds.length) {
      await this.notificationService.pushBatch(
        userIds,
        'room_finished',
        {
          roomId,
          roomType: room.roomType,
          roomTitle: room.title,
          actionLabel: '去评价',
        },
      );
    }

    return { roomId, status: 'finished' };
  }

  // ============== PATCH /rooms/:roomId/carpool ==============
  async updateCarpool(roomId: number, userId: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.matchRoom.findUnique({
        where: { roomId },
        include: { carpool: true },
      });
      if (!r) throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');
      if (r.creatorId !== userId)
        throw new BusinessException(ERROR_CODES.NOT_ROOM_OWNER);
      if (r.roomType !== 'carpool')
        throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, '类型不匹配');
      if (r.status !== 'open' && r.status !== 'full')
        throw new BusinessException(
          ERROR_CODES.ROOM_EXPIRED,
          '已结束/已取消的房间不能编辑',
        );
      if (dto.meetTime !== undefined) this.validateMeetTime(dto.meetTime);
      if (dto.totalNum !== undefined && dto.totalNum < r.currentNum)
        throw new BusinessException(
          ERROR_CODES.VALIDATION_FAILED,
          `新人数不能小于已加入(${r.currentNum})`,
        );

      // 1. 主表
      const roomPatch: any = {};
      if (dto.title !== undefined) roomPatch.title = dto.title;
      if (dto.content !== undefined) roomPatch.content = dto.content;
      if (dto.totalNum !== undefined) roomPatch.totalNum = dto.totalNum;
      if (dto.meetTime !== undefined)
        roomPatch.meetTime = dto.meetTime ? new Date(dto.meetTime) : null;
      if (dto.meetLocation !== undefined) roomPatch.meetLocation = dto.meetLocation;
      if (dto.tags !== undefined) roomPatch.tags = joinTags(dto.tags);
      if (Object.keys(roomPatch).length)
        await tx.matchRoom.update({ where: { roomId }, data: roomPatch });

      // 2. 子表
      const cpPatch: any = {};
      if (dto.startLocation !== undefined) cpPatch.startLocation = dto.startLocation;
      if (dto.endLocation !== undefined) cpPatch.endLocation = dto.endLocation;
      if (dto.carType !== undefined) cpPatch.carType = dto.carType;
      if (dto.costSplit !== undefined) cpPatch.costSplit = dto.costSplit;
      if (Object.keys(cpPatch).length)
        await tx.carpoolRoom.update({ where: { roomId }, data: cpPatch });

      // 3. open↔full 状态联动
      const after = await tx.matchRoom.findUnique({ where: { roomId } });
      if (after!.status === 'full' && after!.currentNum < after!.totalNum)
        await tx.matchRoom.update({
          where: { roomId },
          data: { status: 'open' },
        });
      if (after!.status === 'open' && after!.currentNum >= after!.totalNum)
        await tx.matchRoom.update({
          where: { roomId },
          data: { status: 'full' },
        });

      return { roomId };
    });
  }

  // ============== PATCH /rooms/:roomId/entertainment ==============
  async updateEntertainment(roomId: number, userId: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.matchRoom.findUnique({
        where: { roomId },
        include: { entertainment: true },
      });
      if (!r) throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');
      if (r.creatorId !== userId)
        throw new BusinessException(ERROR_CODES.NOT_ROOM_OWNER);
      if (r.roomType !== 'entertainment')
        throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, '类型不匹配');
      if (r.status !== 'open' && r.status !== 'full')
        throw new BusinessException(
          ERROR_CODES.ROOM_EXPIRED,
          '已结束/已取消的房间不能编辑',
        );
      if (dto.meetTime !== undefined) this.validateMeetTime(dto.meetTime);
      if (dto.totalNum !== undefined && dto.totalNum < r.currentNum)
        throw new BusinessException(
          ERROR_CODES.VALIDATION_FAILED,
          `新人数不能小于已加入(${r.currentNum})`,
        );

      const roomPatch: any = {};
      if (dto.title !== undefined) roomPatch.title = dto.title;
      if (dto.content !== undefined) roomPatch.content = dto.content;
      if (dto.totalNum !== undefined) roomPatch.totalNum = dto.totalNum;
      if (dto.meetTime !== undefined)
        roomPatch.meetTime = dto.meetTime ? new Date(dto.meetTime) : null;
      if (dto.meetLocation !== undefined) roomPatch.meetLocation = dto.meetLocation;
      if (dto.tags !== undefined) roomPatch.tags = joinTags(dto.tags);
      if (Object.keys(roomPatch).length)
        await tx.matchRoom.update({ where: { roomId }, data: roomPatch });

      const eP: any = {};
      if (dto.entType !== undefined) eP.entType = dto.entType;
      if (dto.cost !== undefined) eP.cost = dto.cost;
      if (dto.equipment !== undefined) eP.equipment = dto.equipment;
      if (Object.keys(eP).length)
        await tx.entertainmentRoom.update({ where: { roomId }, data: eP });

      const after = await tx.matchRoom.findUnique({ where: { roomId } });
      if (after!.status === 'full' && after!.currentNum < after!.totalNum)
        await tx.matchRoom.update({
          where: { roomId },
          data: { status: 'open' },
        });
      if (after!.status === 'open' && after!.currentNum >= after!.totalNum)
        await tx.matchRoom.update({
          where: { roomId },
          data: { status: 'full' },
        });

      return { roomId };
    });
  }

  // ============== PATCH /rooms/:roomId/group ==============
  async updateGroup(roomId: number, userId: string, dto: any) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.matchRoom.findUnique({
        where: { roomId },
        include: { group: true },
      });
      if (!r) throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');
      if (r.creatorId !== userId)
        throw new BusinessException(ERROR_CODES.NOT_ROOM_OWNER);
      if (r.roomType !== 'group')
        throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, '类型不匹配');
      if (r.status !== 'open' && r.status !== 'full')
        throw new BusinessException(
          ERROR_CODES.ROOM_EXPIRED,
          '已结束/已取消的房间不能编辑',
        );
      if (dto.meetTime !== undefined) this.validateMeetTime(dto.meetTime);
      if (dto.totalNum !== undefined && dto.totalNum < r.currentNum)
        throw new BusinessException(
          ERROR_CODES.VALIDATION_FAILED,
          `新人数不能小于已加入(${r.currentNum})`,
        );

      const roomPatch: any = {};
      if (dto.title !== undefined) roomPatch.title = dto.title;
      if (dto.content !== undefined) roomPatch.content = dto.content;
      if (dto.totalNum !== undefined) roomPatch.totalNum = dto.totalNum;
      if (dto.meetTime !== undefined)
        roomPatch.meetTime = dto.meetTime ? new Date(dto.meetTime) : null;
      if (dto.meetLocation !== undefined) roomPatch.meetLocation = dto.meetLocation;
      if (dto.tags !== undefined) roomPatch.tags = joinTags(dto.tags);
      if (Object.keys(roomPatch).length)
        await tx.matchRoom.update({ where: { roomId }, data: roomPatch });

      const gP: any = {};
      if (dto.courseName !== undefined) gP.courseName = dto.courseName;
      if (dto.groupTarget !== undefined) gP.groupTarget = dto.groupTarget;
      if (dto.requireSkill !== undefined) gP.requireSkill = dto.requireSkill;
      if (Object.keys(gP).length)
        await tx.groupRoom.update({ where: { roomId }, data: gP });

      const after = await tx.matchRoom.findUnique({ where: { roomId } });
      if (after!.status === 'full' && after!.currentNum < after!.totalNum)
        await tx.matchRoom.update({
          where: { roomId },
          data: { status: 'open' },
        });
      if (after!.status === 'open' && after!.currentNum >= after!.totalNum)
        await tx.matchRoom.update({
          where: { roomId },
          data: { status: 'full' },
        });

      return { roomId };
    });
  }

  // ============== POST /rooms/:type/match-candidates ==============
  // #5 强化推荐：在原 textSim/timeSim 基础上叠加 用户级别 信号：
  //   · 标签 Jaccard 重叠
  //   · 同学院/同专业加成
  //   · 与房主历史共同房间次数加成
  //   · 房主历史平均星级加成
  // 同时返回 matched_reasons[] 让前端展示"为什么推荐你"
  async matchCandidates(
    type: 'carpool' | 'entertainment' | 'group',
    dto: any,
    currentUserId?: string,
  ) {
    const now = new Date();

    // 候选 + 房主信息（用于同校/评分加成）
    const rooms = await this.prisma.matchRoom.findMany({
      where: {
        roomType: type,
        status: 'open',
        OR: [{ meetTime: null }, { meetTime: { gt: now } }],
      },
      include: {
        carpool: true,
        entertainment: true,
        group: true,
        creator: {
          select: { userId: true, username: true, college: true, major: true },
        },
        // toCarpoolListItem / toEntertainmentListItem 需要 members 信息
        members: {
          where: { status: 'approved' },
          include: { user: { select: { userId: true, username: true } } },
        },
      },
      orderBy: [{ createTime: 'desc' }],
      take: 30,
    });

    // 当前用户画像（一次性查询）
    const me = currentUserId
      ? await this.prisma.user.findUnique({
          where: { userId: currentUserId },
          select: { tags: true, college: true, major: true },
        })
      : null;
    const myTags = new Set(splitTags(me?.tags ?? null).map((t) => t.toLowerCase()));

    // 历史搭档亲密度 —— 一次性 group by creator_id
    // 计算我在 finished 房间中，每个房主作为合作者出现了几次
    let affinity = new Map<string, number>();
    if (currentUserId && rooms.length > 0) {
      const creatorIds = Array.from(new Set(rooms.map((r) => r.creator.userId)))
        .filter((id) => id !== currentUserId);
      if (creatorIds.length > 0) {
        const rows = await this.prisma.$queryRaw<
          { creatorId: string; cnt: bigint }[]
        >`
          SELECT mm2.user_id AS creatorId, COUNT(DISTINCT mm1.room_id) AS cnt
          FROM Match_Member mm1
          JOIN Match_Member mm2 ON mm1.room_id = mm2.room_id
          JOIN Match_Room   r   ON r.room_id  = mm1.room_id
          WHERE mm1.user_id = ${currentUserId}
            AND mm1.status = 'approved'
            AND mm2.status = 'approved'
            AND mm2.user_id IN (${Prisma.join(creatorIds)})
            AND r.status = 'finished'
          GROUP BY mm2.user_id
        `;
        affinity = new Map(rows.map((r) => [r.creatorId, Number(r.cnt)]));
      }
    }

    // 房主平均星级 —— 一次性 group by toMember.userId
    let ratingMap = new Map<string, number>();
    if (rooms.length > 0) {
      const creatorIds = Array.from(new Set(rooms.map((r) => r.creator.userId)));
      const ratings = await this.prisma.matchEvaluate.groupBy({
        by: ['toMemberId'],
        where: { toMember: { userId: { in: creatorIds } } },
        _avg: { score: true },
        _count: { score: true },
      });
      // toMemberId -> userId 反查
      const memberIds = ratings.map((r) => r.toMemberId);
      if (memberIds.length > 0) {
        const members = await this.prisma.matchMember.findMany({
          where: { memberId: { in: memberIds } },
          select: { memberId: true, userId: true },
        });
        const m2u = new Map(members.map((m) => [m.memberId, m.userId]));
        // 聚合每个 user 的均分
        const agg = new Map<string, { sum: number; cnt: number }>();
        for (const r of ratings) {
          const uid = m2u.get(r.toMemberId);
          if (!uid || !r._avg.score) continue;
          const prev = agg.get(uid) ?? { sum: 0, cnt: 0 };
          prev.sum += r._avg.score * (r._count.score || 1);
          prev.cnt += r._count.score || 1;
          agg.set(uid, prev);
        }
        ratingMap = new Map(
          Array.from(agg.entries()).map(([uid, v]) => [
            uid,
            v.cnt ? v.sum / v.cnt : 0,
          ]),
        );
      }
    }

    // 评分 + 收集理由
    const scored = rooms
      .map((r) => {
        const { score, reasons } = this.scoreWithReasons(type, r, dto, {
          myTags,
          myCollege: me?.college ?? null,
          myMajor: me?.major ?? null,
          affinityCount: affinity.get(r.creator.userId) ?? 0,
          creatorRating: ratingMap.get(r.creator.userId) ?? 0,
          isSelf: r.creator.userId === currentUserId,
        });
        return { r, score, reasons };
      })
      .filter((x) => x.score >= 0.35 && !x.r.creator.userId.startsWith('__never'))
      // 不推荐自己创建的房间
      .filter((x) => x.r.creator.userId !== currentUserId)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const list = scored.map(({ r, score, reasons }) => {
      const item =
        type === 'carpool'
          ? this.toCarpoolListItem(r)
          : type === 'entertainment'
            ? this.toEntertainmentListItem(r)
            : this.toGroupListItem(r);
      return {
        ...item,
        score: Math.round(score * 100),
        matchedReasons: reasons,
      };
    });
    return { list };
  }

  // ---- 增强相似度打分 ----
  private scoreWithReasons(
    type: 'carpool' | 'entertainment' | 'group',
    r: any,
    dto: any,
    ctx: {
      myTags: Set<string>;
      myCollege: string | null;
      myMajor: string | null;
      affinityCount: number;
      creatorRating: number;
      isSelf: boolean;
    },
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];

    // 基础（按类型不同）
    let base = 0;
    if (type === 'carpool') {
      const s1 = this.textSim(r.carpool?.startLocation, dto.startLocation);
      const s2 = this.textSim(r.carpool?.endLocation, dto.endLocation);
      const s3 = this.timeSim(r.meetTime, dto.meetTime);
      base = 0.30 * s1 + 0.30 * s2 + 0.25 * s3;
      if (s1 >= 0.6) reasons.push('出发地接近');
      if (s2 >= 0.6) reasons.push('目的地一致');
      if (s3 >= 0.8) reasons.push('时间几乎相同');
      else if (s3 >= 0.5) reasons.push('时间接近');
    } else if (type === 'entertainment') {
      const t = dto.entType && r.entertainment?.entType === dto.entType ? 1 : 0;
      const lo = this.textSim(r.meetLocation, dto.meetLocation || dto.title);
      const ti = this.timeSim(r.meetTime, dto.meetTime);
      base = 0.30 * t + 0.20 * lo + 0.20 * ti;
      if (t === 1) reasons.push(`同为「${dto.entType}」`);
      if (lo >= 0.6) reasons.push('地点接近');
      if (ti >= 0.5) reasons.push('时间接近');
    } else {
      const c = Math.max(
        this.textSim(r.group?.courseName, dto.courseName),
        this.textSim(r.title, dto.courseName),
        this.textSim(r.content, dto.courseName),
      );
      base = 0.70 * c;
      if (c >= 0.6) reasons.push('课程匹配');
    }

    // 标签 Jaccard（房间.tags ∩ 我.tags）
    const roomTags = splitTags(r.tags).map((t) => t.toLowerCase());
    let tagBonus = 0;
    if (ctx.myTags.size && roomTags.length) {
      let inter = 0;
      const union = new Set<string>(ctx.myTags);
      for (const t of roomTags) {
        if (ctx.myTags.has(t)) inter++;
        union.add(t);
      }
      const jacc = union.size > 0 ? inter / union.size : 0;
      tagBonus = Math.min(jacc, 1) * 0.10;
      if (inter >= 2) reasons.push(`${inter} 个标签重合`);
      else if (inter === 1) reasons.push('1 个标签重合');
    }

    // 同学院 / 同专业
    let schoolBonus = 0;
    if (ctx.myCollege && r.creator.college === ctx.myCollege) {
      schoolBonus += 0.07;
      reasons.push('同学院');
      if (ctx.myMajor && r.creator.major === ctx.myMajor) {
        schoolBonus += 0.03; // 同专业再加
        reasons.push('同专业');
      }
    }

    // 历史搭档加成（log-scale 防止刷量）
    let affinityBonus = 0;
    if (ctx.affinityCount > 0) {
      affinityBonus = Math.min(0.10, 0.04 * Math.log2(ctx.affinityCount + 1));
      reasons.push(`曾合作 ${ctx.affinityCount} 次`);
    }

    // 房主评分加成
    let ratingBonus = 0;
    if (ctx.creatorRating >= 4.5) {
      ratingBonus = 0.07;
      reasons.push(`房主 ${ctx.creatorRating.toFixed(1)} 星好评`);
    } else if (ctx.creatorRating >= 4.0) {
      ratingBonus = 0.04;
    }

    const total = Math.min(
      1,
      base + tagBonus + schoolBonus + affinityBonus + ratingBonus,
    );
    return { score: total, reasons };
  }

  /** 文本相似度：归一化 + 子串包含强加成 + 二元组 Jaccard */
  private textSim(a?: string | null, b?: string | null): number {
    if (!a || !b) return 0;
    const x = a.toLowerCase().trim();
    const y = b.toLowerCase().trim();
    if (!x || !y) return 0;
    if (x === y) return 1;
    if (x.includes(y) || y.includes(x))
      return 0.85 + 0.15 * (Math.min(x.length, y.length) / Math.max(x.length, y.length));
    const bigrams = (s: string) => {
      const set = new Set<string>();
      for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
      return set;
    };
    const A = bigrams(x);
    const B = bigrams(y);
    if (A.size === 0 || B.size === 0) return 0;
    let inter = 0;
    A.forEach((g) => B.has(g) && inter++);
    return inter / (A.size + B.size - inter);
  }

  /** 时间相似度：完全相同 1.0；偏差越大越低；>240min → 0 */
  private timeSim(a?: Date | string | null, b?: Date | string | null): number {
    if (!a || !b) return 0;
    const t1 = (a instanceof Date ? a : new Date(a)).getTime();
    const t2 = (b instanceof Date ? b : new Date(b)).getTime();
    if (isNaN(t1) || isNaN(t2)) return 0;
    const diffMin = Math.abs(t1 - t2) / 60000;
    if (diffMin <= 30) return 1;
    if (diffMin >= 240) return 0;
    return 1 - (diffMin - 30) / 210;
  }

  // ====================================================================
  // 私有辅助
  // ====================================================================

  private validateMeetTime(meetTime?: string) {
    if (!meetTime) return;
    const t = new Date(meetTime).getTime();
    if (isNaN(t)) {
      throw new BusinessException(
        ERROR_CODES.VALIDATION_FAILED,
        'meetTime 格式不合法',
      );
    }
    if (t < Date.now() - 60_000) {
      // 留 1 分钟容差
      throw new BusinessException(
        ERROR_CODES.VALIDATION_FAILED,
        'meetTime 必须晚于当前时间',
      );
    }
  }

  private buildListWhere(roomType: RoomType): Prisma.MatchRoomWhereInput {
    return {
      roomType,
      status: 'open',
      OR: [{ meetTime: null }, { meetTime: { gt: new Date() } }],
    };
  }

  private buildOrderBy(
    sort: 'time' | 'hot' = 'time',
  ): Prisma.MatchRoomOrderByWithRelationInput[] {
    if (sort === 'hot') {
      // 热度近似:currentNum 倒序 + meetTime 升序;currentNum/totalNum 真比例排序需 raw,本期先简化
      return [{ currentNum: 'desc' }, { meetTime: 'asc' }];
    }
    return [{ meetTime: 'asc' }, { createTime: 'asc' }];
  }

  private skip(page: number = 1, pageSize: number = 20): number {
    return (page - 1) * pageSize;
  }

  private toCreateResp(room: {
    roomId: number;
    roomType: string;
    status: string;
    currentNum: number;
    createTime: Date;
  }) {
    return {
      roomId: room.roomId,
      roomType: room.roomType,
      status: room.status,
      currentNum: room.currentNum,
      createTime: room.createTime.toISOString(),
    };
  }

  private toCarpoolListItem(r: any) {
    const seats: any[] = [];
    for (let i = 0; i < r.totalNum; i++) {
      if (i < r.members.length) {
        const u = r.members[i].user;
        const av = makeAvatar(u.username);
        seats.push({ idx: i, empty: false, avatarText: av.text, avatarColor: av.color });
      } else {
        seats.push({ idx: i, empty: true });
      }
    }
    return {
      roomId: r.roomId,
      roomType: 'carpool',
      title: r.title,
      startLocation: r.carpool?.startLocation,
      endLocation: r.carpool?.endLocation,
      carType: r.carpool?.carType,
      costSplit: r.carpool?.costSplit ? Number(r.carpool.costSplit) : null,
      meetTime: r.meetTime?.toISOString() ?? null,
      meetTimeLabel: r.meetTime ? formatMeet(r.meetTime) : '',
      currentNum: r.currentNum,
      totalNum: r.totalNum,
      status: r.status,
      seats,
    };
  }

  private toEntertainmentListItem(r: any) {
    const cover = this.pickEntertainmentCover(r.entertainment?.entType);
    const av = makeAvatar(r.creator.username);
    return {
      roomId: r.roomId,
      roomType: 'entertainment',
      entType: r.entertainment?.entType,
      title: r.title,
      coverColor: cover,
      coverColor2: lightenColor(cover),
      coverEmoji: this.pickEntertainmentEmoji(r.entertainment?.entType),
      cost: r.entertainment?.cost ? Number(r.entertainment.cost) : null,
      meetTime: r.meetTime?.toISOString() ?? null,
      meetTimeLabel: r.meetTime ? formatMeet(r.meetTime) : '',
      meetLocation: r.meetLocation,
      tags: splitTags(r.tags),
      currentNum: r.currentNum,
      totalNum: r.totalNum,
      status: r.status,
      creator: {
        userId: r.creator.userId,
        username: r.creator.username,
        avatarText: av.text,
        avatarColor: av.color,
      },
    };
  }

  private toGroupListItem(r: any) {
    return {
      roomId: r.roomId,
      roomType: 'group',
      courseName: r.group?.courseName,
      title: r.title,
      content: r.content,
      groupTarget: r.group?.groupTarget,
      requireSkill: r.group?.requireSkill,
      color: pickStudyBadgeColor(r.group?.courseName),
      badge: pickStudyBadge(r.group?.courseName),
      meetTime: r.meetTime?.toISOString() ?? null,
      meetTimeLabel: r.meetTime ? formatMeet(r.meetTime) : '',
      meetLocation: r.meetLocation,
      tags: splitTags(r.tags),
      currentNum: r.currentNum,
      totalNum: r.totalNum,
      status: r.status,
    };
  }

  private toDetailRoom(r: any) {
    const base = {
      roomId: r.roomId,
      roomType: r.roomType,
      title: r.title,
      content: r.content,
      totalNum: r.totalNum,
      currentNum: r.currentNum,
      meetTime: r.meetTime?.toISOString() ?? null,
      meetTimeLabel: r.meetTime ? formatMeet(r.meetTime) : '',
      meetLocation: r.meetLocation,
      status: r.status,
      joinRule: r.joinRule,
      tags: splitTags(r.tags),
      accent: ROOM_ACCENT[r.roomType as RoomType] ?? '#999999',
      accentLabel: ROOM_ACCENT_LABEL[r.roomType as RoomType] ?? r.roomType,
      createTime: r.createTime.toISOString(),
    };
    if (r.roomType === 'carpool' && r.carpool) {
      return {
        ...base,
        startLocation: r.carpool.startLocation,
        endLocation: r.carpool.endLocation,
        carType: r.carpool.carType,
        costSplit: r.carpool.costSplit ? Number(r.carpool.costSplit) : null,
      };
    }
    if (r.roomType === 'entertainment' && r.entertainment) {
      return {
        ...base,
        entType: r.entertainment.entType,
        cost: r.entertainment.cost ? Number(r.entertainment.cost) : null,
        equipment: r.entertainment.equipment,
      };
    }
    if (r.roomType === 'group' && r.group) {
      return {
        ...base,
        courseName: r.group.courseName,
        groupTarget: r.group.groupTarget,
        requireSkill: r.group.requireSkill,
        badge: pickStudyBadge(r.group.courseName),
      };
    }
    return base;
  }

  private pickEntertainmentCover(entType?: string): string {
    const map: Record<string, string> = {
      演唱会: '#FF6B95',
      剧本杀: '#9C5BA0',
      KTV: '#FF8E53',
      密室: '#FF2D55',
      观影: '#0A84FF',
      展览: '#BF5AF2',
    };
    return entType ? map[entType] ?? '#C8567E' : '#C8567E';
  }

  private pickEntertainmentEmoji(entType?: string): string {
    const map: Record<string, string> = {
      演唱会: '🎤',
      剧本杀: '🎭',
      KTV: '🎤',
      密室: '🔐',
      观影: '🎬',
      展览: '🌌',
    };
    return entType ? map[entType] ?? '🎉' : '🎉';
  }
}
