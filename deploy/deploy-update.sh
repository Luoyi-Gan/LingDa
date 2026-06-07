#!/usr/bin/env bash
# 增量上线脚本（已部署后改了代码再走这个）
# 前置：本机 build-artifact.sh 出新包 + scp 到 ECS /tmp/
# 用法（在 ECS 上）：bash /opt/lingda/scripts/deploy-update.sh
set -euo pipefail

WEB_ROOT=/var/www/lingda
APP_DIR=/opt/lingda/backend
BACKUP_DIR=/opt/lingda/backups
TS=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "==[1/5] 备份当前 ====================================="
sudo cp -a "$APP_DIR/dist" "$BACKUP_DIR/dist-$TS" || true
sudo cp -a "$WEB_ROOT"     "$BACKUP_DIR/web-$TS"  || true

echo "==[2/5] 更新前端 ====================================="
sudo rm -rf "$WEB_ROOT"
sudo mkdir -p "$WEB_ROOT"
sudo tar -xzf /tmp/web.tar.gz -C "$WEB_ROOT" --strip-components=1
sudo chown -R www-data:www-data "$WEB_ROOT"

echo "==[3/5] 更新后端 ====================================="
TMP=$(mktemp -d)
tar -xzf /tmp/backend.tar.gz -C "$TMP"
sudo cp -a "$TMP/dist"    "$APP_DIR/dist.new"
sudo cp    "$TMP/package.json" "$APP_DIR/package.json.new"
sudo cp    "$TMP/package-lock.json" "$APP_DIR/package-lock.json.new"
sudo cp -r "$TMP/prisma" "$APP_DIR/prisma.new"
rm -rf "$TMP"

# 原子替换
sudo rm -rf "$APP_DIR/dist" "$APP_DIR/prisma"
sudo mv "$APP_DIR/dist.new"          "$APP_DIR/dist"
sudo mv "$APP_DIR/prisma.new"        "$APP_DIR/prisma"
sudo mv "$APP_DIR/package.json.new"  "$APP_DIR/package.json"
sudo mv "$APP_DIR/package-lock.json.new" "$APP_DIR/package-lock.json"
sudo chown -R ubuntu:ubuntu /opt/lingda

echo "==[4/5] 装依赖 + prisma 同步 ========================="
cd "$APP_DIR"
sudo -u ubuntu npm ci --omit=dev
sudo -u ubuntu npx prisma generate
# 自动应用 schema 变化（无破坏性才会通过；首次大改加 --accept-data-loss）
sudo -u ubuntu npx prisma db push --skip-generate || {
  echo "⚠️  prisma db push 失败 —— 大概率有破坏性变更。手动 review schema.prisma 再决定。"
}

echo "==[5/5] 重启后端 + nginx reload ======================"
sudo -u ubuntu pm2 restart lingda-api --update-env
sudo systemctl reload nginx

echo ""
echo "✓ 已上线。备份在 $BACKUP_DIR/{dist,web}-$TS"
sudo -u ubuntu pm2 status
