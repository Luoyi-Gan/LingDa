# 校园搭子 · 后端 API 契约 v1.2

> 本文档是 **后端 / 前端 / DBA** 三方的共同契约。
> v1.2 变更:实现完成,把实际行为回填到契约。
> 历史摘要见末尾 §11 / §12。
>
> **后端实现状态**:✅ 所有端点已落地,smoke 测试全绿(详见 `backend/test/`)。

---

## 0. 全局约定

### 0.1 BaseURL
```
http(s)://<host>/api/v1
```

### 0.2 鉴权
- 除登录/注册接口外,所有接口必须带:
  ```
  Authorization: Bearer <jwt>
  ```
- JWT payload:`{ sub: userId, iat, exp }`,有效期 7 天。
- 鉴权失败统一返回 `code=10001`。

### 0.3 统一响应封装
所有接口(含错误)统一返回:
```json
{ "code": 0, "data": { ... }, "msg": "ok" }
```
- `code === 0` 表示成功;其他参考 §0.7。
- 列表类接口 `data` 形如 `{ list: [...], total, page, pageSize }`。

### 0.4 分页参数
Query string:`page` 从 1,默认 1;`pageSize` 默认 20,上限 50。

### 0.5 时间格式
ISO 8601 字符串:`"2026-05-13T16:00:00.000Z"`。

### 0.6 关键枚举(严格对齐 DB CHECK 约束)

| 枚举名 | 取值 | 说明 |
|---|---|---|
| `roomType` | `carpool` / `entertainment` / `group` | ISA 子表分发(注:DB 里学习类型叫 `group`,**不是 `study`**) |
| `room.status` | `open` / `full` / `finished` / `cancelled` | 房间生命周期 |
| `member.status` | `pending` / `approved` / `rejected` / `left` | 成员状态机(退出叫 `left`) |
| `friendship.status` | `pending` / `accepted` / `rejected` | 好友请求工作流 |
| `joinRule` | `direct` / `audit` / `password` | 加入规则(直接进 / 房主审核 / 口令) |
| `msgPermission` | `all` / `friends` / `none` | 谁可以给我私聊 |
| `accountStatus` | `normal` / `restricted` / `banned` | 账号状态 |
| `convType` | `group` / `private` | 会话类型 |

### 0.7 错误码表

| code | HTTP | 含义 |
|---|---|---|
| 0 | 200 | 成功 |
| 10001 | 401 | 未登录 / token 失效 |
| 10002 | 403 | 无权限 |
| 10003 | 400 | 入参校验失败 |
| 10004 | 403 | 账号被限制 / 封禁 |
| 11001 | 409 | 学号已注册 |
| 11002 | 401 | 学号或密码错误 |
| 20001 | 404 | 资源不存在 |
| 30001 | 409 | 房间已满 |
| 30002 | 409 | 房间已结束或已取消 |
| 30003 | 409 | 重复申请 |
| 30004 | 403 | 非房主操作被禁 |
| 30005 | 409 | 房间未完成,不可评价 |
| 30006 | 409 | 重复评价 |
| 30007 | 400 | 加入需口令且口令错误 |
| 40001 | 403 | 被对方拉黑,不可操作 |
| 40002 | 409 | 重复发送好友请求 |
| 99999 | 500 | 服务器内部错误 |

### 0.8 字段约定:头像

DB 没有 `avatarText / avatarColor`。后端根据 `username` 用确定性 hash 生成,**所有用户类出参一并返回**,前端不需要再自己生成。

---

## 1. Auth 模块

> 认证模式:**学号 + 密码**(对齐 DB `User.user_id` + `User.password_hash`)。

### 1.1 注册
**POST** `/auth/register` *(无需鉴权)*

入参:
```json
{
  "userId": "2021xxxx",
  "username": "小柚",
  "realName": "李柚子",
  "password": "至少 6 位",
  "phone": "13900008421",
  "college": "新闻与传播学院",
  "major": "网络与新媒体",
  "gender": "女"
}
```
出参:`{ "token": "<jwt>", "user": { /* 同 §2.1 */ } }`

业务规则:
- `userId` 全局唯一(学号);冲突 → `11001`
- `phone` 全局唯一
- 后端做 bcrypt 哈希存 `password_hash`
- 注册成功直接签发 token,前端无需再走登录

