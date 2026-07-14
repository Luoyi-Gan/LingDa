# 灵搭 LingDa 项目迁移说明

这份说明用于把项目移动到另一台电脑后重新跑起来。迁移包包含 Web 前端、后端、锁文件、数据库脚本、部署脚本和说明文档；不包含 `node_modules`、构建产物、`.git` 历史和本机 `.env`。

## 1. 环境要求

- Node.js 20 或更高版本
- npm
- MySQL 8
- Git 可选，仅用于后续版本管理

## 2. 解压项目

把压缩包解压到目标电脑，例如：

```bash
tar -xzf lingda-transfer-YYYYMMDD-HHMMSS.tar.gz
cd LingDa
```

## 3. 配置后端

```bash
cd backend
npm ci
cp .env.example .env
```

打开 `backend/.env`，至少修改这些配置：

```env
PORT=3000
DATABASE_URL="mysql://用户名:密码@localhost:3306/数据库名"
JWT_SECRET="换成一段自己的随机字符串"
JWT_EXPIRES_IN="7d"
```

然后创建数据库并导入结构。仓库里有两类数据库资料：

- `database/schema.sql`：完整建表 SQL
- `database/migrations/`：后续增量迁移

常见流程：

```bash
mysql -u root -p -e "CREATE DATABASE lingda DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p lingda < ../database/schema.sql
mysql -u root -p lingda < ../database/migrations/2026-05-14_add_join_password.sql
npm run prisma:generate
```

启动后端：

```bash
npm run start:dev
```

如果目标电脑只想本机访问，或者系统不允许监听全部网卡，可以这样启动：

```bash
HOST=127.0.0.1 npm run start:dev
```

后端默认地址：

- API: `http://localhost:3000/api/v1`
- 健康检查: `http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/docs`

## 4. 配置前端

另开一个终端：

```bash
cd frontend/student
npm ci
npm run dev
```

前端默认地址：

```text
http://localhost:5173
```

前端默认会请求：

```text
http://localhost:3000/api/v1
```

如果后端地址不同，在 `frontend/student` 目录下新建 `.env.local`：

```env
VITE_API_BASE=http://你的后端地址/api/v1
```

## 5. 打包和部署相关

- `deploy/`：Mac mini / ECS / Nginx / FRP / 更新脚本
- `docs/API.md`：前后端接口契约
- `backend/test/`：后端 smoke 测试脚本
生产构建：

```bash
cd backend
npm run build

cd ../frontend/student
npm run build

cd ../admin
npm run build
```

## 6. 迁移包未包含的内容

这些内容没有打进包里，需要在新电脑重新生成或自行配置：

- `backend/.env`
- `node_modules`
- `backend/dist`
- `frontend/student/dist`
- `frontend/admin/dist`
- `.git`
- 本机日志、系统临时文件
- 历史备份包，例如 `*.tar.gz`、`*.zip`
