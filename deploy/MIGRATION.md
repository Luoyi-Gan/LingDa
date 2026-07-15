# 灵搭迁移至学校服务器 Runbook

> 当前唯一主方案：学校管理的 Linux 服务器 + Nginx + Node.js + MySQL。
> 不再使用 Mac mini、ngrok、FRP 或个人电脑常驻。

## 1. 向学校信息化部门确认

上线前需要拿到以下信息：

- Ubuntu 22.04/24.04 LTS 服务器、SSH 账号和 `sudo` 权限。
- 学生端域名、管理端域名，以及 DNS 解析权限。
- 80/443 入站端口；22 端口仅开放给校内 VPN 或运维 IP。
- 学校是否提供 MySQL 8.0；若提供，优先使用独立数据库服务。
- TLS 证书来源（学校统一证书或 ACME）、备份目标和日志保留期。
- 是否需要等保、数据出境、实名认证或校内统一身份认证对接。

## 2. 推荐架构

```text
Internet / Campus Network
          |
       HTTPS 443
          |
        Nginx
       /     \
student SPA  admin SPA
          \   /
      NestJS 127.0.0.1:3000
             |
       MySQL 8.0 (private network)
             |
 /srv/lingda-data
   public-uploads
   private-uploads
   backups
```

- 后端只监听 `127.0.0.1:3000`，不对公网暴露。
- MySQL `3306` 只允许本机或校内数据库网段。
- 学生端与管理端使用不同域名，两者都仅通过 HTTPS 访问 API。
- 公开帖子图片与私密认证材料使用不同目录和访问策略。

## 3. 服务器初始化

```bash
sudo apt update
sudo apt install -y nginx mysql-client ca-certificates curl

# 使用学校批准的 Node.js 20 LTS 安装方式
node --version
npm --version

sudo useradd --system --create-home --shell /usr/sbin/nologin lingda
sudo mkdir -p /opt/lingda/releases /opt/lingda/current
sudo mkdir -p /srv/lingda-data/{public-uploads,private-uploads,backups}
sudo chown -R lingda:lingda /opt/lingda /srv/lingda-data
sudo chmod 700 /srv/lingda-data/private-uploads /srv/lingda-data/backups
```

Node.js 18 已进入维护后期，学校新服务器应使用 Node.js 20 LTS。

## 4. 生产环境变量

```bash
sudo install -o lingda -g lingda -m 600 deploy/.env.example /etc/lingda/backend.env
sudoedit /etc/lingda/backend.env
```

必须修改：

- `DATABASE_URL`：使用独立最小权限账号，禁止 root。
- `JWT_SECRET`：至少 32 字符，可用 `openssl rand -hex 32`。
- `CORS_ORIGINS`：只填学生端和管理端 HTTPS 域名。
- `PUBLIC_UPLOAD_DIR` 和 `PRIVATE_UPLOAD_DIR`：指向 `/srv/lingda-data`，不能放在 release 目录内。

## 5. 构建与上传

在可信的 CI 或本地构建机执行：

```bash
bash deploy/build-artifact.sh
scp deploy/dist/*.tar.gz ops@school-server:/tmp/
```

在服务器上将每次发布解压到带时间戳的 release 目录，验证通过后再原子切换 `/opt/lingda/current` 软链接。不要覆盖上一版。

## 6. 数据库迁移

```bash
# 源端：一致性导出
mysqldump --single-transaction --routines --triggers --hex-blob \
  -h 127.0.0.1 -u root -p sys | gzip > lingda-$(date +%F-%H%M).sql.gz

# 校内目标端：先建结构，再导入数据
cd /opt/lingda/current/backend
npx prisma migrate deploy
gzip -dc /tmp/lingda-YYYY-MM-DD-HHMM.sql.gz | \
  mysql --ssl-mode=REQUIRED -h <mysql-host> -u lingda_app -p lingda
```

切换前必须再做一次最终增量停机窗口，避免新注册、消息和认证记录丢失。禁止在生产环境使用 `prisma db push --accept-data-loss`。

## 7. 进程管理

学校服务器优先使用 `systemd`，不依赖个人用户的 PM2 状态。

```ini
[Unit]
Description=LingDa API
After=network.target

[Service]
User=lingda
Group=lingda
WorkingDirectory=/opt/lingda/current/backend
EnvironmentFile=/etc/lingda/backend.env
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/srv/lingda-data

[Install]
WantedBy=multi-user.target
```

## 8. 上线前验收

```bash
curl -fsS https://lingda.example.edu.cn/api/v1/health
sudo systemctl status lingda-api
sudo nginx -t
```

同时验证：

- 学生端无公告发布入口，管理端可发布并维护时间轴。
- 非好友无法创建、进入或读取私聊。
- 认证材料未登录无法访问，普通用户无法访问他人材料。
- HTTP 自动跳转 HTTPS，TLS 证书链正常。
- 备份可从异机恢复，不只是“有备份文件”。

## 9. 备份与回滚

- MySQL：每日全量 + binlog，备份加密后复制到另一台校内存储。
- 文件：每日备份 `/srv/lingda-data`，私密材料备份必须加密。
- release：保留至少前 3 版，回滚时切换 `current` 软链接并重启服务。
- 数据库迁移只能向前；需要回退时，使用上线前快照恢复。

## 10. 待学校确认后再定稿

以下内容需要根据学校实际环境替换：服务器 IP、Linux 版本、域名、证书下发方式、MySQL 地址、校内 VPN/防火墙规则、备份目标和监控平台。
