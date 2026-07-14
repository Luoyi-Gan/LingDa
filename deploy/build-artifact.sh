#!/usr/bin/env bash
# 本机：打前端 dist + 后端 dist 为 tar.gz，上传 ECS 用
# 用法：bash deploy/build-artifact.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/deploy/dist"
mkdir -p "$OUT"

echo "==[1/6] 学生端 build =================================="
cd "$ROOT/frontend/student"
npm run build

echo "==[2/6] 学生端打包 ==================================="
( cd "$ROOT/frontend/student" && tar -czf "$OUT/web.tar.gz" dist )
ls -lh "$OUT/web.tar.gz"

echo "==[3/6] 管理端 build =================================="
cd "$ROOT/frontend/admin"
npm run build

echo "==[4/6] 管理端打包 ==================================="
( cd "$ROOT/frontend/admin" && tar -czf "$OUT/admin-web.tar.gz" dist )
ls -lh "$OUT/admin-web.tar.gz"

echo "==[5/6] 后端 build ==================================="
cd "$ROOT/backend"
# 安装包含 devDependencies，build 完再扔掉
[ -d node_modules ] || npm ci
npx prisma generate
npm run build

echo "==[6/6] 后端打包 ====================================="
# 打包：dist + prisma + package.json + package-lock.json
TMP="$(mktemp -d)"
cp -r "$ROOT/backend/dist" "$TMP/"
cp -r "$ROOT/backend/prisma" "$TMP/"
cp    "$ROOT/backend/package.json" "$TMP/"
cp    "$ROOT/backend/package-lock.json" "$TMP/"
# 导出初始 schema SQL（首次部署用）—— 仅 CREATE 语句，无数据
cp    "$ROOT/deploy/init.sql" "$TMP/init.sql" 2>/dev/null || true
( cd "$TMP" && tar -czf "$OUT/backend.tar.gz" . )
ls -lh "$OUT/backend.tar.gz"
rm -rf "$TMP"

echo ""
echo "✓ 完成。产物在 $OUT/"
echo "  · web.tar.gz       前端静态资源（解压到 nginx web root）"
echo "  · admin-web.tar.gz 管理端静态资源"
echo "  · backend.tar.gz   后端运行文件（解压到 /opt/lingda/backend）"
