import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const previewPosts = [
  {
    category: 'course',
    title: '数据库系统课程项目，有人一起梳理选题吗？',
    content: '准备做一个校园活动与组队管理方向的数据库项目，想找同学一起讨论实体关系、权限模型和最终展示。现在还在选题阶段，欢迎做后端、产品或数据分析的同学交流想法。',
    images: ['/images/campus/study-window.jpg'],
  },
  {
    category: 'campus_life',
    title: '你最喜欢资源中心的哪个学习区？',
    content: '最近暑期留校，发现资源中心上午的光线特别舒服。靠窗区适合看书，小组讨论区更方便做项目。大家还有哪些安静、插座充足的学习位置推荐？',
    images: ['/images/campus/resource-center-sun.jpg', '/images/campus/sky-courtyard.jpg'],
  },
];

async function main() {
  const user = process.env.PREVIEW_USER_ID
    ? await prisma.user.findUnique({ where: { userId: process.env.PREVIEW_USER_ID } })
    : await prisma.user.findFirst({ where: { username: 'BUBBLE', accountStatus: 'normal' } });

  if (!user) throw new Error('未找到预览账号，请设置 PREVIEW_USER_ID');

  for (const post of previewPosts) {
    const exists = await prisma.communityPost.findFirst({
      where: { authorId: user.userId, title: post.title },
      select: { postId: true },
    });
    if (exists) continue;
    await prisma.communityPost.create({
      data: {
        authorId: user.userId,
        category: post.category,
        title: post.title,
        content: post.content,
        images: post.images,
        status: 'published',
        moderationMode: 'automatic',
        riskLevel: 'low',
        publishedAt: new Date(),
      },
    });
  }

  process.stdout.write(`preview posts ready for ${user.username}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