### 1.2 登录
**POST** `/auth/login` *(无需鉴权)*

入参:
```json
{ "userId": "2021xxxx", "password": "..." }
```
出参:`{ "token": "<jwt>", "user": { /* 同 §2.1 */ } }`

业务规则:
- 学号 + 密码核对
- 错误 → `11002`(模糊提示,防枚举)
- `accountStatus !== 'normal'` → `10004`

### 1.3 刷新 token
**POST** `/auth/refresh`

入参:`{ "refreshToken": "..." }`
出参:`{ "token": "<新jwt>" }`

### 1.4 修改密码
**PATCH** `/users/me/password`(放在 user 路由下,鉴权)

入参:`{ "oldPassword": "...", "newPassword": "..." }`
出参:`{ "ok": true }`

---

## 2. User 模块

### 2.1 获取当前用户基础信息
**GET** `/users/me`

出参:
```json
{
  "userId": "2021xxxx",
  "username": "小柚",
  "realName": "李柚子",
  "avatarText": "柚",
  "avatarColor": "#9C5BA0",
  "gender": "女",
  "college": "新闻与传播学院",
  "major": "网络与新媒体",
  "phone": "139****8421",
  "tags": ["i人", "爱看演唱会", "喜欢自习"],
  "isSearchable": true,
  "msgPermission": "all",
  "creditScore": 5.00,
  "accountStatus": "normal"
}
```

业务规则:
- DB 里 `tags` 是 `VARCHAR(255)` 用 `,` 分隔的字符串;后端切成数组返回
- `phone` 出参做掩码

### 2.2 更新当前用户信息
**PATCH** `/users/me`

入参(全部字段可选):
```json
{
  "username": "小柚",
  "realName": "李柚子",
  "gender": "女",
  "college": "新闻与传播学院",
  "major": "网络与新媒体",
  "phone": "13900008421",
  "tags": ["i人", "爱看演唱会"],
  "isSearchable": true,
  "msgPermission": "all"
}
```
出参:返回更新后的完整对象(同 §2.1)。

业务规则:
- `tags` 数组后端拼成 `,` 分隔字符串存库
- 密码 / userId / creditScore / accountStatus **不允许** 通过此接口改

### 2.3 获取用户公开主页(对应 UI 图5)
**GET** `/users/:userId/profile`

出参:
```json
{
  "user": { /* 同 §2.1,不含 phone */ },
  "stats": {
    "postCount": 23,
    "matchedUserCount": 156,
    "evaluationCount": 156
  },
  "rating": {
    "average": 4.9,
    "total": 156,
    "distribution": [
      { "stars": 5, "count": 137, "pct": 88 },
      { "stars": 4, "count": 14,  "pct": 9  },
      { "stars": 3, "count": 3,   "pct": 2  },
      { "stars": 2, "count": 2,   "pct": 1  },
      { "stars": 1, "count": 0,   "pct": 0  }
    ]
  },
  "achievements": [
    { "id": "a1", "emoji": "🚀", "name": "初次组队", "desc": "完成第一次组队", "got": true,  "color": "#FF6B6B" },
    { "id": "a5", "emoji": "👑", "name": "校园之星", "desc": "评分进入 Top 1%", "got": false, "color": "#FF8E53" }
  ]
}
```

业务规则:
- **评分实时算**(`MatchEvaluate` JOIN `MatchMember` 反查到 `target user_id`):
  ```sql
  SELECT AVG(e.score) FROM Match_Evaluate e
  JOIN Match_Member m ON e.to_member_id = m.member_id
  WHERE m.user_id = ?
  ```
- **分布实时算**:`GROUP BY score`,5→1 各档计数
- `stats.postCount` = `Match_Room` 中 `creator_id = ?` 且 `status != 'cancelled'` 的房间数
- `stats.matchedUserCount` = 当前用户 approved 成员所在的所有房间里,**去重**的其他 approved 成员数
- **成就规则**(后端实时判定,不存表):

