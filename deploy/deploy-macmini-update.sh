#!/usr/bin/env bash
# Mac mini 增量上线：拉新代码 → 重新 build 前后端 → 重启进程
# 假设：项目仍在原路径 /Users/<you>/WeChatProjects/miniprogram-9
#       生产 .env 在 backend/.env.production
# 用法：bash deploy/deploy-macmini-update.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_TARGET=/opt/lingda/web

echo "==[1/6] git pull ====================================="
cd "$ROOT" && git status --short && git pull --ff-only || true

echo "==[2/6] 后端 deps + prisma + build ====================="
cd "$ROOT/backend"
npm ci
# 从 .env.production 读 DATABASE_URL 来推 schema
export $(grep -v '^#' .env.production | xargs -0 2>/dev/null || cat .env.production | sed -e 's/[[:space:]]*=[[:space:]]*/=/' | tr '\n' ' ')
npx prisma generate
npx prisma db push --skip-generate || {
  echo "⚠️  prisma db push 失败（可能有破坏性 schema 变化）"
  echo "   手动确认后加 --accept-data-loss 再试"
}
npm run build

echo "==[3/6] 前端 build ==================================="
cd "$ROOT/web"
npm ci
npm run build

echo "==[4/6] 部署前端到 nginx web root ===================="
sudo mkdir -p "$WEB_TARGET"
sudo rsync -av --delete "$ROOT/web/dist/" "$WEB_TARGET/"

echo "==[5/6] 重启后端进程 ================================="
# 注意：pm2 必须能读到 .env.production —— 用 --update-env 让 pm2 重新加载环境
cd "$ROOT/backend"
pm2 restart lingda-api --update-env || \
  pm2 start dist/main.js --name lingda-api --update-env
pm2 save

echo "==[6/6] reload nginx ================================="
sudo nginx -s reload

echo ""
echo "✓ 已上线"
pm2 status | sed -n '1,20p'
echo ""
curl -s http://127.0.0.1/api/v1/health || echo "⚠️  本机 health 检测失败"
