import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password.util';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PREVIEW_PASSWORD;
  if (!adminPassword || adminPassword.length < 10) {
    throw new Error('请通过 ADMIN_PREVIEW_PASSWORD 提供至少 10 位的本地管理员演示密码');
  }
  const dedicatedAdmin = await prisma.user.upsert({
    where: { userId: 'ADMIN001' },
    create: {
      userId: 'ADMIN001',
      username: '灵搭管理员',
      realName: '平台管理员',
      college: '灵搭运营中心',
      phone: '13900000009',
      passwordHash: hashPassword(adminPassword),
      accountStatus: 'normal',
      accountRole: 'admin',
      verificationStatus: 'verified',
    },
    update: {
      passwordHash: hashPassword(adminPassword),
      accountStatus: 'normal',
      accountRole: 'admin',
      verificationStatus: 'verified',
    },
  });

  const admin = await prisma.user.findFirst({
    where: { username: 'BUBBLE', accountStatus: 'normal' },
  });
  if (!admin) throw new Error('未找到 BUBBLE 预览账号');

  await prisma.user.update({
    where: { userId: admin.userId },
    data: { accountRole: 'admin', verificationStatus: 'verified' },
  });

  const author = await prisma.user.findFirst({
    where: { username: 'DUBBLE', accountStatus: 'normal' },
  });
  if (!author) throw new Error('未找到 DUBBLE 演示账号');

  const pendingTitle = '【演示待审核】周末校外兼职信息交流';
  const pendingPost = await prisma.communityPost.findFirst({
    where: { authorId: author.userId, title: pendingTitle, status: 'pending' },
  }) || await prisma.communityPost.create({
    data: {
      authorId: author.userId,
      category: 'campus_life',
      title: pendingTitle,
      content: '这是一条管理员界面演示内容，因包含校外兼职和联系方式提示，需要人工确认信息来源与安全性。',
      images: [],
      status: 'pending',
      moderationMode: 'manual',
      riskLevel: 'medium',
      reviewReason: '包含校外兼职信息，需要人工复核',
    },
  });

  const publishedPost = await prisma.communityPost.findFirst({
    where: { authorId: admin.userId, status: 'published' },
    orderBy: { postId: 'desc' },
  });
  if (publishedPost) {
    const pendingComment = await prisma.postComment.findFirst({
      where: {
        postId: publishedPost.postId,
        authorId: author.userId,
        content: { startsWith: '【演示待审核】' },
        status: 'pending',
      },
    });
    if (!pendingComment) {
      await prisma.postComment.create({
        data: {
          postId: publishedPost.postId,
          authorId: author.userId,
          content: '【演示待审核】可以加微信私下沟通吗？',
          status: 'pending',
          moderationMode: 'manual',
          riskLevel: 'medium',
          reviewReason: '包含站外联系方式，需要人工复核',
        },
      });
    } else {
      await prisma.postComment.update({
        where: { commentId: pendingComment.commentId },
        data: {
          moderationMode: 'manual',
          riskLevel: 'medium',
          reviewReason: '包含站外联系方式，需要人工复核',
        },
      });
    }
  }

  const applicant = await prisma.user.upsert({
    where: { userId: 'PREVIEW_VERIFY_001' },
    create: {
      userId: 'PREVIEW_VERIFY_001',
      username: '演示社团账号',
      realName: '演示负责人',
      college: '学生社团联合会',
      major: null,
      phone: '13900000001',
      passwordHash: 'preview-account-disabled',
      accountStatus: 'normal',
      accountRole: 'student',
      verificationStatus: 'pending',
    },
    update: { verificationStatus: 'pending' },
  });

  const pendingVerification = await prisma.verificationRequest.findFirst({
    where: { userId: applicant.userId, status: 'pending' },
  });
  if (!pendingVerification) {
    await prisma.verificationRequest.create({
      data: {
        userId: applicant.userId,
        type: 'club',
        organizationName: '灵感设计社（演示）',
        applicantName: '演示负责人',
        materialUrls: ['https://example.com/demo-club-proof.pdf'],
        statement: '申请认证为校内学生社团，用于发布活动公告。此条为管理员界面演示数据。',
      },
    });
  }

  process.stdout.write(`admin preview ready: ${dedicatedAdmin.userId}, pending post ${pendingPost.postId}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