| id | 名称 | 规则 |
|---|---|---|
| `a1` | 初次组队 | 完成 ≥ 1 个 finished 房间 |
| `a2` | 准时之星 | 完成 ≥ 10 个 finished 房间 |
| `a3` | 满分搭子 | 收到 ≥ 100 个 5 星评价 |
| `a4` | 百次组队 | 完成 ≥ 100 个 finished 房间 |
| `a5` | 校园之星 | 评分 ≥ 4.95 且 总评价数 ≥ 50 |
| `a6` | 学霸搭子 | 完成 ≥ 50 次 `group` 类房间 |

### 2.4 获取用户收到的评价列表(分页)
**GET** `/users/:userId/evaluations?page=1&pageSize=10`

出参:
```json
{
  "list": [
    {
      "evaluateId": 1,
      "fromUserId": "2021xxxx",
      "fromUsername": "Cherry",
      "fromAvatarText": "C",
      "fromAvatarColor": "#5B7CC9",
      "score": 5,
      "content": "超准时!",
      "activity": "拼车 · 虹桥火车站",
      "activityColor": "#5B7CC9",
      "roomType": "carpool",
      "createdAt": "2026-05-10T09:23:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "pageSize": 10
}
```

业务规则:
- JOIN 路径:`MatchEvaluate.toMemberId → MatchMember(toMember) → User.userId == :userId`
- `fromUserId` 通过 `MatchMember(fromMember).user_id` 拼回
- `activity` 拼自 `MatchRoom.title`,`activityColor` 按 `roomType` 取主题色(后端常量表)

---

## 3. Room 模块

### 3.1 发布房间(三个端点对应三个 ISA 子表)

#### 公共字段(写 `Match_Room` 超类)
```jsonc
{
  "title": "...",            // 必填
  "content": "...",          // 选填,长描述
  "totalNum": 4,             // 必填, ≥ 2
  "meetTime": "ISO",         // 选填
  "meetLocation": "...",     // 选填
  "joinRule": "direct",      // 默认 direct;direct/audit/password
  "joinPassword": "...",     // 仅 joinRule === 'password' 必填
  "tags": ["不抽烟", "准时"]  // 选填,后端拼 `,` 分隔
}
```

#### 3.1.1 发布拼车
**POST** `/rooms/carpool`

子表字段(写 `Carpool_Room`):
```json
{
  "...(公共)": "",
  "startLocation": "学校南门",
  "endLocation": "虹桥火车站",
  "carType": "7座SUV",
  "costSplit": 50
}
```

#### 3.1.2 发布娱乐
**POST** `/rooms/entertainment`

子表字段(写 `Entertainment_Room`):
```json
{
  "...(公共)": "",
  "entType": "演唱会",
  "cost": 380,
  "equipment": "票已订"
}
```

#### 3.1.3 发布学习小组
**POST** `/rooms/group`

子表字段(写 `Group_Room`):
```json
{
  "...(公共)": "",
  "courseName": "高等数学 B",
  "groupTarget": "互相抽查公式 / 一起做模拟卷",
  "requireSkill": "看完前 3 章"
}
```

#### 三类共同出参
```json
{
  "roomId": 1001,
  "roomType": "carpool",
  "status": "open",
  "currentNum": 1,
  "createTime": "2026-05-13T08:00:00.000Z"
}
```

业务规则:
- 创建后自动在 `Match_Member` 插一条 `(roomId, creatorId, status='approved')`
- `currentNum = 1`,`status = 'open'`
- 校验 `meetTime > createTime`(DB 已有 CHECK 约束)
- 校验 `totalNum ≥ 2`(DB 已有 CHECK 约束)
- 用事务保证主表 + 子表 + 第一条 member 三步原子

### 3.2 列表查询

#### 3.2.1 拼车列表
**GET** `/rooms/carpool?sort=time|hot&page=1&pageSize=20`

#### 3.2.2 娱乐列表
**GET** `/rooms/entertainment?cat=全部|演唱会|剧本杀|KTV|观影|展览|密室&sort=time|hot&page=1&pageSize=20`

#### 3.2.3 学习小组列表
**GET** `/rooms/group?sort=time|hot&page=1&pageSize=20`

