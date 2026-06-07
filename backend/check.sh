#!/usr/bin/env bash
# 新机器环境自检 —— 跑通基本都没问题
set +e

echo "=========================================="
echo "  灵搭 · 新机器联调自检"
echo "=========================================="
echo

# 1. Node
echo "[1/6] Node 版本: $(node -v 2>/dev/null || echo '❌ 未装 Node')"

# 2. npm 装好了
if [ -d node_modules ]; then
  echo "[2/6] node_modules: ✅"
else
  echo "[2/6] node_modules: ❌ 缺,跑 'npm install'"
fi

# 3. Prisma client 生成过
if [ -f node_modules/.prisma/client/index.d.ts ]; then
  if grep -q "export type User" node_modules/.prisma/client/index.d.ts; then
    echo "[3/6] Prisma Client: ✅ User model 类型在"
  else
    echo "[3/6] Prisma Client: ⚠️ 没有 User 类型,跑 'npx prisma generate'"
  fi
else
  echo "[3/6] Prisma Client: ❌ 没生成,跑 'npx prisma generate'"
fi

# 4. .env 存在
if [ -f .env ]; then
  echo "[4/6] .env: ✅"
else
  echo "[4/6] .env: ❌ 缺,跑 'cp .env.example .env' 然后改 DATABASE_URL"
fi

# 5. MySQL dazi 库通
if command -v mysql >/dev/null 2>&1; then
  if [ -f .env ]; then
    DB_URL=$(grep DATABASE_URL .env | head -1)
    echo "[5/6] DATABASE_URL: $DB_URL"
  fi
else
  echo "[5/6] MySQL CLI: ❌ 未装"
fi

# 6. 本机 IP
echo "[6/6] 本机局域网 IP:"
ipconfig getifaddr en0 2>/dev/null && echo "  ↑ 把这个 IP 填到 utils/api.js 的 LAN_IP"

echo
echo "=========================================="
echo "  接下来:npm run start:dev"
echo "=========================================="
