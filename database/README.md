# 数据库

- `schema.sql`：MySQL 8 完整建库结构，适合全新环境初始化
- `migrations/`：按日期排列的增量 SQL
- `../backend/prisma/schema.prisma`：后端 ORM 映射，随 API 代码维护

全新环境先执行 `schema.sql`，已有环境只按时间顺序执行尚未应用的迁移。执行前必须备份数据库，不要用带 `--accept-data-loss` 的自动同步替代人工确认。