三类共同业务规则:
- 默认只返回 `status='open'` 且(`meetTime IS NULL` 或 `meetTime > now()`)
- `sort=time` → `meetTime` 升序(NULL 排末尾)
- `sort=hot` → `currentNum/totalNum` 降序
- 出参字段名 = DB 字段名 camelCase 化
- **拼车**列表项额外返回 `seats[]`(按 `totalNum` 占座位,前 `currentNum` 个填 approved 成员的头像)
- **娱乐**列表项额外返回 `creator`(嵌套创建者头像)
- **学习**列表项额外返回 `badge`(后端按 `courseName` 映射:"高等数学"→ `数`、"法理学"→ `法`、未知 → 课程首字)

### 3.3 房间详情
**GET** `/rooms/:roomId`

出参:
```json
{
  "room": {
    "roomId": 1001,
    "roomType": "carpool",
    "title": "...",
    "content": "...",
    "totalNum": 4,
    "currentNum": 2,
    "meetTime": "...",
    "meetLocation": "...",
    "status": "open",
    "joinRule": "direct",
    "tags": ["不抽烟"],
    "createTime": "...",
    "...子表字段": ""
  },
  "creator": {
    "userId": "2021xxxx",
    "username": "Cherry",
    "avatarText": "C",
    "avatarColor": "#5B7CC9",
    "rating": 4.9,
    "ratingCount": 86,
    "postCount": 18,
    "tags": ["e人", "准时"]
  },
  "members": [
    {
      "memberId": 9001,
      "userId": "2021xxxx",
      "username": "Cherry",
      "avatarText": "C",
      "avatarColor": "#5B7CC9",
      "isOwner": true,
      "status": "approved",
      "joinTime": "..."
    }
  ],
  "myMembership": {
    "exists": true,
    "memberId": 9001,
    "status": "approved",
    "isOwner": true
  },
  "canEvaluate": false
}
```

业务规则:
- `isOwner` = (`member.userId === room.creatorId`),DB 无 role 字段
- `creator.rating / ratingCount` 即时聚合
- `canEvaluate` = (`room.status === 'finished'` ∧ 我是 approved 成员 ∧ 还有未评价对象)

### 3.4 大厅聚合(对应 UI 图1)
**GET** `/hall/dashboard`

一次返回大厅页所有数据:
```json
{
  "user": { "userId": "...", "username": "小柚", "avatarText": "柚", "avatarColor": "#9C5BA0" },
  "upcoming": {
    "roomId": 1001,
    "roomType": "carpool",
    "title": "南门 → 虹桥火车站",
    "accent": "#4A6FA5",
    "accentLabel": "拼车",
    "meetLabel": "今天 16:00",
    "countdown": "3 小时后",
    "meetLocation": "学校南门",
    "currentNum": 2,
    "totalNum": 4
  },
  "counts": { "carpool": 3, "entertainment": 6, "group": 5 },
  "hot": [
    {
      "roomId": 2002,
      "roomType": "entertainment",
      "accent": "#C8567E",
      "accentLabel": "娱乐",
      "title": "...",
      "subtitle": "推理馆 · 大学路店",
      "meetLabel": "周五 14:00",
      "currentNum": 4,
      "totalNum": 6,
      "pct": 67
    }
  ],
  "onlineCount": 1284,
  "matchToday": 68
}
```

业务规则:
- `upcoming` = 当前用户 approved 且 `meetTime > now()` 中最早一条
- `counts` = 三类 `status='open'` 且 `meetTime > now()` 且 `currentNum < totalNum` 的数量
- `hot` = 三类合并按 `currentNum/totalNum` 倒序前 4
- `onlineCount` MVP 阶段返回最近 N 分钟有消息发送的用户数

### 3.5 房主操作

| 端点 | 作用 | DB 操作 |
|---|---|---|
| `PATCH /rooms/:roomId/cancel` | 解散 | `status = 'cancelled'` |
| `PATCH /rooms/:roomId/finish` | 标记结束 | `status = 'finished'` |

业务规则:
- 仅 `creator_id === currentUser` 可调,否则 `30004`
- `cancel` 在任何非 `finished` 状态下可调
- `finish` 仅在 `open` 或 `full` 状态下可调
- `finish` 后该房间所有成员才可互评(§5)

---

## 4. Member 模块

### 4.1 申请加入房间
**POST** `/rooms/:roomId/members`

入参(根据房间 `joinRule` 不同):
```json
{ "joinPassword": "...仅 password 模式必填" }
```

出参:
```json
{ "memberId": 9001, "status": "approved" }
```
或 `pending`。

