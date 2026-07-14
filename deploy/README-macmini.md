# 灵搭 LingDa — Mac mini 自托管方案

> 架构：**Mac mini 跑全栈**（MySQL 8 + NestJS + Nginx + 静态前端）+ **微型 Aliyun ECS 做公网中转**（FRP 反向隧道）
> 月费：~20-30 元（仅 ECS）

```
                 公网
   [手机/电脑] ─http→ ECS_IP:80
                              │
                          (frps:7080 监听)
                              │
                ╔═══════════ FRP tunnel (出站持久连接) ═══════════╗
                ║                                                  ║
                ║  Mac mini (家里 / 宿舍 Wi-Fi)                    ║
                ║   └─ frpc → 127.0.0.1:80                         ║
                ║       └─ nginx → frontend/student/dist + /api → :3000 ║
                ║                          ↓                       ║
                ║                       NestJS                     ║
                ║                          ↓                       ║
                ║                       MySQL 8                    ║
                ╚══════════════════════════════════════════════════╝
```

为什么这个架构：
- ✅ **0 RDS 费用** —— Mac mini 自带的 MySQL 就是 DB
- ✅ **Mac mini 24h 在线** —— 一次硬件成本，无 ECS 算力月费
- ✅ **数据不出门** —— 所有 user / message / room 都在你家
- ✅ **Mac mini 不暴露公网** —— frpc 主动连出，家里不开任何入站端口（安全）
- ✅ **ECS 只是个 cheap 公网入口** —— 1c1g 轻量服务器够了

---

## 一、购物清单

### Aliyun 轻量应用服务器（推荐，比 ECS 更便宜）

- 入口：阿里云控制台 → 轻量应用服务器
- **套餐：1 vCPU / 1 GB / 30 GB SSD / 1 Mbps 峰值带宽 / 月 1024 GB 流量**
- 大约 **¥24-30/月**（学生认证可半价）
- 地域：选离 Mac mini 物理距离近的（华东 1 杭州 / 华北 2 北京）
- 镜像：**Ubuntu 22.04 LTS**

### 防火墙规则（轻量服务器控制台 → 防火墙）

| 端口 | 来源 | 用途 |
|---|---|---|
| 22 (TCP) | 你的当前公网 IP | SSH 运维 |
| 80 (TCP) | 0.0.0.0/0 | 用户 HTTP 访问 |
| 443 (TCP) | 0.0.0.0/0 | 未来 HTTPS |
| 7000 (TCP) | Mac mini 出口 IP | frp 控制连接（不开 0.0.0.0 更安全） |

> 🛡️ Mac mini 出口 IP 怎么查：在 Mac mini 终端 `curl ifconfig.me`

---

## 二、Mac mini 端准备

### 2.1 安装 Homebrew 包

```bash
# Homebrew 还没装的话先装：
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 装服务三件套
brew install node@18 mysql nginx
brew install frpc        # FRP 客户端
brew install pm2         # 后端进程管理

# 把 node@18 加入 PATH（如果不是默认）
echo 'export PATH="/opt/homebrew/opt/node@18/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 2.2 MySQL 配置

```bash
# 启动 MySQL（首次安装会引导设置 root 密码）
brew services start mysql
mysql_secure_installation

# 进 mysql 创建生产库 + 专用账号
mysql -u root -p <<'SQL'
CREATE DATABASE IF NOT EXISTS dazi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dazi_app'@'127.0.0.1' IDENTIFIED BY '换成强密码_例如_openssl_rand_base64_24';
GRANT ALL PRIVILEGES ON dazi.* TO 'dazi_app'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

