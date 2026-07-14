# 灵搭 LingDa

校园协作匹配平台。三模块：**拼车 / 娱乐 / 学习**。

当前 `web/` 为 **纯 HTML + CSS 静态前端**，视觉复刻原 Vite React 版（Tech-but-Friendly：冷灰底、indigo 主色、amber CTA、sky/violet/teal tint 色块、Bento 布局）。**暂不接接口**。

- 后端：NestJS + Prisma + MySQL 8（[`backend/`](./backend/)）
- 部署说明：[`deploy/`](./deploy/)

## 目录结构

```
backend/    NestJS API + Prisma schema
web/        静态 HTML / CSS / JS（原 React UI 静态化预览）
deploy/     部署脚本 / Nginx / 迁移
docs/       API / schema 文档
```

### `web/` 页面

| 文件 | 说明 |
|------|------|
| `login.html` | 登录（假鉴权 + 记住我） |
| `register.html` | 注册校验后进入大厅 |
| `hall.html` | 大厅 Bento（匹配入口 / 筛选 / 评价） |
| `posts.html` | 帖子广场 + 右侧详情抽屉 |
| `chat.html` / `chat-detail.html` | 消息列表与会话详情 |
| `me.html` | 个人中心（编辑资料） |
| `profile.html` | 他人主页（加好友 / 私信） |
| `css/` | tokens / base / shell / components / pages |
| `js/` | ui / auth / app / posts / chat / nav … |
| `public/` | 图标等静态资源 |

桌面（≥960px）：左侧 DesktopNav；移动端：底部 TabBar + 中间 FAB。

## 本地预览

```bash
cd web
npx serve -l 5173 .
```

打开 http://localhost:5173/ → 登录页点「立即进入」或「开发预览」进大厅。

## 已实现的 UI 交互（静态预览）

- **登录 / 注册**：非空与格式校验，会话写入 `localStorage`；记住我；忘记密码提示
- **发起组队**：侧栏 CTA / 底栏 FAB 打开发布 Sheet（拼车 / 娱乐 / 学习）
- **大厅入口**：三模块打开匹配 Sheet；热门卡片可跳转帖子详情；筛选真实过滤；待办评价
- **帖子**：分类过滤、右侧抽屉（点赞 / 收藏 / 评论持久化 / 申请加入）、`?post=` 深链
- **聊天**：列表进详情，消息本地持久化；头像仍进主页
- **我的**：编辑资料同步侧栏；队伍跳转帖子；退出清会话
- **他人主页**：加好友状态本地保存；私信进会话
- 桌面侧栏 **左上角个人主页卡片**（移动端底栏「我的」）
- **左下角主题切换**：深色 / 浅色，偏好写入 `localStorage`

## 后端（可选联调）

```bash
cd backend && npm ci && npm run start:dev
```

API：http://127.0.0.1:3000/api/v1（静态前端尚未请求后端）。

## 公网部署

见 [`deploy/MIGRATION.md`](./deploy/MIGRATION.md)。静态站可直接托管 `web/` 目录。