业务规则:
- 房间不可加入条件 → 对应错误码:`open` 且未满才允许;其余 → `30002`
- **重申机制(实现注)**:`Match_Member` 上有 `UNIQUE(room_id, user_id)`,所以一个用户在同一房间只存一行。
  - 已有记录 `status ∈ (approved, pending)` → 30003 重复申请
  - 已有记录 `status ∈ (rejected, left)` → 同一行 UPDATE 回 `pending/approved`(`joinTime` 也刷新)
  - 旧 status 历史不保留(v1.0 契约里"留痕新插"被 DB schema 决定改为 UPDATE)
- `joinRule === 'direct'` → 直接 `approved`,`currentNum + 1`,若 `currentNum === totalNum` 则 `status = 'full'`
- `joinRule === 'audit'` → `pending`,不动 `currentNum`
- `joinRule === 'password'` → 校验 `joinPassword`,通过则同 `direct`,否则 `30007`

### 4.2 列出房间成员
**GET** `/rooms/:roomId/members?status=approved`

出参 list[]:
```json
{
  "memberId": 9001,
  "userId": "2021xxxx",
  "username": "Cherry",
  "avatarText": "C",
  "avatarColor": "#5B7CC9",
  "isOwner": true,
  "status": "approved",
  "joinTime": "..."
}
```

### 4.3 列出房间申请(房主视角)
**GET** `/rooms/:roomId/applications`

出参 list[]:
```json
{
  "memberId": 9002,
  "userId": "2021xxxx",
  "username": "阿橙",
  "avatarText": "阿",
  "avatarColor": "#9C5BA0",
  "joinTime": "...",
  "rating": 4.9,
  "ratingCount": 95
}
```
权限:仅 creator 可访问。返回 `status='pending'` 的成员。

### 4.4 审批申请
**PATCH** `/rooms/:roomId/applications/:memberId`

入参:`{ "action": "approve" }` 或 `{ "action": "reject" }`

出参:`{ "memberId": 9002, "status": "approved" }`

业务规则:
- 仅 creator 可调
- `approve` 时房间已满 → `30001`;成功则 `currentNum + 1`,可能触发 `full`
- `reject` 直接改 `status = 'rejected'`

### 4.5 退出房间
**DELETE** `/rooms/:roomId/members/me`

业务规则:
- 当前用户必须是该房间的 approved 成员且**不是 owner**(owner 想走 = §3.5 cancel)
- 退出后 `currentNum - 1`,房间原本 `full` 时回滚为 `open`
- 该 member 记录改为 `status = 'left'`

### 4.6 我的申请列表
**GET** `/users/me/applications?status=pending|approved|rejected|left&page=1`

出参 list[]:
```json
{
  "memberId": 9002,
  "roomId": 1003,
  "roomType": "carpool",
  "title": "北门 → 杭州东站",
  "creatorId": "2021xxxx",
  "accent": "#4A6FA5",
  "status": "pending",
  "statusLabel": "待车主同意",
  "joinTime": "..."
}
```

### 4.7 我加入的房间
**GET** `/users/me/rooms?phase=ongoing|completed&page=1`

业务规则:
- `phase=ongoing` → `room.status ∈ (open, full)`
- `phase=completed` → `room.status = 'finished'`

---

## 5. Evaluation 模块

### 5.1 提交评价
**POST** `/rooms/:roomId/evaluations`

入参(对前端友好,用 userId):
```json
{
  "targetUserId": "2021xxxx",
  "score": 5,
  "content": "超准时!"
}
```

出参:`{ "evaluateId": 1 }`

业务规则:
- `room.status === 'finished'`,否则 `30005`
- 后端先查:
  - `fromMember = MatchMember(roomId, currentUser, status='approved')`
  - `toMember   = MatchMember(roomId, targetUserId, status='approved')`
- 二者缺一 → `10002`
- 唯一约束 `(fromMemberId, toMemberId)` 已防重评 → 触发时返回 `30006`
- DB trigger `trg_check_evaluation_same_room` 还会再校验一次同房间(防御性)
- `score ∈ [1,5]`,`content` 长度 ≤ 1000

### 5.2 列出房间内的评价
**GET** `/rooms/:roomId/evaluations`

