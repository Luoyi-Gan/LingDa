#!/usr/bin/env bash
# 阿里云轻量服务器（Ubuntu 22.04）一键装 FRP server
# 前置：把 frps.toml（改好 token 和 dashboard 密码）上传到 /tmp/frps.toml
# 用法：sudo bash /tmp/setup-frps-ecs.sh
set -euo pipefail

if [ "$EUID" -ne 0 ]; then echo "请用 sudo 运行"; exit 1; fi
if [ ! -f /tmp/frps.toml ]; then
  echo "缺 /tmp/frps.toml —— 请先 scp 上传配置"
  exit 1
fi

FRP_VER="${FRP_VER:-0.61.1}"
INSTALL=/opt/frp

echo "==[1/5] 系统包 ========================================="
apt-get update -y
apt-get install -y curl ca-certificates ufw

echo "==[2/5] 下 FRP 二进制 ================================="
mkdir -p "$INSTALL"
cd "$INSTALL"
curl -fL -o frp.tar.gz \
  "https://github.com/fatedier/frp/releases/download/v${FRP_VER}/frp_${FRP_VER}_linux_amd64.tar.gz"
tar -xzf frp.tar.gz --strip-components=1
rm frp.tar.gz
chmod +x frps
cp /tmp/frps.toml "$INSTALL/frps.toml"
chmod 600 "$INSTALL/frps.toml"

echo "==[3/5] systemd 服务 =================================="
cat > /etc/systemd/system/frps.service <<EOF
[Unit]
Description=FRP Server
After=network.target

[Service]
Type=simple
ExecStart=$INSTALL/frps -c $INSTALL/frps.toml
Restart=always
RestartSec=5
User=root
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now frps
sleep 1
systemctl status frps --no-pager | head -20

echo "==[4/5] 防火墙 ========================================"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 7000/tcp     # frp 控制端口 —— 建议在阿里云安全组里再加 IP 白名单
ufw allow 7500/tcp     # frp 管理面板（按需开 / 不用就 ufw delete）
ufw --force enable

echo "==[5/5] 完成 ========================================="
echo ""
echo "✓ FRP server 已跑起来"
echo "  - 控制端口: 7000（frpc 连这里）"
echo "  - vhost HTTP 入口: 80（用户访问）"
echo "  - dashboard: http://$(curl -s ifconfig.me):7500  admin/<密码>"
echo ""
echo "下一步：在 Mac mini 上"
echo "  - 编辑 /opt/lingda/frpc.toml 把 serverAddr 改成 $(curl -s ifconfig.me)"
echo "  - brew services start frpc"
echo "  - 浏览器访问 http://$(curl -s ifconfig.me)/"
