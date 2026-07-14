# 校园搭子 · 后端

NestJS + Prisma + MySQL + Socket.IO

## 快速开始

```bash
# 1. 装依赖
npm install

# 2. 复制环境变量
cp .env.example .env

# 3. 生成 Prisma Client(DBA 出 schema 后)
npm run prisma:generate

# 4. 启动开发服务
npm run start:dev
```

启动后:
- API:http://localhost:3000/api/v1
- Swagger:http://localhost:3000/docs
- 健康检查:http://localhost:3000/api/v1/health

## 目录结构

```
src/
├── main.ts                 # 入口
├── app.module.ts           # 根模块
├── config/                 # 环境变量加载
├── common/                 # 全局基础设施
│   ├── constants/          # 错误码
│   ├── decorators/         # @CurrentUser / @Public
│   ├── exceptions/         # BusinessException
│   ├── filters/            # 全局异常过滤器
│   ├── guards/             # JWT 全局守卫
│   └── interceptors/       # 统一响应 {code,data,msg}
├── prisma/                 # PrismaService 封装
├── auth/                   # JWT 策略 + 登录(Step 3)
├── user/                   # 用户 / 主页 / 评价(Step 3)
├── room/                   # 房间 + ISA 子表(Step 3)
├── member/                 # 成员状态机(Step 3)
├── evaluation/             # 评价闭环(Step 3)
├── social/                 # 好友 / 黑名单(Step 3)
├── chat/                   # 会话 + WebSocket(Step 3)
└── health/                 # 健康检查
```

## 与 DBA 的分工

- `prisma/schema.prisma` 是后端 ORM 映射；完整 SQL 和增量迁移位于 `../database/`
- 后端代码通过 `PrismaService`(继承自 `PrismaClient`)访问数据库
- DBA 每次更新 schema 后,后端跑 `npm run prisma:generate` 拿最新类型

## API 契约

见 [`../docs/API.md`](../docs/API.md)。任何接口变更先改契约再改代码。