出参 list[]:
```json
{
  "evaluateId": 1,
  "fromUserId": "2021xxxx",
  "fromUsername": "小柚",
  "targetUserId": "2021xxxx",
  "targetUsername": "Cherry",
  "score": 5,
  "content": "超准时!",
  "createTime": "..."
}
```

---

## 6. Social 模块

> DB `Friendship.status` 是请求工作流:`pending → accepted/rejected`,所以好友是两步走(请求 → 接受)。

### 6.1 好友列表
**GET** `/social/friends`

只返回 `status='accepted'` 的;两侧都展开。

出参 list[]:
```json
{
  "userId": "2021xxxx",
  "username": "Cherry",
  "avatarText": "C",
  "avatarColor": "#5B7CC9",
  "online": true,
  "lastSeen": "在线"
}
```

### 6.2 发起好友请求
**POST** `/social/friend-requests`

入参:`{ "targetUserId": "2021xxxx" }`
出参:`{ "friendId": 123, "status": "pending" }`

业务规则:
- 已是好友或已存在 pending 请求 → `40002`
- 若对方已拉黑当前用户 → `40001`
- 写入一条 `Friendship(user1=currentUser, user2=target, status='pending')`

### 6.3 收到的好友请求
**GET** `/social/friend-requests?direction=incoming|outgoing`

出参 list[]:
```json
{
  "friendId": 123,
  "userId": "2021xxxx",
  "username": "阿橙",
  "avatarText": "阿",
  "avatarColor": "#9C5BA0",
  "createTime": "..."
}
```

### 6.4 处理好友请求
**PATCH** `/social/friend-requests/:friendId`

入参:`{ "action": "accept" }` 或 `{ "action": "reject" }`
出参:`{ "friendId": 123, "status": "accepted" }`

### 6.5 删除好友
**DELETE** `/social/friends/:userId`

业务规则:把双方关联的 `Friendship` 记录全删。

### 6.6 黑名单
- **GET** `/social/blocks` → 我拉黑的人列表
- **POST** `/social/blocks` `{ "targetUserId": "..." }` → 拉黑
- **DELETE** `/social/blocks/:userId` → 解除

业务规则:
- 拉黑同时自动删除双方所有 `Friendship` 记录
- 拉黑后双方互不可发私聊
- 黑名单是单向的(blocker → blocked),但应用层校验双向(避免私聊)

---

## 7. Chat 模块

### 7.1 REST 部分

#### 7.1.1 在线 / 最近联系人横幅
**GET** `/chat/online-friends`

出参 list[](≤ 8 条):好友里最近 N 分钟有过消息发送的。

#### 7.1.2 会话列表
**GET** `/chat/conversations`

出参 list[]:
```json
{
  "convId": "group_1001",
  "type": "group",
  "name": "南门 → 虹桥火车站",
  "iconEmoji": "🚗",
  "iconColor": "#5B7CC9",
  "avatarText": null,
  "avatarColor": null,
  "userId": null,
  "roomId": 1001,
  "lastMsg": "Cherry: 我已经在校门口了 😋",
  "lastTime": "刚刚",
  "lastTimestamp": "...",
  "unread": 2,
  "online": true
}
```

业务规则:
- **群聊会话** = 当前用户 `Match_Member.status='approved'` 的所有房间
- **私聊会话** = `Message` 表里 (sender, receiver) 含当前用户的对端聚合
- `convId` 形如 `group_<roomId>` 或 `private_<otherUserId>`
- 后端按 `Message.sendTime` MAX 倒序
- `lastTime` 是后端格式化的"刚刚 / N 分钟前 / 昨天 / 周一"
- **`unread` 近似算法**(DB 无 cursor 表):
  - 应用层维护内存表 `lastViewMap[userId][convId] = timestamp`
  - `unread` = `COUNT(*) FROM Message WHERE convId 命中 AND sendTime > lastView`
  - 进程重启清零,前端能接受;后续可扩 Redis

#### 7.1.3 历史消息
**GET** `/chat/conversations/:convId/messages?before=<msgId>&pageSize=30`

`:convId` 形如 `group_<roomId>` 或 `private_<otherUserId>`。

