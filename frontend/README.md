# 前端

- `student/`：学生客户端，默认开发端口 `5173`
- `admin/`：独立管理员端，默认开发端口 `5174`

两个应用拥有独立的入口、路由、登录态与构建产物，均通过 `VITE_API_BASE` 连接同一个后端 API。

```bash
cd student && npm ci && npm run dev
cd admin && npm ci && npm run dev
```