# 把现在 sys 库的数据迁到 dazi（可选 —— 想留旧数据才执行）
mysqldump -u root -p sys > /tmp/old-sys.sql
mysql -u root -p dazi < /tmp/old-sys.sql   # 拉过来。schema 重复声明的 warning 可忽略。
```

### 2.3 用 prisma 创建 schema（新 dazi 库）

```bash
cd /Users/your-name/Desktop/LingDa/backend
# 临时切到生产库再 push
DATABASE_URL='mysql://dazi_app:你的强密码@127.0.0.1:3306/dazi' npx prisma db push --skip-generate
```

### 2.4 装后端依赖 + build

```bash
cd /Users/your-name/Desktop/LingDa/backend
npm ci
npx prisma generate
npm run build
```

### 2.5 配生产 .env

```bash
cat > /Users/your-name/Desktop/LingDa/backend/.env.production <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL='mysql://dazi_app:你的强密码@127.0.0.1:3306/dazi?charset=utf8mb4&timezone=%2B08%3A00'
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d
EOF
chmod 600 /Users/your-name/Desktop/LingDa/backend/.env.production
```

### 2.6 PM2 + launchd 自启

```bash
cd /Users/your-name/Desktop/LingDa/backend
# 启动（用 .env.production）
pm2 start dist/main.js --name lingda-api -- --env production
pm2 save

# 让 Mac mini 重启后 pm2 + 后端 自动恢复
pm2 startup launchd -u $USER --hp $HOME
# 按提示复制粘贴执行那一句 sudo 命令（macOS 下会装 launchd plist）

# 看状态
pm2 status
pm2 logs lingda-api
```

### 2.7 build 前端 + 让 nginx 托管

```bash
cd /Users/your-name/Desktop/LingDa/frontend/student
npm ci
npm run build