出参 list[](倒序):
```json
{
  "msgId": 10001,
  "fromUserId": "2021xxxx",
  "fromUsername": "Cherry",
  "fromAvatarText": "C",
  "fromAvatarColor": "#5B7CC9",
  "content": "我已经在校门口了 😋",
  "sendTime": "...",
  "isMe": false
}
```

#### 7.1.4 发送消息(REST 兜底,主链路走 WebSocket)
**POST** `/chat/messages`

入参(二选一):
```json
{ "roomId": 1001, "content": "OK 👍" }
```
或
```json
{ "targetUserId": "2021xxxx", "content": "好的好的" }
```

出参:返回完整 message 对象。

业务规则:
- 群聊:校验当前用户是该房间的 `approved` 成员
- 私聊:校验对方 `msgPermission`(`all` 通过 / `friends` 仅好友 / `none` 拒绝),且未互拉黑

#### 7.1.5 标记已读
**POST** `/chat/conversations/:convId/read`

入参:`{}`(以服务器时间为锚)
出参:`{ "ok": true }`

业务规则:更新内存 `lastViewMap[currentUser][convId] = now()`。

### 7.2 WebSocket 部分

**连接**:`ws://<host>/ws/chat?token=<jwt>`

**Server → Client 事件**:

| event | payload | 触发时机 |
|---|---|---|
| `message:new` | 完整 message 对象 + `convId` | 任何与我相关的会话有新消息 |
| `presence:update` | `{ userId, online }` | 我的好友上下线 |
| `conversation:update` | `{ convId, unread, lastMsg, lastTime }` | 用于横向更新会话列表 |

**Client → Server 事件**:

| event | payload | 作用 |
|---|---|---|
| `message:send` | `{ roomId? \| targetUserId?, content }` | 发消息(等价于 §7.1.4) |
| `conversation:enter` | `{ convId }` | 进入会话,自动标记已读 |
| `conversation:leave` | `{ convId }` | 离开会话 |
| `presence:ping` | (空) | 心跳,每 30s |

---

## 8. UI ↔ API 速查表

| UI 页面 | 主要调用 |
|---|---|
| 大厅 (图1) | `GET /hall/dashboard` |
| 帖子 - 拼车 (图2) | `GET /rooms/carpool?sort=hot` |
| 帖子 - 娱乐 (图2) | `GET /rooms/entertainment?cat=全部` |
| 帖子 - 学习 (图3) | `GET /rooms/group?sort=time` |
| 详情 - 拼车 | `GET /rooms/:roomId` + `POST /rooms/:roomId/members` |
| 发布(三个 form) | `POST /rooms/carpool` / `entertainment` / `group` |
| 匹配结果 | `GET /rooms/:roomId/applications`(房主)/ `GET /users/me/applications`(申请人) |
| 聊天 (图4) | `GET /chat/online-friends` + `GET /chat/conversations` + WS |
| 聊天详情 | `GET /chat/conversations/:convId/messages` + WS `message:send` |
| 我的 (图5) | `GET /users/me` + `GET /users/:userId/profile` + `GET /users/:userId/evaluations` |

---

## 9. 应用层补丁(DB 没有但代码需要)

| 关注点 | DB 是否有 | 应用层方案 |
|---|---|---|
| 头像文字/颜色 | ❌ | 后端按 `username` hash 生成,所有用户类出参附带 |
| `tags` 数组 | DB 存 VARCHAR(255) | 后端按 `,` 切分 / 拼接 |
| 在线状态 | ❌ | 由 WebSocket Gateway 维护内存 presence map |
| 学习类 `badge` | ❌ | 后端按 `courseName` 映射常量表 |
| 娱乐类 `coverColor / coverEmoji` | ❌ | 后端按 `entType` 映射常量表 |
| `joinRule = password` 的口令 | ✅(v1.1 补字段) | DBA 应用 `docs/migrations/2026-05-14_add_join_password.sql` 后,字段 `Match_Room.join_password` 可用 |

### v2.0 待办(本期不实现)

| 关注点 | 临时方案(v1.1) | v2.0 计划 |
|---|---|---|
| 消息未读数 / 已读位置 | 应用层内存 `lastViewMap`,**进程重启清零** | DB 加 `Message_Read_Cursor(user_id, conv_id, last_read_msg_id)` 表 + Redis 缓存 |
| 在线状态持久化 | WebSocket 内存 presence map | Redis pub/sub 跨实例同步 |

