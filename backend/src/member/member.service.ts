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
import { makeAvatar } from '../common/utils/avatar.util';
import { ApplyMemberDto } from './dto/apply-member.dto';
import { AuditApplicationDto } from './dto/audit-application.dto';
import { ListMembersQueryDto } from './dto/list-members.dto';
import { ListMyApplicationsQueryDto } from './dto/list-my-applications.dto';
import { ListMyRoomsQueryDto } from './dto/list-my-rooms.dto';

const STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '已加入',
  rejected: '已婉拒',
  left: '已退出',
};

@Injectable()
export class MemberService {
  constructor(private readonly prisma: PrismaService) {}

  // ============== POST /rooms/:roomId/members ==============
  async apply(roomId: number, userId: string, dto: ApplyMemberDto) {
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.matchRoom.findUnique({ where: { roomId } });
      if (!room) {
        throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');
      }
      if (room.creatorId === userId) {
        throw new BusinessException(
          ERROR_CODES.DUPLICATE_APPLY,
          '你是房主,无需申请',
        );
      }
      if (room.status === 'cancelled' || room.status === 'finished') {
        throw new BusinessException(ERROR_CODES.ROOM_EXPIRED);
      }
      if (room.status === 'full') {
        throw new BusinessException(ERROR_CODES.ROOM_FULL);
      }
      if (room.currentNum >= room.totalNum) {
        // 兜底,理论上 status='full' 已拦
        throw new BusinessException(ERROR_CODES.ROOM_FULL);
      }
      // joinRule = password 校验
      if (room.joinRule === 'password') {
        if (!dto.joinPassword || dto.joinPassword !== room.joinPassword) {
          throw new BusinessException(ERROR_CODES.WRONG_JOIN_PASSWORD);
        }
      }

      // DB 有 UNIQUE(room_id,user_id),所以存在即 UPDATE,不存在即 CREATE
      const existing = await tx.matchMember.findUnique({
        where: { roomId_userId: { roomId, userId } } as any,
      });

      // 决定新的 status
      const willBeApproved = room.joinRule !== 'audit'; // direct + password 通过都直接 approved
      const newStatus = willBeApproved ? 'approved' : 'pending';

      if (existing) {
        // 仅当历史是 rejected / left 时允许再申请;approved / pending 重复申请拒绝
        if (existing.status === 'approved' || existing.status === 'pending') {
          throw new BusinessException(ERROR_CODES.DUPLICATE_APPLY);
        }
        await tx.matchMember.update({
          where: { memberId: existing.memberId },
          data: { status: newStatus, joinTime: new Date() },
        });
      } else {
        await tx.matchMember.create({
          data: { roomId, userId, status: newStatus },
        });
      }

      const finalMember = await tx.matchMember.findUnique({
        where: { roomId_userId: { roomId, userId } } as any,
      });

      // 如果是 approved,递增 currentNum,可能触发 full
      if (willBeApproved) {
        const updated = await tx.matchRoom.update({
          where: { roomId },
          data: { currentNum: { increment: 1 } },
        });
        if (updated.currentNum >= updated.totalNum) {
          await tx.matchRoom.update({
            where: { roomId },
            data: { status: 'full' },
          });
        }
      }

      return {
        memberId: finalMember!.memberId,
        status: finalMember!.status,
      };
    });
  }

  // ============== GET /rooms/:roomId/members ==============
  async listMembers(roomId: number, query: ListMembersQueryDto) {
    const room = await this.prisma.matchRoom.findUnique({
      where: { roomId },
      select: { creatorId: true },
    });
    if (!room) throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');

    const where: Prisma.MatchMemberWhereInput = { roomId };
    if (query.status) where.status = query.status;

    const members = await this.prisma.matchMember.findMany({
      where,
      include: { user: { select: { userId: true, username: true } } },
      orderBy: { joinTime: 'asc' },
    });

    return {
      list: members.map((m) => {
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
    };
  }

  // ============== GET /rooms/:roomId/applications ==============
  async listApplications(roomId: number, currentUserId: string) {
    const room = await this.prisma.matchRoom.findUnique({
      where: { roomId },
      select: { creatorId: true },
    });
    if (!room) throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');
    if (room.creatorId !== currentUserId) {
      throw new BusinessException(ERROR_CODES.NOT_ROOM_OWNER);
    }

    const apps = await this.prisma.matchMember.findMany({
      where: { roomId, status: 'pending' },
      include: { user: { select: { userId: true, username: true } } },
      orderBy: { joinTime: 'asc' },
    });

    // 给每个申请人补上当前评分
    const list = await Promise.all(
      apps.map(async (m) => {
        const agg = await this.prisma.matchEvaluate.aggregate({
          where: { toMember: { userId: m.userId } },
          _avg: { score: true },
          _count: { score: true },
        });
        const av = makeAvatar(m.user.username);
        return {
          memberId: m.memberId,
          userId: m.userId,
          username: m.user.username,
          avatarText: av.text,
          avatarColor: av.color,
          joinTime: m.joinTime.toISOString(),
          rating:
            agg._count.score > 0
              ? Math.round((agg._avg.score ?? 0) * 10) / 10
              : 0,
          ratingCount: agg._count.score,
        };
      }),
    );

    return { list };
  }

  // ============== PATCH /rooms/:roomId/applications/:memberId ==============
  async audit(
    roomId: number,
    memberId: number,
    currentUserId: string,
    dto: AuditApplicationDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.matchRoom.findUnique({ where: { roomId } });
      if (!room) {
        throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');
      }
      if (room.creatorId !== currentUserId) {
        throw new BusinessException(ERROR_CODES.NOT_ROOM_OWNER);
      }
      if (room.status !== 'open') {
        throw new BusinessException(
          ERROR_CODES.ROOM_EXPIRED,
          '当前状态不可审批',
        );
      }

      const m = await tx.matchMember.findUnique({ where: { memberId } });
      if (!m || m.roomId !== roomId) {
        throw new BusinessException(ERROR_CODES.NOT_FOUND, '申请不存在');
      }
      if (m.status !== 'pending') {
        throw new BusinessException(
          ERROR_CODES.DUPLICATE_APPLY,
          '该申请已被处理',
        );
      }

      if (dto.action === 'approve') {
        if (room.currentNum >= room.totalNum) {
          throw new BusinessException(ERROR_CODES.ROOM_FULL);
        }
        await tx.matchMember.update({
          where: { memberId },
          data: { status: 'approved' },
        });
        const updated = await tx.matchRoom.update({
          where: { roomId },
          data: { currentNum: { increment: 1 } },
        });
        if (updated.currentNum >= updated.totalNum) {
          await tx.matchRoom.update({
            where: { roomId },
            data: { status: 'full' },
          });
        }
        return { memberId, status: 'approved' };
      }

      // reject
      await tx.matchMember.update({
        where: { memberId },
        data: { status: 'rejected' },
      });
      return { memberId, status: 'rejected' };
    });
  }

  // ============== DELETE /rooms/:roomId/members/me ==============
  async leave(roomId: number, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.matchRoom.findUnique({ where: { roomId } });
      if (!room) {
        throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');
      }
      if (room.creatorId === userId) {
        throw new BusinessException(
          ERROR_CODES.FORBIDDEN,
          '房主不可退出,应解散房间(/cancel)',
        );
      }
      const m = await tx.matchMember.findUnique({
        where: { roomId_userId: { roomId, userId } } as any,
      });
      if (!m || m.status !== 'approved') {
        throw new BusinessException(
          ERROR_CODES.NOT_FOUND,
          '你不在该房间或不是已加入状态',
        );
      }
      await tx.matchMember.update({
        where: { memberId: m.memberId },
        data: { status: 'left' },
      });
      const updated = await tx.matchRoom.update({
        where: { roomId },
        data: { currentNum: { decrement: 1 } },
      });
      // 如果原本是 full,人少了 → 回滚为 open
      if (room.status === 'full' && updated.currentNum < updated.totalNum) {
        await tx.matchRoom.update({
          where: { roomId },
          data: { status: 'open' },
        });
      }
      return { ok: true };
    });
  }

  // ============== GET /users/me/applications ==============
  async listMyApplications(userId: string, query: ListMyApplicationsQueryDto) {
    const where: Prisma.MatchMemberWhereInput = { userId };
    if (query.status) where.status = query.status;

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [total, rows] = await Promise.all([
      this.prisma.matchMember.count({ where }),
      this.prisma.matchMember.findMany({
        where,
        include: {
          room: {
            select: {
              roomId: true,
              roomType: true,
              title: true,
              creatorId: true,
            },
          },
        },
        orderBy: { joinTime: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const list = rows.map((m) => {
      const t = m.room.roomType as RoomType;
      return {
        memberId: m.memberId,
        roomId: m.room.roomId,
        roomType: m.room.roomType,
        title: m.room.title,
        creatorId: m.room.creatorId,
        accent: ROOM_ACCENT[t] ?? '#999999',
        accentLabel: ROOM_ACCENT_LABEL[t] ?? m.room.roomType,
        status: m.status,
        statusLabel: STATUS_LABELS[m.status] ?? m.status,
        joinTime: m.joinTime.toISOString(),
      };
    });

    return { list, total, page, pageSize };
  }

  // ============== GET /users/me/rooms ==============
  async listMyRooms(userId: string, query: ListMyRoomsQueryDto) {
    const phase = query.phase ?? 'ongoing';
    const roomStatusIn =
      phase === 'completed' ? ['finished'] : ['open', 'full'];
    const where: Prisma.MatchMemberWhereInput = {
      userId,
      status: 'approved',
      room: { status: { in: roomStatusIn } },
    };
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [total, rows] = await Promise.all([
      this.prisma.matchMember.count({ where }),
      this.prisma.matchMember.findMany({
        where,
        include: { room: true },
        orderBy: { room: { meetTime: 'asc' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const list = rows.map((m) => {
      const r = m.room;
      const t = r.roomType as RoomType;
      return {
        roomId: r.roomId,
        roomType: r.roomType,
        role: r.creatorId === userId ? 'owner' : 'member',
        title: r.title,
        accent: ROOM_ACCENT[t] ?? '#999999',
        accentLabel: ROOM_ACCENT_LABEL[t] ?? r.roomType,
        meetTime: r.meetTime?.toISOString() ?? null,
        status: r.status,
      };
    });

    return { list, total, page, pageSize };
  }
}
