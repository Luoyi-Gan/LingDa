#!/usr/bin/env node
/**
 * Step 3.9 WebSocket 冒烟测试
 *
 * 流程:
 *   1) HTTP 注册 O + A,各自拿 token
 *   2) O 发拼车房间,A 申请并 approved
 *   3) A 用 socket.io-client 连 /ws/chat
 *   4) O 用 socket.io-client 连 /ws/chat
 *   5) A 监听 'message:new'
 *   6) O 通过 WS event 'message:send' 发群聊
 *   7) A 应在 ≤ 2 秒内收到 'message:new'
 *   8) 私聊同理
 *
 * 用法:
 *   node test/3.9-ws-smoke.js
 *
 * 前置:
 *   npm install         # 装 socket.io-client(已加入 package.json)
 *   npm run start:dev   # 后端在跑
 */

let ioClient;
try {
  ioClient = require('socket.io-client').io;
} catch {
  console.error('❌ 缺 socket.io-client。请先在 backend/ 跑:\n  npm install');
  process.exit(1);
}

const HOST = 'http://localhost:3000';
const BASE = `${HOST}/api/v1`;

async function http(method, path, headers = {}, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

function connectWs(token, label) {
  return new Promise((resolve, reject) => {
    const sock = ioClient(`${HOST}/ws/chat`, {
      query: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    const t = setTimeout(() => reject(new Error(`${label} connect timeout`)), 4000);
    sock.on('connect', () => {
      clearTimeout(t);
      console.log(`✅ ${label} 已连(socket=${sock.id})`);
      resolve(sock);
    });
    sock.on('connect_error', (e) => {
      clearTimeout(t);
      reject(new Error(`${label} connect_error: ${e.message}`));
    });
  });
}

function waitFor(sock, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`等待 ${event} 超时`)), timeoutMs);
    sock.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

(async () => {
  const TS = Date.now();
  const O_ID = '20' + String(TS).slice(-8);
  const A_ID = '21' + String(TS).slice(-8);

  console.log('=== [1/8] 注册 O + A ===');
  const oReg = await http('POST', '/auth/register', {}, {
    userId: O_ID, username: 'O_' + TS, realName: 'O_' + TS,
    password: 'abcd1234', phone: '139' + String(TS).slice(-8),
    college: '测试学院',
  });
  const aReg = await http('POST', '/auth/register', {}, {
    userId: A_ID, username: 'A_' + TS, realName: 'A_' + TS,
    password: 'abcd1234', phone: '138' + String(TS).slice(-8),
    college: '测试学院',
  });
  const oToken = oReg?.data?.token;
  const aToken = aReg?.data?.token;
  if (!oToken || !aToken) { console.error(oReg, aReg); process.exit(1); }
  console.log(`O=${O_ID} A=${A_ID}`);

  console.log('\n=== [2/8] O 发 direct 拼车 + A 申请 ===');
  const meet = new Date(Date.now() + 2 * 86400 * 1000).toISOString();
  const room = await http('POST', '/rooms/carpool', bearer(oToken), {
    title: 'ws_test_' + TS, totalNum: 4, meetTime: meet,
    meetLocation: '南门', startLocation: '南门', endLocation: '虹桥',
  });
  const RID = room?.data?.roomId;
  console.log('roomId=' + RID);
  const apply = await http('POST', `/rooms/${RID}/members`, bearer(aToken), {});
  console.log('A member status=' + apply?.data?.status);

  console.log('\n=== [3/8] A 连接 WS ===');
  const sockA = await connectWs(aToken, 'A');
  console.log('\n=== [4/8] O 连接 WS ===');
  const sockO = await connectWs(oToken, 'O');

  // 等一拍让 server 处理 presence
  await new Promise((r) => setTimeout(r, 200));

  console.log('\n=== [5/8] A 监听 message:new,O 通过 WS 发群聊 ===');
  const aGetGroup = waitFor(sockA, 'message:new', 3000);
  sockO.emit('message:send', { roomId: RID, content: '群聊 hello from O' }, (ack) => {
    console.log('  O emit ack:', JSON.stringify(ack).slice(0, 120));
  });
  const groupMsg = await aGetGroup;
  console.log('  A 收到群聊 message:new:', groupMsg.content, 'isMe=' + groupMsg.isMe);
  if (groupMsg.content !== '群聊 hello from O') throw new Error('群聊内容对不上');

  console.log('\n=== [6/8] O 监听 message:new,A 通过 WS 发私聊给 O ===');
  const oGetPrivate = waitFor(sockO, 'message:new', 3000);
  sockA.emit('message:send', { targetUserId: O_ID, content: '私聊 hi from A' });
  const privateMsg = await oGetPrivate;
  console.log('  O 收到私聊 message:new:', privateMsg.content);
  if (privateMsg.content !== '私聊 hi from A') throw new Error('私聊内容对不上');

  console.log('\n=== [7/8] REST POST 也触发 WS 推送 ===');
  const aGetRest = waitFor(sockA, 'message:new', 3000);
  await http('POST', '/chat/messages', bearer(oToken), { roomId: RID, content: 'REST → WS' });
  const restMsg = await aGetRest;
  console.log('  A 收到 REST 转发的 message:new:', restMsg.content);

  console.log('\n=== [8/8] presence:ping 心跳 ===');
  const pong = await new Promise((res) => {
    sockA.emit('presence:ping', null, (data) => res(data));
    setTimeout(() => res({ timeout: true }), 1500);
  });
  console.log('  ping →', JSON.stringify(pong));

  sockA.disconnect();
  sockO.disconnect();
  console.log('\n✅ 8 个用例已跑完。');
  process.exit(0);
})().catch((err) => {
  console.error('\n❌ 失败:', err?.message || err);
  process.exit(1);
});