---

## 10. 给 DBA 的关注点

- 主键索引 / 唯一索引 / 外键约束已在 SQL 中,无需再加
- 已建索引(SQL 第 249-280 行):
  - `Match_Room(room_type, status, meet_time)`
  - `Match_Room(creator_id)`
  - `Match_Member(user_id)`
  - `Match_Member(room_id, status)`
  - `Message(room_id, send_time)`
  - `Message(sender_id, receiver_id, send_time)`
  - `Friendship(user_id_1)` / `(user_id_2)`
  - `Blacklist(blocker_id)`
  - `Carpool_Room(start_location, end_location)`
  - `Group_Room(course_name)`
- 建议补充(不阻塞 v1.1):
  - `Match_Evaluate(to_member_id)` —— 评分聚合查询的瓶颈

---

## 11. v1.0 → v1.1 变更摘要

| 维度 | v1.0 | v1.1(DB 对齐) |
|---|---|---|
| 认证 | 微信登录 wx-login | 学号 + 密码 |
| 学习类 roomType | `study` | `group` |
| room.status | `recruiting/full/completed/cancelled` | `open/full/finished/cancelled` |
| member.status 退出 | `quit` | `left` |
| 加入规则 | `auditMode = auto/manual` | `joinRule = direct/audit/password` |
| 评价表外键 | userId 直连 | from/to 都是 `member_id`,后端做映射 |
| 好友 | 直接互为好友 | 请求 → 接受工作流(`status` pending/accepted/rejected) |
| 房主 role | DB 字段 | DB 无,用 `creatorId` 比较 |
| 性别偏好 / 必填条件 | 字段 | DB 无,删 |
| 头像 / unread / 在线 / badge / coverEmoji | 假设 DB 有 | DB 无,应用层补丁 |
| `complete` → `finish` | `complete` | `finish`(对齐 `status='finished'`) |

---

## 12. 版本记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-05-13 | 初版 |
| v1.1 | 2026-05-14 | 全面对齐 DBA 实际 SQL,见 §11 |
| v1.2 | 2026-05-15 | 后端实现完成,回填实现细节(UPDATE 重申、WS 实现、UnreadService 内存版) |

---

## 13. 实现备忘(v1.2 回填)

### 错误码补全
v1.0/v1.1 没列全的码,实现中已加:

| code | 含义 | 出现位置 |
|---|---|---|
| 10004 | 账号被限制 / 封禁 | 登录时 `accountStatus !== 'normal'` |
| 11001 | 学号或手机号已注册 | 注册冲突 |
| 11002 | 学号或密码错误 | 登录失败(防枚举模糊化) |
| 30007 | 加入口令错误 | `joinRule=password` 校验失败 |
| 40002 | 重复发好友请求 | 已存在 pending/accepted |

### 应用层补齐 5 处 SQL CHECK
MySQL 8.0 < 8.0.32 不允许 CHECK 引用 CASCADE FK,以下 5 处搬到 Service:

| 原 CHECK | Service 实现位置 |
|---|---|
| Friendship.not_self | `SocialService.sendFriendRequest`(返 10002) |
| Blacklist.not_self | `SocialService.blockUser`(返 10002) |
| Message.target(私聊/群聊互斥) | `ChatService.sendMessage`(返 10003) |
| Message.not_self | `ChatService.sendPrivate`(返 10002) |
| Match_Evaluate.not_self | `EvaluationService.create`(返 10002) |

### WebSocket 实际落地细节
- Namespace:`/ws/chat`
- 鉴权:`query.token` 或 `Authorization: Bearer`,verify 不过即断开
- `PresenceService` 支持**多设备**(同 userId 多 socket)
- `message:new` **REST 与 WS 共享 fan-out 通道** —— Controller 写完调 `gateway.broadcastNewMessage(...)`,WS 写完同样调,逻辑统一
- `presence:update` **只推给好友**,不广播全网
- 单消息收到的对象:
  - 群聊 → 该房间所有 approved 成员(含发送者其他设备)
  - 私聊 → 发送者 + 接收者
- ack 回 `{ ok, message? }` 或 `{ ok: false, code, msg }`,前端可 await

