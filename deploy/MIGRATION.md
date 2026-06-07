# 灵搭 → Mac mini 迁移 Runbook

> **目标**：把整个项目（代码 + 数据库 + 41+ 个已注册真实用户 + ngrok 公网 URL）从 MacBook Air 完整搬到 Mac mini，迁完后 Mac mini 一直跑、URL 不变、MacBook 可以随便关。

---

## 一、迁移路径总览

```
MacBook Air (source)                Mac mini (target)
├── 代码 ─────── git push ─────►    git clone
├── MySQL ───── mysqldump ────►    mysql < dump
├── ngrok auth ───── 同账号 ────►   同账号登录，复用子域名
└── 进程 ────── pm2 + launchd ──►  开机自启
```

URL 不变机制：ngrok 免费版的子域名属于 **账户**，不是机器。Mac mini 用同一 `authtoken` 启动 ngrok，加上 `--url=dipped-handset-clarify.ngrok-free.dev` 即可拿回同一域名。

---

## 二、Mac mini 端的"开窗"工作（5 分钟）

> 这一步要在 Mac mini 本机做（只此一次）。

1. **系统设置 → 通用 → 共享 → 远程登录** 打开 ✅  
   底下"允许远程登录"勾选"所有用户"或加你自己。
2. 确认 Mac mini 局域网 IP：左下角 Wi-Fi 图标 → "网络偏好设置" → 看 IP（一般 `192.168.x.x`）。
3. 把这个 IP + 用户名告诉我（或自己执行下面命令）。

---

## 三、自动化路径（推荐 — 我远程执行）

我会在 MacBook 上跑：

```bash
# 1) 打包
bash deploy/migrate-source.sh
# → 产出 lingda-export-YYYYMMDD-HHMMSS.tar.gz（~10-50 MB）

# 2) 传到 Mac mini（scp）
scp lingda-export-*.tar.gz <user>@<mac-mini-ip>:/tmp/

# 3) 远程执行
ssh <user>@<mac-mini-ip> 'bash -s' < deploy/migrate-target.sh /tmp/lingda-export-*.tar.gz

# 4) 验证
curl https://dipped-handset-clarify.ngrok-free.dev/api/v1/health
```

---

## 四、手动路径（如果不方便 SSH）

### A. 在 MacBook 上

```bash
cd /Users/louis/WeChatProjects/miniprogram-9
bash deploy/migrate-source.sh
# 看输出：lingda-export-YYYYMMDD-HHMMSS.tar.gz
```

### B. 把 tar.gz 传到 Mac mini

任选：
- **AirDrop**：右键 → 共享 → AirDrop → 选 Mac mini
- **USB**：拷到 U 盘
- **iCloud Drive**：临时放进去

### C. 在 Mac mini 上

打开 Terminal：

```bash
# 1) 装 Homebrew（如果还没）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2) clone 仓库（如果走 git）
cd ~
git clone https://github.com/<你的用户名>/lingda.git
cd lingda

# 3) 跑迁移脚本
bash deploy/migrate-target.sh ~/Downloads/lingda-export-*.tar.gz
# 中途会让你输 sudo 密码（开机不睡需要 sudo pmset）
```

---

## 五、迁移脚本做了什么

`migrate-source.sh`（MacBook）：
1. `mysqldump sys`（含全部 41+ 用户、所有房间、消息、好友）
2. 拷 `~/Library/Application Support/ngrok/ngrok.yml`（含 authtoken）
3. 拷 `backend/.env*`
4. `git archive HEAD` 出干净的代码
5. 打成一个 `lingda-export-*.tar.gz`

`migrate-target.sh`（Mac mini）：
1. 解包
2. `brew install` node@18 + mysql + nginx + ngrok + pm2
3. 启 MySQL + 导入 dump
4. `npm ci` backend + web，`npm run build` 双方
5. `pm2 start lingda-api lingda-web ngrok-tunnel`
6. `pm2 startup launchd` 让 Mac mini 开机就跑
7. `sudo pmset -a sleep 0 disksleep 0 displaysleep 10 womp 1 autorestart 1`
   - sleep 0：永不睡
   - displaysleep 10：显示器 10 min 关（节能但服务不停）
   - womp 1：网络包唤醒
   - autorestart 1：断电恢复后自动开机

---

## 六、迁移完做这几个验证

```bash
# 1. 三个进程都在
pm2 status
#   ┌─────┬───────────────┬────────┬─────┐
#   │ id  │ name          │ status │ ↺   │
#   ├─────┼───────────────┼────────┼─────┤
#   │ 0   │ lingda-api    │ online │ 0   │
#   │ 1   │ lingda-web    │ online │ 0   │
#   │ 2   │ ngrok-tunnel  │ online │ 0   │
#   └─────┴───────────────┴────────┴─────┘

# 2. 本机健康
curl http://127.0.0.1:3000/api/v1/health   # 后端
curl http://127.0.0.1:4173/                # 前端 preview

# 3. 公网健康
curl -H "ngrok-skip-browser-warning: 1" https://dipped-handset-clarify.ngrok-free.dev/api/v1/health

# 4. 数据完整
mysql -u root -p sys -e "SELECT COUNT(*) FROM User;"  # 应是 41+ 条
```

---

## 七、迁移后清理（在 MacBook 上）

```bash
# 杀掉所有旧的服务进程，避免 ngrok 抢域名
pm2 delete all 2>/dev/null
pkill -f "ngrok http" 2>/dev/null
pkill -f "node.*nest" 2>/dev/null
pkill -f "vite preview" 2>/dev/null

# 删本地 ngrok 配置（避免你以后在 MacBook 误启）
mv ~/Library/Application\ Support/ngrok/ngrok.yml \
   ~/Library/Application\ Support/ngrok/ngrok.yml.archived
```

---

## 八、运维常用命令（在 Mac mini 上）

```bash
pm2 status                 # 三进程状态
pm2 logs lingda-api        # 后端日志
pm2 logs lingda-web        # 前端日志
pm2 logs ngrok-tunnel      # ngrok 隧道日志
pm2 restart lingda-api     # 改完代码重启后端
pm2 reload all             # 三个全重启

# DB 备份（建议每天一次）
mysqldump -u root -p sys | gzip > ~/lingda-backups/sys-$(date +%F).sql.gz
```

---

## 九、未来 push 代码上线

```bash
# MacBook
cd ~/WeChatProjects/miniprogram-9
git add -A && git commit -m "feat: xxx" && git push

# Mac mini（手动 or 写一个 watch）
ssh <user>@<mac-mini-ip> '
  cd ~/lingda && git pull &&
  (cd backend && npm ci && npm run build && pm2 restart lingda-api) &&
  (cd web && npm ci && npm run build && pm2 restart lingda-web)
'
```

或者把上面这段封装成 `deploy/deploy-macmini-update.sh`（已存在）的 SSH 包装版。

---

## 十、回滚

万一迁移 Mac mini 失败：
1. 删 Mac mini 上 `~/lingda`
2. MacBook 重新启动旧进程（之前 nohup 的 cf-tunnel / backend / preview），URL 会切回 trycloudflare 那个老的
3. 老 URL 是 `https://dipped-handset-clarify.ngrok-free.dev` —— 同样可以用，只要 MacBook 重启 ngrok

迁移期间已注册的用户数据保留在 MacBook 的 MySQL 里，DB dump 文件也保留在 tar.gz 里，无数据丢失风险。
