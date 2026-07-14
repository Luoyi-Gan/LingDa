#!/usr/bin/env bash
# 在 MacBook（source）上跑：导出代码 + DB + ngrok token，打成 lingda-export-YYYYMMDD.tar.gz
# 用法：bash deploy/migrate-source.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS=$(date +%Y%m%d-%H%M%S)
OUT="$ROOT/lingda-export-$TS.tar.gz"
STAGING="$(mktemp -d)"

cleanup() { rm -rf "$STAGING"; }
trap cleanup EXIT

cd "$ROOT"

echo "==[1/5] dump MySQL（sys 库全表）======================="
DB_USER="${MIGRATE_DB_USER:-root}"
DB_PASS="${MIGRATE_DB_PASS:-}"
mysqldump -h 127.0.0.1 -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} \
  --single-transaction \
  --routines --triggers \
  --default-character-set=utf8mb4 \
  --hex-blob \
  sys > "$STAGING/sys-dump.sql" 2>/dev/null
ROWS=$(grep -c "^INSERT INTO" "$STAGING/sys-dump.sql" || echo 0)
ls -lh "$STAGING/sys-dump.sql" | awk '{print "  dump 文件大小：" $5}'
echo "  INSERT 语句数（≈数据行数）：$ROWS"

echo "==[2/5] 拷贝 ngrok authtoken ============================"
NGROK_YML="$HOME/Library/Application Support/ngrok/ngrok.yml"
if [ -f "$NGROK_YML" ]; then
  cp "$NGROK_YML" "$STAGING/ngrok.yml"
  echo "  ✓ ngrok 配置已保存"
else
  echo "  ⚠️  没找到 ngrok 配置文件，跳过"
fi

echo "==[3/5] 拷贝 .env（如有）================================"
mkdir -p "$STAGING/env"
[ -f backend/.env ] && cp backend/.env "$STAGING/env/backend.env" && echo "  ✓ backend/.env"
[ -f backend/.env.production ] && cp backend/.env.production "$STAGING/env/backend.env.production" && echo "  ✓ backend/.env.production"

echo "==[4/5] tar 代码 + 配置 + dump ==========================="
# git archive 干净地拿当前 commit 状态（不带 node_modules 等）
git archive --format=tar HEAD > "$STAGING/code.tar"
echo "  ✓ git archive done"

# 把 staging 整个打包
cd "$STAGING"
tar -czf "$OUT" .

echo "==[5/5] 生成迁移说明 ===================================="
cat <<EOF

========================================================
✓ 完成。产物：$OUT
========================================================

包内容：
  · code.tar              当前 git HEAD 全部跟踪文件
  · sys-dump.sql          MySQL sys 库完整 dump（含 $ROWS 行 INSERT）
  · ngrok.yml             含 authtoken（敏感，发送时走加密通道）
  · env/backend.env       生产环境变量（敏感）

文件大小：
EOF
ls -lh "$OUT" | awk '{print "  " $5, $9}'

cat <<'EOF'

下一步：把这个 tar 发到 Mac mini，然后在 Mac mini 上跑：
  bash deploy/migrate-target.sh /path/to/lingda-export-*.tar.gz

详细 runbook：deploy/MIGRATION.md
EOF
