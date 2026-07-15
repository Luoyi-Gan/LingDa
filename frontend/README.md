# 前端

本目录包含两个互不共享登录态的 Vite + React 应用，共用同一套后端 ` /api/v1 `。

| 应用 | 目录 | 默认开发端口 | 说明 |
|------|------|----------------|------|
| 学生端 | `student/` | `5173` | 公告、贴吧、找搭子、消息、个人中心 |
| 管理端 | `admin/` | `5174` | 审核与运营，独立构建产物 |

## 启动

```bash
# 学生端
cd student && npm ci && npm run dev

# 管理端
cd admin && npm ci && npm run dev
```

| 变量 | 作用 |
|------|------|
| `VITE_API_BASE` | API 根路径，默认 `http://localhost:3000/api/v1` |
| `VITE_UI_PREVIEW` | 设为 `true` 时强制显示学生端「开发预览」按钮 |

构建：

```bash
cd student && npm run build && npm run preview
cd admin && npm run build
```

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
   登录页「开发预览 · 免密进入」→ `POST /auth/preview` → 真实 JWT。需要后端已启动且数据库可用。生产构建默认不显示该按钮（除非显式 `VITE_UI_PREVIEW=true`）。

3. **导航**  
   桌面侧栏：公告、贴吧、找搭子、消息 + 底栏头像进「我的」。  
   移动底栏：公告、贴吧、搭子、消息、我的。  
   组队 / 收藏 / 设置从「我的」进入。

4. **头像**  
   他人头像打开名片；自己头像进 `/me`。

更完整的环境与排错说明见仓库根目录 [`README.md`](../README.md)。
