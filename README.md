# 灵搭 LingDa

校园协作匹配平台。三模块：**拼车 / 娱乐 / 学习**。

- 前端：Vite + React 18 + Tailwind + shadcn/ui，移植自原微信小程序
- 后端：NestJS + Prisma + MySQL 8
- 部署：Mac mini 自托管 + ngrok 公网入口（详见 [`deploy/`](./deploy/)）

## 目录结构

```
backend/    NestJS API + Prisma schema
web/        Vite React SPA
deploy/     部署脚本 / Nginx 配置 / FRP / 迁移
docs/       API / schema / migrations
_legacy/    早期 WeChat 小程序代码（已被 web/ 取代，保留作参考，不入库）
```

## 本地开发

```bash
# 后端（默认 http://127.0.0.1:3000）
cd backend && npm ci && npm run start:dev

# 前端（dev 默认 http://127.0.0.1:5173，preview 默认 4173 + /api 代理）
cd web && npm ci && npm run dev
```

## 公网部署（Mac mini + ngrok）

详见 [`deploy/MIGRATION.md`](./deploy/MIGRATION.md)。
