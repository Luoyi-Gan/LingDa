# 灵搭 LingDa

面向学生的开放校园社区与协作匹配平台，包含公告、贴吧、找搭子、消息与独立管理中心。

- 前端：Vite + React 18 + Tailwind + shadcn/ui
- 管理端：独立 Vite + React SPA
- 后端：NestJS + Prisma + MySQL 8
- 部署：Mac mini 自托管 + ngrok 公网入口（详见 [`deploy/`](./deploy/)）

## 目录结构

```
frontend/
  student/  学生端 Vite React SPA
  admin/    独立管理员 SPA
backend/    NestJS API + Prisma ORM
database/   MySQL 完整结构与增量迁移
docs/       API 契约与产品技术文档
deploy/     部署脚本 / Nginx / FRP
```

## 本地开发

```bash
# 后端（默认 http://127.0.0.1:3000）
cd backend && npm ci && npm run start:dev

# 前端（dev 默认 http://127.0.0.1:5173，preview 默认 4173 + /api 代理）
cd frontend/student && npm ci && npm run dev

# 管理端（默认 http://127.0.0.1:5174）
cd frontend/admin && npm ci && npm run dev
```

本地管理员演示账号可通过下面的命令创建，账号为 `ADMIN001`。演示账号只用于本地环境，不应在生产部署中启用。

```bash
cd backend
ADMIN_PREVIEW_PASSWORD='自行设置至少10位密码' npm run seed:admin-preview
```

## 公网部署（Mac mini + ngrok）

详见 [`deploy/MIGRATION.md`](./deploy/MIGRATION.md)。
