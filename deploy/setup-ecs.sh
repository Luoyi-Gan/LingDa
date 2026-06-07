#!/usr/bin/env bash
# ECS 首次准备脚本（Ubuntu 22.04）
# 依赖前置：把 backend.tar.gz / web.tar.gz / nginx-lingda.conf / .env.example
# 上传到 /tmp/
# 用法：sudo bash /tmp/setup-ecs.sh
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "请用 sudo 运行"; exit 1
fi

WEB_ROOT=/var/www/lingda
APP_DIR=/opt/lingda/backend

echo "==[1/7] 系统包 =========================================="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates gnupg lsb-release nginx mysql-client \
                   openssl ufw build-essential

echo "==[2/7] Node 18 (Nodesource) ==========================="
if ! command -v node >/dev/null || [ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "==[3/7] PM2 ============================================"
npm install -g pm2

echo "==[4/7] 解压后端 ======================================="
mkdir -p "$APP_DIR"
tar -xzf /tmp/backend.tar.gz -C "$APP_DIR"
cd "$APP_DIR"
# 只装生产依赖
npm ci --omit=dev
npx prisma generate

# 生成强 JWT_SECRET 一次
JWT=$(openssl rand -hex 32)
if [ ! -f "$APP_DIR/.env" ]; then
  cp /tmp/.env.example "$APP_DIR/.env"
  sed -i "s|REPLACE_ME_JWT|$JWT|g" "$APP_DIR/.env"
  echo ""
  echo "👉 请手动编辑 $APP_DIR/.env 填 DATABASE_URL（RDS 内网 endpoint）"
  echo "   然后再回来跑 pm2 start"
fi
chmod 600 "$APP_DIR/.env"
chown -R ubuntu:ubuntu /opt/lingda

echo "==[5/7] 解压前端到 nginx web root ====================="
mkdir -p "$WEB_ROOT"
tar -xzf /tmp/web.tar.gz -C "$WEB_ROOT" --strip-components=1   # 去掉外层 dist/
chown -R www-data:www-data "$WEB_ROOT"

echo "==[6/7] Nginx 站点 ===================================="
cp /tmp/nginx-lingda.conf /etc/nginx/sites-available/lingda
ln -sf /etc/nginx/sites-available/lingda /etc/nginx/sites-enabled/lingda
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "==[7/7] 防火墙 ========================================"
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable

echo ""
echo "✓ 系统准备完成"
echo ""
echo "下一步："
echo "  1. 编辑 $APP_DIR/.env 填好 DATABASE_URL（RDS 内网域名）"
echo "  2. 用 prisma 创建所有表（RDS 不再是 sys 系统库，可直接用 db push）:"
echo "     cd $APP_DIR && sudo -u ubuntu npx prisma db push --skip-generate --accept-data-loss"
echo "  3. 导入开发期数据（如有需要）:"
echo "     mysql -h <RDS> -u dazi_app -p dazi < /tmp/data-dump.sql"
echo "  4. 启动后端："
echo "     sudo -u ubuntu pm2 start $APP_DIR/dist/main.js --name lingda-api --time"
echo "     sudo -u ubuntu pm2 save"
echo "     pm2 startup systemd -u ubuntu --hp /home/ubuntu  # 输出一行 sudo 命令，复制粘贴执行"
echo "  5. 浏览器访问 http://<ECS_IP>/"
