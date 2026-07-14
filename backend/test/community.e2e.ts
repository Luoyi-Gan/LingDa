import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const base = 'http://127.0.0.1:3000/api/v1';
const suffix = String(Date.now()).slice(-6);
const ids = {
  admin: `E2EADM${suffix}`,
  student: `E2ESTU${suffix}`,
  club: `E2ECLB${suffix}`,
};

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function request(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json() as { code: number; msg: string; data: any };
  if (body.code !== 0) throw new Error(`${path}: ${body.msg} (${body.code})`);
  return body.data;
}

async function register(userId: string, username: string, phone: string) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      username,
      realName: username,
      password: 'Test123456',
      phone,
      college: '灵搭测试学院',
      major: '社区功能测试',
    }),
  });
}

async function main() {
  const admin = await register(ids.admin, `审核员${suffix}`, `13901${suffix}`);
  const student = await register(ids.student, `学生${suffix}`, `13902${suffix}`);
  const club = await register(ids.club, `社团${suffix}`, `13903${suffix}`);

  await prisma.user.update({
    where: { userId: ids.admin },
    data: { accountRole: 'admin', verificationStatus: 'verified' },
  });

  const studentVerification = await request('/verifications', {
    method: 'POST',
    body: JSON.stringify({
      type: 'student',
      applicantName: `学生${suffix}`,
      studentId: ids.student,
      materialUrls: ['https://example.com/student-proof.jpg'],
      statement: '端到端测试学生认证',
    }),
  }, student.token);
  await request(`/admin/verifications/${studentVerification.requestId}/review`, {
    method: 'POST',
    body: JSON.stringify({ action: 'approve', note: '测试审核通过' }),
  }, admin.token);

  const safePost = await request('/posts', {
    method: 'POST',
    body: JSON.stringify({
      category: 'course',
      title: '数据库课程资料讨论',
      content: '想和同学交流本周课程作业的思路与参考资料。',
      images: [],
    }),
  }, student.token);
  assert(safePost.status === 'published', '低风险帖子应自动发布');

  const riskyPost = await request('/posts', {
    method: 'POST',
    body: JSON.stringify({
      category: 'campus_life',
      title: '校外活动交流',
      content: '有兴趣可以加微信进一步沟通。',
      images: [],
    }),
  }, student.token);
  assert(riskyPost.status === 'pending', '命中规则的帖子应进入人工审核');

  const queue = await request('/admin/review-queue', {}, admin.token);
  assert(queue.posts.some((post: any) => post.postId === riskyPost.postId), '审核队列缺少风险帖子');
  await request(`/admin/posts/${riskyPost.postId}/review`, {
    method: 'POST',
    body: JSON.stringify({ action: 'approve', note: '确认内容可发布' }),
  }, admin.token);

  await request(`/posts/${safePost.postId}/like`, { method: 'POST' }, student.token);
  await request(`/posts/${safePost.postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content: '这条资料很有帮助。' }),
  }, student.token);
  await request('/favorites', {
    method: 'POST',
    body: JSON.stringify({ targetType: 'post', targetId: safePost.postId }),
  }, student.token);
  const favorites = await request('/favorites?type=post', {}, student.token);
  assert(favorites.list.some((item: any) => item.targetId === safePost.postId), '帖子收藏未持久化');

  const clubVerification = await request('/verifications', {
    method: 'POST',
    body: JSON.stringify({
      type: 'club',
      applicantName: `社团负责人${suffix}`,
      organizationName: `灵搭测试社团${suffix}`,
      materialUrls: ['https://example.com/club-proof.jpg'],
      statement: '端到端测试社团认证',
    }),
  }, club.token);
  await request(`/admin/verifications/${clubVerification.requestId}/review`, {
    method: 'POST',
    body: JSON.stringify({ action: 'approve', note: '社团材料有效' }),
  }, admin.token);
  const announcement = await request('/announcements', {
    method: 'POST',
    body: JSON.stringify({
      category: 'club',
      title: '测试社团开放日',
      summary: '社区端到端测试公告',
      content: '欢迎同学参加社团开放日。',
    }),
  }, club.token);
  assert(announcement.status === 'published', '认证社团公告发布失败');

  process.stdout.write('community e2e passed\n');
}

async function cleanup() {
  await prisma.announcement.deleteMany({ where: { authorId: { in: Object.values(ids) } } });
  await prisma.communityPost.deleteMany({ where: { authorId: { in: Object.values(ids) } } });
  await prisma.verificationRequest.deleteMany({ where: { userId: { in: Object.values(ids) } } });
  await prisma.favorite.deleteMany({ where: { userId: { in: Object.values(ids) } } });
  await prisma.user.deleteMany({ where: { userId: { in: Object.values(ids) } } });
  await prisma.$disconnect();
}

main()
  .then(cleanup)
  .catch(async (error) => {
    process.stderr.write(`${error?.stack || error}\n`);
    await cleanup();
    process.exitCode = 1;
  });
