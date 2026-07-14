# 灵搭 LingDa

校园协作匹配平台。围绕 **拼车 / 娱乐 / 学习**，把找搭子、校园贴吧与公告服务放在同一套浅色社区界面里。

当前分支重点：**纯 HTML + CSS 静态前端 UI**（按校园社区草图重做）。接口暂未接入；`backend/` 仍保留原 NestJS 实现供后续联调。

## 产品模块（UI）

| 入口 | 说明 |
|------|------|
| 公告 | 学期节点、平台公告、校园服务网格 |
| 贴吧 | 帖子流、分类筛选、右侧滑入详情（图 / 评论 / 点赞 / 收藏） |
| 搭子 | 拼车 / 娱乐 / 学习 Tab，推荐人与组队列表 |
| 我的 / 个人主页 | 侧栏左上角进自己的主页；点他人头像进 `profile.html` |
| 收藏 · 设置 | 收藏列表与认证/隐私/安全设置（纯 UI） |

登录页提供 **「开发预览 · 直接进入」**，无需账号即可浏览各页。

## 目录结构

```
backend/    NestJS API + Prisma + MySQL（现有后端，本期 UI 未接）
web/        纯静态前端（HTML / CSS / 少量 JS）
deploy/     部署脚本 / Nginx / 迁移说明
docs/       API / schema 文档
```

### `web/` 静态站

```
web/
  index.html            → 跳转 login.html
  login.html            登录（含开发预览入口）
  register.html         注册
  announcements.html    公告
  forum.html            贴吧
  partners.html         搭子
  me.html               我的
  profile.html          他人主页（?u=用户id）
  favorites.html        收藏
  settings.html         设置
  css/                  tokens / base / layout / components / pages
  js/                   nav / forum / users / avatar / profile
  assets/               静态资源占位
```

视觉约定：浅色底 `#F7F8FB`、主色 indigo-600、白卡片 + 软圆角；角色标签用 sky / amber / teal。

## 本地预览（前端）

无需安装 npm 依赖。在 `web/` 下起任意静态服务器即可：

```bash
cd web
npx serve -l 5173 .
```

浏览器打开：http://localhost:5173/

建议路径：登录页 →「开发预览 · 直接进入」→ 公告 → 侧栏切换贴吧 / 搭子等。

直接双击打开 HTML 也可预览部分页面，但相对路径与侧栏高亮在部分浏览器下可能异常，优先用本地服务器。

## 后端（可选，联调时）

```bash
cd backend
npm ci
# 配置 .env 后
npm run start:dev
```

- API：http://127.0.0.1:3000/api/v1  
- 文档：见 [`docs/`](./docs/) 与 [`backend/README.md`](./backend/README.md)

当前静态前端**未请求**后端；联调需后续把表单与列表接到 API。

## 公网部署

历史部署说明见 [`deploy/MIGRATION.md`](./deploy/MIGRATION.md)。静态站可直接由 Nginx / 任意静态托管分发 `web/` 目录。

## 开发说明

- 侧栏当前页高亮：`js/nav.js`（兼容 `/forum` 与 `/forum.html`）
- 贴吧详情抽屉：`js/forum.js`；点赞/收藏状态存在 `localStorage`
- 头像跳转：带 `data-user` 的头像由 `js/avatar.js` 处理；`data-user="me"`（当前用户）不跳转

## 本期明确不做

- 真实登录鉴权 / 发帖 / 匹配 / 聊天接口
- React / Vite / Tailwind 运行时（旧实现已从本分支 `web/` 移除，可从 git 历史找回）
