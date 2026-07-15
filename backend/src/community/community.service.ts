import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import { makeAvatar } from '../common/utils/avatar.util';
import {
  AdminContentActionDto,
  CreateAnnouncementDto,
  CreateCommentDto,
  CreatePostDto,
  CreateVerificationDto,
  FavoriteDto,
  ListPostsQueryDto,
  ReviewDto,
  UpdateAnnouncementDto,
} from './dto/community.dto';
import { ModerationService } from './moderation.service';

const authorSelect = {
  userId: true,
  username: true,
  college: true,
  major: true,
  grade: true,
  accountRole: true,
  verificationStatus: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
  ) {}

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new BusinessException(ERROR_CODES.NOT_FOUND, '用户不存在');
    if (user.accountStatus !== 'normal') {
      throw new BusinessException(ERROR_CODES.ACCOUNT_RESTRICTED);
    }
    return user;
  }

  private async requireAdmin(userId: string) {
    const user = await this.requireUser(userId);
    if (user.accountRole !== 'admin') {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '仅管理员可执行此操作');
    }
    return user;
  }

  private presentAuthor(author: any) {
    const avatar = makeAvatar(author.username);
    return { ...author, avatarText: avatar.text, avatarColor: avatar.color };
  }

  private presentPost(post: any, userId: string) {
    return {
      ...post,
      author: this.presentAuthor(post.author),
      images: Array.isArray(post.images) ? post.images : [],
      likeCount: post._count?.likes ?? 0,
      commentCount: post._count?.comments ?? 0,
      liked: post.likes?.some((like: any) => like.userId === userId) ?? false,
      favorited: post.favorites?.length > 0,
      _count: undefined,
      likes: undefined,
      favorites: undefined,
    };
  }

  private async pushModerationNotice(
    userId: string,
    kind: 'post' | 'comment' | 'verification',
    targetId: number,
    action: string,
    title: string,
    note?: string,
  ) {
    await this.prisma.notification.create({
      data: {
        userId,
        type: kind === 'verification' ? 'verification_result' : 'content_moderation',
        payload: {
          kind,
          targetId,
          action,
          title,
          note: note || null,
          message: action === 'approve' || action === 'restore'
            ? `${title}已通过平台审核`
            : `${title}未通过审核或已被平台下架`,
        },
      },
    });
  }

  async createPost(userId: string, dto: CreatePostDto) {
    const user = await this.requireUser(userId);
    if (user.verificationStatus !== 'verified' && user.accountRole === 'student') {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '完成学生认证后才可发布帖子');
    }
    const result = this.moderation.inspect(dto.title, dto.content);
    const now = new Date();
    const post = await this.prisma.communityPost.create({
      data: {
        authorId: userId,
        category: dto.category,
        title: dto.title.trim(),
        content: dto.content.trim(),
        images: dto.images ?? [],
        status: result.status,
        riskLevel: result.riskLevel,
        reviewReason: result.reason,
        moderationMode: result.status === 'published' ? 'automatic' : 'manual',
        publishedAt: result.status === 'published' ? now : null,
      },
    });
    return {
      postId: post.postId,
      status: post.status,
      moderation: {
        mode: post.moderationMode,
        riskLevel: post.riskLevel,
        reason: post.reviewReason,
      },
    };
  }

  async listPosts(userId: string, query: ListPostsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CommunityPostWhereInput = {
      status: 'published',
      ...(query.category ? { category: query.category } : {}),
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword } },
              { content: { contains: query.keyword } },
            ],
          }
        : {}),
    };
    const [list, total] = await this.prisma.$transaction([
      this.prisma.communityPost.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { postId: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: { select: authorSelect },
          _count: { select: { likes: true, comments: { where: { status: 'published' } } } },
          likes: { where: { userId }, select: { userId: true } },
        },
      }),
      this.prisma.communityPost.count({ where }),
    ]);
    const favorites = await this.prisma.favorite.findMany({
      where: { userId, targetType: 'post', targetId: { in: list.map((p) => p.postId) } },
      select: { targetId: true },
    });
    const favoriteIds = new Set(favorites.map((f) => f.targetId));
    return {
      list: list.map((p) => this.presentPost({ ...p, favorites: favoriteIds.has(p.postId) ? [1] : [] }, userId)),
      page,
      pageSize,
      total,
    };
  }

  async getPost(userId: string, postId: number) {
    const post = await this.prisma.communityPost.findFirst({
      where: {
        postId,
        status: { not: 'deleted' },
        OR: [{ status: 'published' }, { authorId: userId }],
      },
      include: {
        author: { select: authorSelect },
        comments: {
          where: { status: 'published' },
          orderBy: { createTime: 'asc' },
          include: { author: { select: authorSelect } },
        },
        likes: { where: { userId }, select: { userId: true } },
        _count: { select: { likes: true, comments: { where: { status: 'published' } } } },
      },
    });
    if (!post) throw new BusinessException(ERROR_CODES.NOT_FOUND, '帖子不存在');
    if (post.status === 'published') {
      await this.prisma.communityPost.update({ where: { postId }, data: { viewCount: { increment: 1 } } });
    }
    const favorite = await this.prisma.favorite.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: 'post', targetId: postId } },
    });
    return this.presentPost({
      ...post,
      viewCount: post.viewCount + (post.status === 'published' ? 1 : 0),
      comments: post.comments.map((c) => ({ ...c, author: this.presentAuthor(c.author) })),
      favorites: favorite ? [favorite] : [],
    }, userId);
  }

  async deletePost(userId: string, postId: number) {
    const user = await this.requireUser(userId);
    const post = await this.prisma.communityPost.findUnique({ where: { postId } });
    if (!post || post.status === 'deleted') {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '帖子不存在');
    }
    const isAdmin = user.accountRole === 'admin';
    if (post.authorId !== userId && !isAdmin) {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '只能删除自己发布的帖子');
    }

    await this.prisma.$transaction([
      this.prisma.communityPost.update({
        where: { postId },
        data: {
          status: 'deleted',
          reviewReason: isAdmin && post.authorId !== userId ? '管理员删除' : '作者主动删除',
          reviewedAt: new Date(),
          reviewerId: isAdmin ? userId : null,
        },
      }),
      this.prisma.favorite.deleteMany({
        where: { targetType: 'post', targetId: postId },
      }),
    ]);

    if (isAdmin && post.authorId !== userId) {
      await this.pushModerationNotice(post.authorId, 'post', postId, 'hide', `帖子《${post.title}》`, '管理员删除');
    }
    return { deleted: true, postId };
  }

  async toggleLike(userId: string, postId: number) {
    await this.requirePublishedPost(postId);
    const key = { postId_userId: { postId, userId } };
    const existing = await this.prisma.postLike.findUnique({ where: key });
    if (existing) await this.prisma.postLike.delete({ where: key });
    else await this.prisma.postLike.create({ data: { postId, userId } });
    return { liked: !existing, likeCount: await this.prisma.postLike.count({ where: { postId } }) };
  }

  async createComment(userId: string, postId: number, dto: CreateCommentDto) {
    await this.requirePublishedPost(postId);
    const result = this.moderation.inspect('', dto.content);
    const comment = await this.prisma.postComment.create({
      data: {
        postId,
        authorId: userId,
        content: dto.content.trim(),
        status: result.status,
        moderationMode: result.status === 'published' ? 'automatic' : 'manual',
        riskLevel: result.riskLevel,
        reviewReason: result.reason,
      },
    });
    return { commentId: comment.commentId, status: comment.status, reviewReason: result.reason };
  }

  private async requirePublishedPost(postId: number) {
    const post = await this.prisma.communityPost.findFirst({ where: { postId, status: 'published' } });
    if (!post) throw new BusinessException(ERROR_CODES.NOT_FOUND, '帖子不存在');
    return post;
  }

  async addFavorite(userId: string, dto: FavoriteDto) {
    if (dto.targetType === 'post') await this.requirePublishedPost(dto.targetId);
    else {
      const room = await this.prisma.matchRoom.findUnique({ where: { roomId: dto.targetId } });
      if (!room) throw new BusinessException(ERROR_CODES.NOT_FOUND, '房间不存在');
    }
    await this.prisma.favorite.upsert({
      where: { userId_targetType_targetId: { userId, targetType: dto.targetType, targetId: dto.targetId } },
      create: { userId, targetType: dto.targetType, targetId: dto.targetId },
      update: {},
    });
    return { favorited: true };
  }

  async removeFavorite(userId: string, targetType: 'post' | 'room', targetId: number) {
    await this.prisma.favorite.deleteMany({ where: { userId, targetType, targetId } });
    return { favorited: false };
  }

  async listFavorites(userId: string, type?: 'post' | 'room') {
    const rows = await this.prisma.favorite.findMany({
      where: { userId, ...(type ? { targetType: type } : {}) },
      orderBy: { createTime: 'desc' },
    });
    const postIds = rows.filter((r) => r.targetType === 'post').map((r) => r.targetId);
    const roomIds = rows.filter((r) => r.targetType === 'room').map((r) => r.targetId);
    const [posts, rooms] = await Promise.all([
      this.prisma.communityPost.findMany({
        where: { postId: { in: postIds }, status: 'published' },
        include: { author: { select: authorSelect }, _count: { select: { likes: true, comments: true } } },
      }),
      this.prisma.matchRoom.findMany({
        where: { roomId: { in: roomIds } },
        include: { creator: { select: authorSelect }, carpool: true, entertainment: true, group: true },
      }),
    ]);
    const postMap = new Map(posts.map((p) => [p.postId, p]));
    const roomMap = new Map(rooms.map((r) => [r.roomId, r]));
    return {
      list: rows.flatMap((row) => {
        if (row.targetType === 'post') {
          const post = postMap.get(row.targetId);
          return post ? [{ ...row, target: this.presentPost(post, userId) }] : [];
        }
        const room = roomMap.get(row.targetId);
        return room ? [{ ...row, target: { ...room, creator: this.presentAuthor(room.creator) } }] : [];
      }),
    };
  }

  async createAnnouncement(userId: string, dto: CreateAnnouncementDto) {
    const user = await this.requireUser(userId);
    const allowed = user.accountRole === 'admin' || user.accountRole === 'official' ||
      (user.accountRole === 'club' && user.verificationStatus === 'verified');
    if (!allowed) throw new BusinessException(ERROR_CODES.FORBIDDEN, '仅管理员、官方账号和认证社团可发布公告');
    if (dto.isPinned && user.accountRole !== 'admin') {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '仅管理员可置顶公告');
    }
    if (dto.timelineAt && user.accountRole !== 'admin') {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '仅管理员可设置时间轴时间');
    }
    if (user.accountRole === 'club' && dto.category !== 'club') {
      throw new BusinessException(ERROR_CODES.FORBIDDEN, '认证社团只能发布社团公告');
    }
    return this.prisma.announcement.create({
      data: { authorId: userId, category: dto.category ?? 'platform', title: dto.title.trim(),
        summary: dto.summary?.trim(), content: dto.content.trim(), coverUrl: dto.coverUrl,
        isPinned: dto.isPinned ?? false, status: 'published',
        publishedAt: dto.timelineAt ? new Date(dto.timelineAt) : new Date() },
    });
  }

  async listAnnouncements() {
    const list = await this.prisma.announcement.findMany({
      where: { status: 'published' },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      include: { author: { select: authorSelect } },
      take: 100,
    });
    return { list: list.map((a) => ({ ...a, author: this.presentAuthor(a.author) })) };
  }

  async submitVerification(userId: string, dto: CreateVerificationDto) {
    const user = await this.requireUser(userId);
    const pending = await this.prisma.verificationRequest.findFirst({ where: { userId, status: 'pending' } });
    if (pending) throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, '已有认证申请正在审核');
    if (dto.type !== 'student' && !dto.organizationName) {
      throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, '社团或官方认证必须填写组织名称');
    }
    if (dto.type === 'student' && !dto.studentId) {
      throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, '学生认证必须填写学号');
    }
    const request = await this.prisma.verificationRequest.create({
      data: { userId, type: dto.type, organizationName: dto.organizationName,
        applicantName: dto.applicantName, studentId: dto.studentId,
        materialUrls: dto.materialUrls, statement: dto.statement },
    });
    if (user.verificationStatus !== 'verified') {
      await this.prisma.user.update({ where: { userId }, data: { verificationStatus: 'pending' } });
    }
    return request;
  }

  async myVerification(userId: string) {
    const current = await this.prisma.verificationRequest.findFirst({
      where: { userId }, orderBy: { createTime: 'desc' },
    });
    return { current };
  }

  async listReviewQueue(adminId: string) {
    await this.requireAdmin(adminId);
    const [posts, comments, verifications] = await Promise.all([
      this.prisma.communityPost.findMany({ where: { status: 'pending' }, orderBy: { createTime: 'asc' }, include: { author: { select: authorSelect } } }),
      this.prisma.postComment.findMany({ where: { status: 'pending' }, orderBy: { createTime: 'asc' }, include: { author: { select: authorSelect }, post: { select: { title: true } } } }),
      this.prisma.verificationRequest.findMany({ where: { status: 'pending' }, orderBy: { createTime: 'asc' }, include: { applicant: { select: authorSelect } } }),
    ]);
    return { posts, comments, verifications };
  }

  async adminOverview(adminId: string) {
    await this.requireAdmin(adminId);
    const [pendingPosts, pendingComments, pendingVerifications, highRisk, publishedAnnouncements, hiddenContent, totalUsers] = await Promise.all([
      this.prisma.communityPost.count({ where: { status: 'pending' } }),
      this.prisma.postComment.count({ where: { status: 'pending' } }),
      this.prisma.verificationRequest.count({ where: { status: 'pending' } }),
      this.prisma.communityPost.count({ where: { status: 'pending', riskLevel: 'high' } }),
      this.prisma.announcement.count({ where: { status: 'published' } }),
      this.prisma.communityPost.count({ where: { status: 'hidden' } }),
      this.prisma.user.count({ where: { accountStatus: 'normal' } }),
    ]);
    return {
      pendingPosts,
      pendingComments,
      pendingVerifications,
      pendingTotal: pendingPosts + pendingComments + pendingVerifications,
      highRisk,
      publishedAnnouncements,
      hiddenContent,
      totalUsers,
      autoModerationEnabled: true,
    };
  }

  async listAdminPosts(adminId: string, status?: string, riskLevel?: string) {
    await this.requireAdmin(adminId);
    const where: Prisma.CommunityPostWhereInput = {
      ...(status && status !== 'all' ? { status } : {}),
      ...(riskLevel && riskLevel !== 'all' ? { riskLevel } : {}),
    };
    const list = await this.prisma.communityPost.findMany({
      where,
      orderBy: [{ createTime: 'desc' }],
      include: { author: { select: authorSelect } },
      take: 200,
    });
    return { list };
  }

  async listAdminComments(adminId: string, status?: string) {
    await this.requireAdmin(adminId);
    const list = await this.prisma.postComment.findMany({
      where: status && status !== 'all' ? { status } : {},
      orderBy: { createTime: 'desc' },
      include: { author: { select: authorSelect }, post: { select: { postId: true, title: true } } },
      take: 200,
    });
    return { list };
  }

  async listAdminVerifications(adminId: string, type?: string, status?: string) {
    await this.requireAdmin(adminId);
    const list = await this.prisma.verificationRequest.findMany({
      where: {
        ...(type && type !== 'all' ? { type } : {}),
        ...(status && status !== 'all' ? { status } : {}),
      },
      orderBy: { createTime: 'desc' },
      include: { applicant: { select: authorSelect } },
      take: 200,
    });
    return { list };
  }

  async listAdminAnnouncements(adminId: string, status?: string) {
    await this.requireAdmin(adminId);
    const list = await this.prisma.announcement.findMany({
      where: status && status !== 'all' ? { status } : {},
      orderBy: [{ isPinned: 'desc' }, { createTime: 'desc' }],
      include: { author: { select: authorSelect } },
      take: 200,
    });
    return { list };
  }

  async updateAnnouncement(adminId: string, announcementId: number, dto: UpdateAnnouncementDto) {
    await this.requireAdmin(adminId);
    const current = await this.prisma.announcement.findUnique({ where: { announcementId } });
    if (!current) throw new BusinessException(ERROR_CODES.NOT_FOUND, '公告不存在');
    const data: Prisma.AnnouncementUpdateInput = {
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.summary !== undefined ? { summary: dto.summary.trim() } : {}),
      ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
      ...(dto.coverUrl !== undefined ? { coverUrl: dto.coverUrl } : {}),
      ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
      ...(dto.timelineAt !== undefined ? { publishedAt: new Date(dto.timelineAt) } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.status === 'published' && current.status !== 'published' && dto.timelineAt === undefined
        ? { publishedAt: new Date() }
        : {}),
      ...(dto.status === 'hidden' ? { isPinned: false } : {}),
      reviewer: { connect: { userId: adminId } },
    };
    return this.prisma.announcement.update({ where: { announcementId }, data });
  }

  async reviewPost(adminId: string, postId: number, dto: ReviewDto) {
    return this.moderatePost(adminId, postId, dto);
  }

  async reviewComment(adminId: string, commentId: number, dto: ReviewDto) {
    return this.moderateComment(adminId, commentId, dto);
  }

  async moderatePost(adminId: string, postId: number, dto: AdminContentActionDto | ReviewDto) {
    await this.requireAdmin(adminId);
    const post = await this.prisma.communityPost.findUnique({ where: { postId } });
    if (!post) throw new BusinessException(ERROR_CODES.NOT_FOUND, '帖子不存在');
    const status = dto.action === 'approve' || dto.action === 'restore'
      ? 'published'
      : dto.action === 'hide' ? 'hidden' : 'rejected';
    const updated = await this.prisma.communityPost.update({
      where: { postId },
      data: {
        status,
        reviewerId: adminId,
        reviewedAt: new Date(),
        reviewReason: dto.note,
        moderationMode: 'manual',
        publishedAt: status === 'published' && !post.publishedAt ? new Date() : undefined,
      },
    });
    await this.pushModerationNotice(post.authorId, 'post', postId, dto.action, `帖子《${post.title}》`, dto.note);
    return updated;
  }

  async moderateComment(adminId: string, commentId: number, dto: AdminContentActionDto | ReviewDto) {
    await this.requireAdmin(adminId);
    const comment = await this.prisma.postComment.findUnique({
      where: { commentId },
      include: { post: { select: { title: true } } },
    });
    if (!comment) throw new BusinessException(ERROR_CODES.NOT_FOUND, '评论不存在');
    const status = dto.action === 'approve' || dto.action === 'restore'
      ? 'published'
      : dto.action === 'hide' ? 'hidden' : 'rejected';
    const updated = await this.prisma.postComment.update({
      where: { commentId },
      data: {
        status,
        reviewerId: adminId,
        reviewedAt: new Date(),
        reviewReason: dto.note,
        moderationMode: 'manual',
      },
    });
    await this.pushModerationNotice(comment.authorId, 'comment', commentId, dto.action, `评论（${comment.post.title}）`, dto.note);
    return updated;
  }

  async reviewVerification(adminId: string, requestId: number, dto: ReviewDto) {
    await this.requireAdmin(adminId);
    const request = await this.prisma.verificationRequest.findUnique({ where: { requestId } });
    if (!request) throw new BusinessException(ERROR_CODES.NOT_FOUND, '认证申请不存在');
    if (request.status !== 'pending') throw new BusinessException(ERROR_CODES.VALIDATION_FAILED, '该申请已处理');
    const approved = dto.action === 'approve';
    return this.prisma.$transaction(async (tx) => {
      const applicant = await tx.user.findUnique({
        where: { userId: request.userId },
        select: { verificationStatus: true },
      });
      const updated = await tx.verificationRequest.update({
        where: { requestId }, data: { status: approved ? 'approved' : 'rejected', reviewerId: adminId,
          reviewNote: dto.note, reviewedAt: new Date() },
      });
      await tx.user.update({
        where: { userId: request.userId },
        data: { verificationStatus: approved || applicant?.verificationStatus === 'verified' ? 'verified' : 'rejected',
          ...(approved ? { accountRole: request.type === 'student' ? 'student' : request.type } : {}) },
      });
      await tx.notification.create({
        data: {
          userId: request.userId,
          type: 'verification_result',
          payload: {
            kind: 'verification',
            targetId: requestId,
            action: approved ? 'approve' : 'reject',
            title: request.type === 'club' ? '社团认证' : request.type === 'student' ? '学生身份认证' : '官方认证',
            note: dto.note || null,
            message: approved ? '你的认证申请已通过' : '你的认证申请未通过',
          },
        },
      });
      return updated;
    });
  }
}
