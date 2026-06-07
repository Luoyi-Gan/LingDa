#!/usr/bin/env bash
# 在 Mac mini（target）上跑：解包 → 装环境 → 恢复 DB → 起服务
# 用法：bash deploy/migrate-target.sh /path/to/lingda-export-*.tar.gz
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "用法：bash $0 <lingda-export-*.tar.gz>"; exit 1
fi
EXPORT="$1"
[ -f "$EXPORT" ] || { echo "找不到 $EXPORT"; exit 1; }

PROJECT_HOME="${PROJECT_HOME:-$HOME/lingda}"
DB_NAME="${DB_NAME:-sys}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"
STAGING="$(mktemp -d)"
cleanup() { rm -rf "$STAGING"; }
trap cleanup EXIT

echo "==[1/8] 解包 ==========================================="
mkdir -p "$STAGING"
tar -xzf "$EXPORT" -C "$STAGING"
mkdir -p "$PROJECT_HOME"
( cd "$PROJECT_HOME" && tar -xf "$STAGING/code.tar" )
echo "  ✓ 代码解压到 $PROJECT_HOME"

# 恢复 ngrok 配置
NGROK_DIR="$HOME/Library/Application Support/ngrok"
mkdir -p "$NGROK_DIR"
[ -f "$STAGING/ngrok.yml" ] && cp "$STAGING/ngrok.yml" "$NGROK_DIR/ngrok.yml" && echo "  ✓ ngrok.yml 恢复"

# 恢复 .env
[ -f "$STAGING/env/backend.env" ] && cp "$STAGING/env/backend.env" "$PROJECT_HOME/backend/.env" && echo "  ✓ backend/.env 恢复"
[ -f "$STAGING/env/backend.env.production" ] && cp "$STAGING/env/backend.env.production" "$PROJECT_HOME/backend/.env.production" && echo "  ✓ backend/.env.production 恢复"
chmod 600 "$PROJECT_HOME/backend/.env"* 2>/dev/null || true

echo "==[2/8] Homebrew + 系统包 =============================="
if ! command -v brew >/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
brew update >/dev/null 2>&1 || true
# 单装 — 已存在就 skip
for pkg in node@18 mysql nginx ngrok; do
  if ! brew list "$pkg" >/dev/null 2>&1; then
    echo "  → 装 $pkg"
    brew install "$pkg" 2>&1 | tail -2
  else
    echo "  ✓ $pkg 已装"
  fi
done
# pm2 用 npm
if ! command -v pm2 >/dev/null; then
  npm install -g pm2 2>&1 | tail -1
fi

# 把 node@18 加进 PATH
if ! grep -q 'node@18/bin' ~/.zshrc 2>/dev/null; then
  echo 'export PATH="/opt/homebrew/opt/node@18/bin:$PATH"' >> ~/.zshrc
fi
export PATH="/opt/homebrew/opt/node@18/bin:$PATH"

echo "==[3/8] 启 MySQL + 导入 dump ==========================="
brew services start mysql >/dev/null
# 等 MySQL 起好
for i in 1 2 3 4 5 6 7 8 9 10; do
  if mysqladmin -h 127.0.0.1 -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} ping >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
# 建库（如果是 sys 系统库已存在就跳过；如果用自定义库名就创建）
if [ "$DB_NAME" != "sys" ]; then
  mysql -h 127.0.0.1 -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} \
    -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
fi
echo "  → 导入 dump 到 $DB_NAME 库"
mysql -h 127.0.0.1 -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} "$DB_NAME" < "$STAGING/sys-dump.sql"
USERS=$(mysql -h 127.0.0.1 -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -N -B -e "SELECT COUNT(*) FROM $DB_NAME.User" 2>/dev/null || echo "?")
echo "  ✓ 导入完成，当前 User 表：$USERS 条"

echo "==[4/8] 装 backend 依赖 + build ========================"
cd "$PROJECT_HOME/backend"
npm ci 2>&1 | tail -3
npx prisma generate
npm run build 2>&1 | tail -3

echo "==[5/8] 装 web 依赖 + build ============================"
cd "$PROJECT_HOME/web"
npm ci 2>&1 | tail -3
npm run build 2>&1 | tail -3

echo "==[6/8] PM2 起后端 + 前端 preview + 开机自启 ============"
cd "$PROJECT_HOME/backend"
pm2 delete lingda-api 2>/dev/null || true
pm2 start dist/main.js --name lingda-api --time

# 前端 vite preview（已经 build 完，自带 /api 反代到 :3000）
cd "$PROJECT_HOME/web"
pm2 delete lingda-web 2>/dev/null || true
pm2 start npm --name lingda-web --time -- run preview

pm2 save
# launchd 让 Mac mini 重启后 pm2 + 所有进程自动复活
pm2 startup launchd -u "$USER" --hp "$HOME" 2>&1 | tail -5 || true

echo "==[7/8] 防睡眠（让 Mac mini 永远在线） ================="
sudo pmset -a sleep 0 disksleep 0 displaysleep 10 womp 1 autorestart 1 2>&1 | tail -3 || \
  echo "  ⚠️  需要你手动跑 sudo pmset 命令（终端需输密码）"

echo "==[8/8] 起 ngrok（固定子域名）=========================="
# 从 ngrok.yml 读出 authtoken，配上固定 URL 重启
NGROK_URL="${NGROK_URL:-dipped-handset-clarify.ngrok-free.dev}"
pm2 delete ngrok-tunnel 2>/dev/null || true
pm2 start ngrok --name ngrok-tunnel -- http 4173 --url="$NGROK_URL" --log=stdout
pm2 save

sleep 5
echo ""
echo "==[完成] ================================================"
pm2 status
echo ""
echo "公网 URL: https://$NGROK_URL"
echo "本机 nginx 暂未起（前端走 vite preview :4173 + 反代 /api）"
echo ""
echo "做完了！打开 https://$NGROK_URL 验证一下"
