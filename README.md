# 灵搭 LingDa

面向校园场景的开放社区与协作匹配平台：公告、贴吧、找搭子（拼车 / 娱乐 / 课程组队）、消息中心，以及独立的管理审核后台。

| 层 | 技术 |
|----|------|
| 学生端 | Vite + React 18 + React Router + Tailwind + shadcn/ui |
| 管理端 | 独立 Vite + React SPA（登录态与学生端隔离） |
| 后端 | NestJS + Prisma + MySQL 8 + Socket.IO |
| 文档 / 部署 | [`docs/`](./docs/) API 契约；[`deploy/`](./deploy/) 学校机部署 |

---

## 功能概览

### 学生端

| 模块 | 路由（示例） | 说明 |
|------|----------------|------|
| 校园公告 | `/announcements` | 平台 / 教务 / 服务 / 社团公告 |
| 校园贴吧 | `/posts` | 学生社区发帖、评论、点赞 |
| 找搭子 | `/partners` | 大厅推荐、分类匹配、发起组队 |
| 发现组队 | `/partners/explore` | 按类型浏览在招房间 |
| 消息 | `/chat`、`/chat-detail` | 私聊 / 群聊会话 |
| 我的 | `/me` | 个人资料、编辑、好友申请入口 |
| 我的组队 | `/teams` | 进行中 / 已完成队伍 |
| 收藏 | `/saved` | 收藏的房间与帖子 |
| 设置 | `/settings` | 隐私、提醒、账号安全 |
| 发布表单 | `/form-carpool` 等 | 拼车 / 娱乐 / 学习发布与编辑 |
| 匹配结果 | `/match-result` | 按类型筛选的推荐列表 |

组队详情（拼车 / 娱乐 / 学习）**不单独占满屏跳转**：从列表点击后从右侧滑入抽屉。深链 `/detail-carpool?id=` 等仍兼容，会落到大厅并打开同一抽屉。

### 管理端

独立站点（默认开发端口 `5174`），用于帖子 / 评论 / 认证 / 公告等审核与运营，不与学生端共用 localStorage token。

---

## 仓库结构

```
lingda/
├── frontend/
│   ├── student/          # 学生端 SPA（本文默认「前端」）
│   └── admin/            # 管理端 SPA
├── backend/              # NestJS API（/api/v1）+ Prisma
├── database/             # MySQL 完整结构与增量 SQL
├── docs/
│   ├── API.md            # 前后端 / DBA 契约（权威）
│   └── SECURITY.md
└── deploy/               # Nginx、systemd、学校机迁移说明
```

学生端主要源码：

```
frontend/student/src/
├── pages/                # 按业务拆分的页面
├── components/           # 布局、抽屉、名片、发布面板等
├── lib/                  # api / auth / nav / roomDetail …
├── context/              # Auth、UI、好友等
└── styles/               # 设计 token
```

---

## 环境要求

- **Node.js** 18+（建议 LTS）
- **MySQL** 8.x，可访问的库（如 `dazi`）
- 包管理：项目内使用 `npm`

---

## 本地开发（完整步骤）

建议开三个终端：后端 → 学生端 →（可选）管理端。

### 1. 数据库

1. 在本机创建库，例如：`CREATE DATABASE dazi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
2. 准备可连接的账号密码。

### 2. 后端

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 至少确认：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | 如 `mysql://USER:PASSWORD@127.0.0.1:3306/dazi` |
| `JWT_SECRET` | 本地可先用占位；生产必须更换 |
| `JWT_EXPIRES_IN` | 默认 `7d` |
| `PORT` | 默认 `3000` |
| `NODE_ENV` | 本地用 `development`（影响开发预览接口是否可用） |

然后：

```bash
npm ci
npx prisma generate
npx prisma db push          # 按 prisma/schema.prisma 同步表结构
npm run start:dev
```

启动成功后：

| 地址 | 用途 |
|------|------|
| http://127.0.0.1:3000/api/v1 | REST BaseURL |
| http://127.0.0.1:3000/docs | Swagger |
| http://127.0.0.1:3000/api/v1/health | 健康检查（DB 未就绪时 health 仍可能返回 ok，业务接口会失败） |

常用脚本：

```bash
npm run prisma:studio       # 可视化看库
npm run seed:preview        # 写入部分预览帖子（需已有预览用户）
ADMIN_PREVIEW_PASSWORD='至少10位' npm run seed:admin-preview   # 本地管理员 ADMIN001
```

### 3. 学生端