# 把 dist 拷到固定路径（brew nginx web root）
sudo mkdir -p /opt/lingda/web
sudo cp -r dist/* /opt/lingda/web/

# nginx 配置：把项目里的 nginx-macmini.conf 装进去
sudo cp /Users/your-name/Desktop/LingDa/deploy/nginx-macmini.conf \
        /opt/homebrew/etc/nginx/servers/lingda.conf
nginx -t                       # 测试
brew services start nginx      # 启动 + 跟随登录自启
```

### 2.8 防 Mac mini 睡觉 + 显示器关掉但服务不停

```bash
# 永不睡眠 / 硬盘不睡 / 显示器 10 分钟后关
sudo pmset -a sleep 0 disksleep 0 displaysleep 10 womp 1 autorestart 1
# womp=1 网络包唤醒；autorestart=1 断电恢复后自动开机
pmset -g    # 查看
```

如果要面盖盖上也跑（Mac mini 没盖，跳过；MacBook 才有这个）。

### 2.9 macOS 防火墙

```bash
# 系统设置 → 网络 → 防火墙 → 打开
# → 允许 Node / nginx / frpc 接受入站连接（弹窗时点"允许"）
# 这一步只影响内网；frpc 是主动出站，不受影响。
```

---

## 三、Aliyun 轻量服务器端：FRP server

### 3.1 SSH 进去，装 FRP

```bash
ssh root@<ECS_IP>

# 下载 FRP 二进制
cd /opt
FRP_VER=0.61.1
curl -fL -O https://github.com/fatedier/frp/releases/download/v${FRP_VER}/frp_${FRP_VER}_linux_amd64.tar.gz
tar -xzf frp_${FRP_VER}_linux_amd64.tar.gz
mv frp_${FRP_VER}_linux_amd64 frp
cd frp
```

### 3.2 写 frps.toml（用本项目 deploy/frps.toml）

```toml
# /opt/frp/frps.toml
bindPort = 7000          # FRP 控制端口（frpc 连这里）

# 鉴权 —— frpc 和 frps 必须用同一个 token
auth.method = "token"
auth.token  = "改一个长随机串_openssl_rand_hex_32"

# 管理面板（可选）http://ECS_IP:7500
webServer.addr = "0.0.0.0"
webServer.port = 7500
webServer.user = "admin"
webServer.password = "改一个强密码"

# 默认 vhost 端口（如果以后绑域名做 HTTP 路由用）
vhostHTTPPort  = 80
# vhostHTTPSPort = 443
```

### 3.3 装成 systemd 服务

```bash
sudo tee /etc/systemd/system/frps.service > /dev/null <<'EOF'
[Unit]
Description=FRP Server
After=network.target

[Service]
Type=simple
ExecStart=/opt/frp/frps -c /opt/frp/frps.toml
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now frps
sudo systemctl status frps
```

### 3.4 ufw 放行

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 7000/tcp      # 这里建议在阿里云防火墙改成"仅你家 IP"
sudo ufw allow 7500/tcp      # 管理面板，按需
sudo ufw --force enable
```

---

## 四、Mac mini 端：FRP client

```bash
# frpc 已经 brew install 装好了
cat > /opt/lingda/frpc.toml <<EOF
serverAddr = "<ECS_IP>"
serverPort = 7000

auth.method = "token"
auth.token  = "和 frps 一模一样的那个 token"

# 把 ECS 的 80 端口隧道到 Mac mini 的 80（Nginx）
[[proxies]]
name       = "lingda-web"
type       = "tcp"
localIP    = "127.0.0.1"
localPort  = 80
remotePort = 80
EOF
sudo mkdir -p /opt/lingda && sudo chown $USER /opt/lingda

# 后台跑 + 跟随登录自启
brew services start frpc
# 默认会读 /opt/homebrew/etc/frpc.toml；改成读我们写的文件：
ln -sf /opt/lingda/frpc.toml /opt/homebrew/etc/frpc.toml
brew services restart frpc
brew services list | grep frpc
```

---

## 五、收尾验证

```bash
# Mac mini 本地
curl http://127.0.0.1/                  # 应该 200 + html
curl http://127.0.0.1/api/v1/health     # 应该 {"code":0,...}

# 在任何外网设备上（手机 4G 关 Wi-Fi 直接访问）
http://<ECS_IP>/                        # 应该看到登录页
```

---

## 六、运维常用

```bash
# Mac mini
pm2 status                # 后端进程
pm2 logs lingda-api       # 看后端日志
brew services list        # mysql / nginx / frpc 状态
tail -f /opt/homebrew/var/log/nginx/error.log
brew services restart nginx
brew services restart frpc

# ECS
systemctl status frps     # 中转状态
journalctl -u frps -f     # 看 frp 隧道日志
```

---

## 七、上代码（之后改了页面 / 接口）

```bash
# 在 Mac mini 本机
cd /Users/your-name/Desktop/LingDa
git pull           # 或你工作流自己的方式

# 后端
cd backend
npm ci
npx prisma generate
DATABASE_URL='...' npx prisma db push --skip-generate
npm run build
pm2 restart lingda-api

# 前端
cd ../frontend/student
npm ci
npm run build
sudo rsync -av --delete dist/ /opt/lingda/web/
sudo nginx -s reload
```

（一键脚本见 [`deploy-macmini-update.sh`](./deploy-macmini-update.sh)）

---

## 八、什么时候要域名 + HTTPS

如果将来要把网址给非内部用户 / 接支付 / 接 OAuth：
- 备案一个域名（阿里云万网，30-100 元/年）
- 域名 A 记录指向 ECS_IP
- ECS 上加 certbot + Let's Encrypt（免费证书）+ nginx 反代到 frp 上
- 详见 [`HTTPS-upgrade.md`](./HTTPS-upgrade.md)（待补）

---

## 九、安全注意

- ✅ `dazi_app` 账户只能从 127.0.0.1 连，不能远程
- ✅ MySQL 默认只听 127.0.0.1（brew 安装版的默认行为）
- ✅ `.env.production` 600 权限
- ✅ frp token 一定要随机生成且足够长（>= 32 hex）
- ✅ Mac mini 不要把 3306 / 3000 暴露到 LAN（IP 限制 frpc 即可）
- ⚠️ 当前是 HTTP，密码明文走线 —— 不要长期裸跑，最迟在公开宣传前上 HTTPS
- ⚠️ 数据备份：Time Machine 配上外置硬盘 + 每日 `mysqldump` 一份扔到外置盘 + 上传到 OSS（一次 import 自动化省心）
