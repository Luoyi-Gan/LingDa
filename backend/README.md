# 校园搭子 · 后端

NestJS + Prisma + MySQL + Socket.IO，统一前缀 `/api/v1`。

## 快速开始

```bash
npm install
cp .env.example .env          # 必填 DATABASE_URL
npm run prisma:generate
npx prisma db push
npm run start:dev
```

| 地址 | 说明 |
|------|------|
| http://localhost:3000/api/v1 | REST |
| http://localhost:3000/docs | Swagger UI |
| http://localhost:3000/api/v1/health | 健康检查 |

### 环境变量（`.env`）

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是 | MySQL 连接串 |
| `JWT_SECRET` | 是 | JWT 签名密钥 |
| `JWT_EXPIRES_IN` | 否 | 默认 `7d` |
| `PORT` | 否 | 默认 `3000` |
| `NODE_ENV` | 否 | `production` 时禁用开发预览登录 |
| `ADMIN_PREVIEW_PASSWORD` | 否 | 仅 `seed:admin-preview` 使用 |

## 鉴权

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 学号 + 密码 |
| POST | `/auth/preview` | **开发专用**：upsert `DEVPREVIEW` 并签发 JWT；生产拒绝 |

除 `@Public()` 接口外，请求头需：`Authorization: Bearer <token>`。失败业务码见 [`../docs/API.md`](../docs/API.md)。

## npm 脚本

| 脚本 | 说明 |
|------|------|
| `start:dev` | watch 开发 |
| `build` / `start:prod` | 编译后运行 `dist/main.js` |
| `prisma:generate` | 生成 Client |
| `prisma:migrate` | Prisma migrate |
| `prisma:studio` | 数据库 GUI |
| `seed:preview` | 预览帖子内容 |
| `seed:admin-preview` | 本地管理员 `ADMIN001`（需 `ADMIN_PREVIEW_PASSWORD`≥10 位） |
| `test:community` | 社区相关 e2e 脚本 |

```bash
ADMIN_PREVIEW_PASSWORD='至少10位本地密码' npm run seed:admin-preview
```

## 目录结构

```
src/
├── main.ts
├── app.module.ts
├── config/
├── common/                 # 错误码、守卫、过滤器、统一响应
├── prisma/
├── auth/                   # 登录 / 注册 / preview
├── user/
├── room/                   # 拼车 / 娱乐 / 学习（group）房间
├── member/
├── evaluation/
├── social/
├── chat/                   # REST + WebSocket
├── community/              # 贴吧、公告、认证、管理审核
├── upload/
└── health/
```

## 与 DBA

- ORM 映射：`prisma/schema.prisma`
- 完整 SQL / 增量：`../database/`
- schema 变更后执行：`npm run prisma:generate`（及必要的 `db push` / migrate）

## 契约

任何接口变更先改 [`../docs/API.md`](../docs/API.md) 再改代码。仓库级说明见 [`../README.md`](../README.md)。