```bash
cd frontend/student
npm ci
npm run dev                 # http://127.0.0.1:5173
```

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE` | 覆盖 API 根路径，默认 `http://localhost:3000/api/v1` |
| `VITE_UI_PREVIEW=true` | 非 `npm run dev` 时也可显示「开发预览」按钮 |

构建与预览：

```bash
npm run build
npm run preview             # 默认 4173；若配置了代理，注意与 API 同源策略
```

### 4. 管理端（可选）

```bash
cd frontend/admin
npm ci
npm run dev                 # http://127.0.0.1:5174
```

---

## 登录与开发预览

学生端支持三种进入方式：

1. **注册**：`POST /auth/register`（学号 + 密码等）
2. **登录**：`POST /auth/login`
3. **开发预览**：登录页虚线按钮 **「开发预览 · 免密进入」**  
   - 前端：`api.auth.preview()` → `POST /api/v1/auth/preview`  
   - 后端：非生产环境下自动 upsert 学号 `DEVPREVIEW`，返回**真实 JWT**  
   - 之后所有接口与正常登录一致（不是假数据和本地桩）  
   - `NODE_ENV=production` 时该接口返回禁止  
   - 按钮在 `import.meta.env.DEV` 下默认显示；或设 `VITE_UI_PREVIEW=true`

Token 存在浏览器 `localStorage`（`token` / `currentUser`）。鉴权失败业务码 `10001` 时前端会清登录态并跳转登录页。

本地管理员演示（管理端）：

```bash
cd backend
ADMIN_PREVIEW_PASSWORD='自行设置至少10位密码' npm run seed:admin-preview
```

账号：`ADMIN001` + 你设的密码。**仅本地**，不要带进生产。

---

## 学生端交互约定（当前）

### 导航

- **桌面侧栏**：校园公告、校园贴吧、找搭子、消息中心；底部头像卡片进「我的」
- **移动底栏**：公告、贴吧、搭子、消息、我的
- **我的组队 / 收藏 / 设置**：从「我的」进入（设置在资料卡右上角齿轮）
- **发起组队**：侧栏 CTA、搭子页 FAB、大厅入口共用同一个 `PublishSheet`（`lingda:publish` 事件）

### 组队详情抽屉

- 点击房间卡片 → 右侧抽屉查看详情，可申请加入 / 管理成员
- 发布或更新成功：`replace` 回 `/partners` 再打开对应详情抽屉，避免表单页与抽屉叠层
- 相关代码：`lib/roomDetail.js`、`components/RoomDetailDrawer.jsx`、`lib/nav.js`

### 头像

- 点击**他人**头像 → 个人名片（好友申请 / 私聊等）
- 点击**自己**头像 → `/me`
- 「我的」页自身主头像仅展示，不重复跳转

### API 客户端

- 统一走 `frontend/student/src/lib/api.js`
- 响应约定：`{ code, data, msg }`；出参 camelCase → snake_case 供页面使用
- 契约权威文档：[`docs/API.md`](./docs/API.md)

---

## 排错速查

| 现象 | 排查 |
|------|------|
| 登录 / 预览报网络错误 | 后端是否在 3000；`VITE_API_BASE` 是否指错 |
| 预览 / 业务接口 DB 相关失败 | `.env` 的 `DATABASE_URL`；是否执行过 `prisma db push`；MySQL 是否允许该用户连接 |
| health 通但页面空 / 报错 | Prisma 连接失败时进程可能仍启动，看后端日志里的 Prisma warn |
| 开发预览按钮没有 | 是否 `npm run dev`；或设置 `VITE_UI_PREVIEW=true` |
| 开发预览 403 | 后端 `NODE_ENV=production` |
| 旧「ui-preview」假 token 卡住 | 清站点 localStorage 后重新登录 / 点开发预览 |

---

## 文档索引

| 文档 | 内容 |
|------|------|
| [`docs/API.md`](./docs/API.md) | REST 契约、错误码、枚举 |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | 安全相关说明 |
| [`backend/README.md`](./backend/README.md) | 后端模块与脚本 |
| [`frontend/README.md`](./frontend/README.md) | 双前端说明 |
| [`database/README.md`](./database/README.md) | 库表与迁移 |
| [`deploy/MIGRATION.md`](./deploy/MIGRATION.md) | 学校服务器迁移 |
| [`deploy/README.md`](./deploy/README.md) | 部署总览 |

---

## 学校服务器部署

生产侧 Nginx、systemd、环境变量与发布流程见：

- [`deploy/MIGRATION.md`](./deploy/MIGRATION.md)
- [`deploy/README.md`](./deploy/README.md)

生产环境请关闭开发预览接口依赖的开发态配置，勿种子 `ADMIN001` / `DEVPREVIEW` 到公网库。
