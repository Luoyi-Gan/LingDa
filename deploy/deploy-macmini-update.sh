#!/usr/bin/env bash
# Mac mini 增量上线：拉新代码 → 重新 build 前后端 → 重启进程
# 假设：项目仍在原路径 /Users/<you>/Desktop/LingDa
#       生产 .env 在 backend/.env.production
# 用法：bash deploy/deploy-macmini-update.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_TARGET=/opt/lingda/web
ADMIN_TARGET=/opt/lingda/admin

echo "==[1/8] git pull ====================================="
cd "$ROOT" && git status --short && git pull --ff-only || true

echo "==[2/8] 后端 deps + prisma + build ====================="
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

echo "==[3/8] 学生端 build ================================="
cd "$ROOT/frontend/student"
npm ci
npm run build

echo "==[4/8] 管理端 build ================================="
cd "$ROOT/frontend/admin"
npm ci
npm run build

echo "==[5/8] 部署静态资源 ================================="
sudo mkdir -p "$WEB_TARGET"
sudo mkdir -p "$ADMIN_TARGET"
sudo rsync -av --delete "$ROOT/frontend/student/dist/" "$WEB_TARGET/"
sudo rsync -av --delete "$ROOT/frontend/admin/dist/" "$ADMIN_TARGET/"

echo "==[6/8] 重启后端进程 ================================="
# 注意：pm2 必须能读到 .env.production —— 用 --update-env 让 pm2 重新加载环境
cd "$ROOT/backend"
pm2 restart lingda-api --update-env || \
  pm2 start dist/main.js --name lingda-api --update-env
pm2 save

echo "==[7/8] reload nginx ================================="
sudo nginx -s reload

echo "==[8/8] 健康检查 ====================================="
echo ""
echo "✓ 已上线"
pm2 status | sed -n '1,20p'
echo ""
curl -s http://127.0.0.1/api/v1/health || echo "⚠️  本机 health 检测失败"
