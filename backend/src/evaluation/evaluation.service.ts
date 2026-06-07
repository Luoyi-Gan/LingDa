import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';

@Injectable()
export class EvaluationService {
  constructor(private readonly prisma: PrismaService) {}

  // ============== POST /rooms/:roomId/evaluations ==============
  async create(
    roomId: number,
    currentUserId: string,
    dto: CreateEvaluationDto,
  ) {
    // 0. 应用层 not-self 校验(DB CHECK 被移到应用层)
    if (dto.targetUserId === currentUserId) {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '不能评价自己');
    }

    // 1. 房间必须存在且 finished
    const room = await this.prisma.matchRoom.findUnique({ where: { roomId } });
    if (!room) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');
    }
    if (room.status !== 'finished') {
      throw new BusinessException(ERROR_CODES.ROOM_NOT_COMPLETED);
    }

    // 2. 把 (room, user) 反查成 member_id
    const [fromMember, toMember] = await Promise.all([
      this.prisma.matchMember.findUnique({
        where: { roomId_userId: { roomId, userId: currentUserId } } as any,
      }),
      this.prisma.matchMember.findUnique({
        where: { roomId_userId: { roomId, userId: dto.targetUserId } } as any,
      }),
    ]);

    if (!fromMember || fromMember.status !== 'approved') {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '你不是该房间已加入成员');
    }
    if (!toMember || toMember.status !== 'approved') {
      throw new BusinessException(
        ERROR_CODES.FORBIDDEN,
        '目标不是该房间已加入成员',
      );
    }

    // 3. 写入 —— DB UNIQUE(from, to) 兜底防重
    try {
      const ev = await this.prisma.matchEvaluate.create({
        data: {
          fromMemberId: fromMember.memberId,
          toMemberId: toMember.memberId,
          score: dto.score,
          content: dto.content ?? null,
        },
      });
      return { evaluateId: ev.evaluateId };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new BusinessException(ERROR_CODES.DUPLICATE_EVALUATION);
        }
      }
      throw err;
    }
  }

  // ============== GET /rooms/:roomId/evaluations ==============
  async listInRoom(roomId: number) {
    const room = await this.prisma.matchRoom.findUnique({
      where: { roomId },
      select: { roomId: true },
    });
    if (!room) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');
    }

    // fromMember 在该房间(toMember 因 DB trigger 必同房间)
    const list = await this.prisma.matchEvaluate.findMany({
      where: { fromMember: { roomId } },
      include: {
        fromMember: {
          include: { user: { select: { userId: true, username: true } } },
        },
        toMember: {
          include: { user: { select: { userId: true, username: true } } },
        },
      },
      orderBy: { createTime: 'desc' },
    });

    return {
      list: list.map((e) => ({
        evaluateId: e.evaluateId,
        fromUserId: e.fromMember.user.userId,
        fromUsername: e.fromMember.user.username,
        targetUserId: e.toMember.user.userId,
        targetUsername: e.toMember.user.username,
        score: e.score,
        content: e.content,
        createTime: e.createTime.toISOString(),
      })),
    };
  }
}
