# 前端

本目录包含两个互不共享登录态的 Vite + React 应用，共用同一套后端 `/api/v1`。

| 应用 | 目录 | 默认开发端口 | 说明 |
|------|------|----------------|------|
| 学生端 | `student/` | `5173` | 公告、贴吧、找搭子、消息、个人中心 |
| 管理端 | `admin/` | `5174` | 审核与运营，独立构建产物 |

## 启动

```bash
# 学生端
cd student && npm ci && npm run dev

# 管理端（联调需后端已在 3000 启动）
cd admin
cp .env.example .env   # 若尚无
npm ci && npm run dev
```

| 变量 | 作用 |
|------|------|
| `VITE_API_BASE` | API 根路径；学生端默认 `http://localhost:3000/api/v1`，管理端示例为 `http://127.0.0.1:3000/api/v1` |
| `VITE_UI_PREVIEW` | 设为 `true` 时，非 DEV 构建也显示各端登录页的预览入口 |

构建：

```bash
cd student && npm run build && npm run preview
cd admin && npm run build && npm run preview
```

---

## 学生端结构（摘要）

```
student/src/
├── App.jsx                 # 路由（TabLayout + 全屏二级页）
├── main.jsx                # Provider + RoomDetailDrawer 全局挂载
├── pages/                  # 业务页
├── components/
│   ├── RoomDetailDrawer.jsx
│   ├── HoverableUserAvatar.jsx / UserCard.jsx
│   ├── PublishSheet.jsx / TabLayout.jsx / DesktopNav.jsx / TabBar.jsx
│   └── …
├── lib/
│   ├── api.js              # axios 客户端与业务 API 分组
│   ├── auth.js             # token / 当前用户
│   ├── nav.js              # 小程序风格 navigate → React Router
│   └── roomDetail.js       # 详情抽屉事件与 URL 解析
└── context/                # Auth / UI / Friends
```

## 学生端行为要点

1. **详情抽屉**  
   拼车 / 娱乐 / 学习详情从右侧滑入。列表与表单通过 `openRoomDetail` / `nav.redirectTo(detail-*)` 打开；发布成功会先回到 `/partners` 再开抽屉。

2. **开发预览**  
   登录页「开发预览 · 免密进入」→ `POST /auth/preview` → **真实 JWT**。需要后端已启动且数据库可用。生产构建默认不显示该按钮（除非显式 `VITE_UI_PREVIEW=true`）。

3. **导航**  
   桌面侧栏：公告、贴吧、找搭子、消息 + 底栏头像进「我的」。  
   移动底栏：公告、贴吧、搭子、消息、我的。  
   组队 / 收藏 / 设置从「我的」进入。

4. **头像**  
   他人头像打开名片；自己头像进 `/me`。

---

## 管理端结构（摘要）

```
admin/src/
├── App.jsx                 # 登录门禁 + 业务路由
├── api.js                  # axios；所有请求带真实 JWT
├── auth.js                 # lingda_admin_token / user
├── pages/                  # Dashboard / Announcements / Verifications / Moderation / Login
└── components/             # AdminShell、抽屉、对话框等
```

| 路由 | 说明 |
|------|------|
| `/overview` | 工作台 |
| `/announcements` | 公告；`?tab=milestones` 关键节点 |
| `/verifications` | 认证审核（学生 / 社团 / 官方） |
| `/moderation` | 帖子 / 评论内容审核 |

## 管理端行为要点

1. **正式联调**  
   管理员账号登录 → `POST /auth/login` → JWT 调用 `/admin/*`、公告、上传等。本地可 seed：`ADMIN001`（见根 README）。

2. **开发预览**  
   登录页「开发预览 · 免密进入」→ `POST /auth/preview-admin` → **真实 JWT**（学号 `ADMINPREVIEW`）。需要后端已启动且数据库可用；审核 / 公告会落库，与学生端同库。`DEV` 下默认显示，或设 `VITE_UI_PREVIEW=true`。需要待审样例时可执行 `seed:admin-preview`。

3. **详情**  
   认证与内容审核多为列表 + 右侧抽屉（URL `?id=`），底层列表不跳页。

4. **鉴权**  
   业务码 `10001` / HTTP `401` 清登录态并回 `/login`。Token 与学生端隔离。

更完整的环境与排错说明见仓库根目录 [`README.md`](../README.md)。
