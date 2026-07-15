# 灵搭 LingDa — 部署入口

> 当前主方案：**学校管理的 Linux 服务器**。
> 详细步骤见 [`MIGRATION.md`](./MIGRATION.md)。Mac mini、ngrok 和 FRP 文档仅作历史参考，不再用于新部署。

## 当前部署原则

- Nginx 对外仅开放 80/443，NestJS 只监听 `127.0.0.1:3000`。
- 学生端、管理端使用独立域名，管理端不与学生端混合部署。
- MySQL 仅校内私网可访问，应用使用最小权限账号。
- 公开图片与私密认证材料分目录存储，并独立备份。
- 生产发布使用 systemd、带版本 release 目录和可回滚软链接。

---

## 历史云服务器参考（非当前主方案）

---

> 备选方案：**ECS** (Ubuntu 22.04 + Node 18 + Nginx + PM2) + **RDS MySQL 8.0**（同 VPC）

## 一、购物清单与选型推荐

### 1.1 ECS（计算）

| 用途 | 推荐配置 | 价钱量级 |
|---|---|---|
| MVP / 内测（< 200 同时在线） | **ecs.t6-c1m2.large**（2 vCPU / 4 GB） | ~80–120 元/月 |
| 升级备份 | ecs.u1-c1m4.large（2 vCPU / 4 GB 通用型） | ~150 元/月 |

- 镜像：**Ubuntu 22.04 LTS 64 位**
- 系统盘：**40 GB ESSD PL0 云盘**
- 网络：**专有网络（VPC）**，与 RDS 同一 VPC + 同一可用区
- 公网：**按使用流量计费 · 5 Mbps 峰值带宽**（实际 MVP 跑不满，按量便宜）
- 地域：建议**华东 1（杭州）**或**华北 2（北京）**，挑用户聚集地

### 1.2 RDS MySQL（数据库）

| 用途 | 推荐 | 价钱 |
|---|---|---|
| 内测 | **mysql.n2.small.1**（1 核 1 GB · 通用型） | ~80–120 元/月 |
| 推荐 | mysql.n2.medium.1（1 核 2 GB） | ~150–200 元/月 |

- 引擎：**MySQL 8.0**
- 系列：**基础版**（单可用区）便宜 / 高可用版（多 AZ）正式上线再升
- 存储：20 GB SSD（用满再扩）
- 字符集：**utf8mb4**（中文必须）
- 时区：`+08:00`

### 1.3 安全组规则（ECS）

| 方向 | 端口 | 授权对象 | 用途 |
|---|---|---|---|
| Inbound | 22 (SSH) | 只放**你的当前公网 IP**（不是 0.0.0.0/0） | 登录运维 |
| Inbound | 80 (HTTP) | 0.0.0.0/0 | 用户访问 |
| Inbound | 443 (HTTPS) | 0.0.0.0/0 | 未来上 HTTPS 用 |
| Outbound | ALL | 0.0.0.0/0 | 出站默认 |

> ⚠️ 切忌把 3306 (MySQL) 开公网。RDS 通过 VPC 内网连接，ECS 直接走内网 endpoint。

### 1.4 RDS 白名单
- 创建数据库后，把 ECS 的 **VPC 内网 IP** 加入 RDS 的白名单
- 创建一个数据库账户（不要用 root），赋予指定库的 ALL 权限

---

## 二、上手流程（首次部署 ~30 分钟）

> 假设：ECS 已开机，可用 `ssh ubuntu@<ECS_IP>` 登录；RDS 已建好账号 `dazi_app` + 数据库 `dazi`

### 2.1 在本机：导出 MySQL 数据

```bash
# 仅导数据（schema 由 prisma 推送）
cd /Users/your-name/Desktop/LingDa
mysqldump -h 127.0.0.1 -u root -p sys \
  --no-create-info \
  --skip-triggers \
  --hex-blob \
  --default-character-set=utf8mb4 \
  > deploy/data-dump.sql

# 看 dump 大小
ls -lh deploy/data-dump.sql
```

### 2.2 在本机：打前端 + 后端构建包

```bash
cd /Users/your-name/Desktop/LingDa
bash deploy/build-artifact.sh
# → 生成 web.tar.gz + admin-web.tar.gz + backend.tar.gz
```

### 2.3 在本机：传文件到 ECS

```bash
ECS_IP=<你的公网 IP>
scp deploy/dist/web.tar.gz deploy/dist/admin-web.tar.gz deploy/dist/backend.tar.gz deploy/data-dump.sql \
    deploy/setup-ecs.sh deploy/nginx-lingda.conf deploy/.env.example \
    ubuntu@$ECS_IP:/tmp/
```

### 2.4 在 ECS：装环境 + 跑起来

```bash
ssh ubuntu@$ECS_IP
sudo bash /tmp/setup-ecs.sh   # 一键装 node18 / nginx / pm2 / mysql-client
# 期间会让你编辑 /opt/lingda/backend/.env 填 RDS 连接串和强 JWT_SECRET

# 导入 schema —— 用 prisma 一次性创建所有表（RDS 不再是 sys 系统库，prisma migrate 可用）
cd /opt/lingda/backend
npx prisma db push --skip-generate --accept-data-loss
# 导入开发期数据
mysql -h <RDS 内网域名> -u dazi_app -p dazi < /tmp/data-dump.sql

# 启动后端
cd /opt/lingda/backend
pm2 start dist/main.js --name lingda-api --time
pm2 save
sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu   # 开机自启

# 启用 nginx
sudo systemctl reload nginx
```

### 2.5 访问

打开浏览器 → `http://<ECS_IP>/` 应该看到 Login 页。

---

## 三、运维常用

```bash
pm2 status                  # 看后端进程
pm2 logs lingda-api         # 看后端日志
pm2 restart lingda-api      # 改完 .env 重启
sudo tail -f /var/log/nginx/error.log  # nginx 错误
```

## 四、升级流程（之后改代码再部署）

```bash
# 本机
bash deploy/build-artifact.sh
scp deploy/dist/*.tar.gz ubuntu@$ECS_IP:/tmp/

# ECS
bash /opt/lingda/scripts/deploy-update.sh
```

---

## 五、安全注意事项

- ✅ `.env` 文件权限 `600`，不要进 git
- ✅ `JWT_SECRET` 改成 64 位随机串（脚本会用 `openssl rand -hex 32` 生成）
- ✅ `DATABASE_URL` 用 RDS 内网 endpoint，不走公网
- ✅ 后端 process 跑在 ubuntu 用户下，不用 root
- ⚠️ 暂未启用 HTTPS — 登录密码会明文走 HTTP，**仅用于内测**。上线前必须配域名 + Let's Encrypt
- ⚠️ ECS root 登录禁用，sudo 时无密码（按需调整）
