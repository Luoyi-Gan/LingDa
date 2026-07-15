// lib/api.js
// ==========================================================
// 后端 API 客户端
//   request           -> axios
//   auth storage      -> localStorage(经 auth.js)
//   toast / navigate  -> bridge
// 保留原行为：
//   · 加 Authorization Bearer token
//   · 拆 {code, data, msg}；code !== 0 toast + reject
//   · code 10001 → 清 token + 跳登录
//   · 出参 camelCase → snake_case(让旧视图层不用动)
//   · 入参不变(直接传 camelCase 给后端 DTO)
// ==========================================================
import axios from 'axios';
import { toast, navigate } from './bridge';
import { getToken, clearAuth } from './auth';

// 浏览器端默认走 localhost；可用 .env 的 VITE_API_BASE 覆盖（部署改 https 域名）
export const BASE_URL =
  import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';

// ----- 工具:出参 key 深度转 snake_case -----
function camelToSnake(s) {
  return s.replace(/[A-Z]/g, (l) => '_' + l.toLowerCase());
}
function transformKeysDeep(obj) {
  if (Array.isArray(obj)) return obj.map(transformKeysDeep);
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const out = {};
    for (const k of Object.keys(obj)) {
      out[camelToSnake(k)] = transformKeysDeep(obj[k]);
    }
    return out;
  }
  return obj;
}

const http = axios.create({ baseURL: BASE_URL, timeout: 20000 });

http.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (!(config.data instanceof FormData)) config.headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) config.headers['Authorization'] = 'Bearer ' + token;
  return config;
});

// 核心 request：返回 Promise<解包后的 data(snake_case)>
function request({ method, url, data, headers, query }) {
  return http({ method, url, data, headers, params: query }).then(
    (res) => {
      // HTTP 层 5xx（很少，后端统一返 200 + 内部 code）
      if (res.status >= 500) {
        toast({ title: '服务器错误', icon: 'none' });
        return Promise.reject(new Error('HTTP ' + res.status));
      }
      const body = res.data || {};
      const code = body.code;
      if (code === 0) return transformKeysDeep(body.data);

      // 鉴权失败 → 清缓存 + 跳登录
      if (code === 10001) {
        clearAuth();
        navigate('/login', { replace: true });
        return Promise.reject(
          Object.assign(new Error(body.msg || '请登录'), { code }),
        );
      }
      // 其他业务错误
      toast({ title: body.msg || '请求失败', icon: 'none' });
      return Promise.reject(
        Object.assign(new Error(body.msg || 'fail'), { code }),
      );
    },
    (err) => {
      // 网络层错误 / 超时 / 跨域
      const status = err?.response?.status;
      if (status === 401) {
        clearAuth();
        navigate('/login', { replace: true });
        return Promise.reject(Object.assign(err, { code: 10001 }));
      }
      if (status >= 500) {
        toast({ title: '服务器错误', icon: 'none' });
      } else {
        const msg = err?.message ? err.message.slice(0, 30) : '网络错误';
        toast({ title: msg, icon: 'none', duration: 3000 });
      }
      console.error('[api] request fail:', url, err);
      return Promise.reject(err);
    },
  );
}

// ==========================================================
// API 分组
// ==========================================================
export const api = {
  uploads: {
    images: (files) => {
      const data = new FormData();
      files.forEach((file) => data.append('files', file));
      return request({ method: 'POST', url: '/uploads/images', data });
    },
    verificationMaterials: (files) => {
      const data = new FormData();
      files.forEach((file) => data.append('files', file));
      return request({ method: 'POST', url: '/uploads/verification-materials', data });
    },
  },
  auth: {
    register: (data) => request({ method: 'POST', url: '/auth/register', data }),
    login: (data) => request({ method: 'POST', url: '/auth/login', data }),
  },
  users: {
    me: () => request({ method: 'GET', url: '/users/me' }),
    updateMe: (data) => request({ method: 'PATCH', url: '/users/me', data }),
    // 按学号精确搜索（受 is_searchable 控制）
    search: (userId) =>
      request({ method: 'GET', url: '/users/search', query: { userId } }),
    profile: (userId) => request({ method: 'GET', url: `/users/${userId}/profile` }),
    evaluations: (userId, query) =>
      request({ method: 'GET', url: `/users/${userId}/evaluations`, query }),
    myApplications: (query) =>
      request({ method: 'GET', url: '/users/me/applications', query }),
    myRooms: (query) => request({ method: 'GET', url: '/users/me/rooms', query }),
    // 历史搭子（#6b）—— 聚合 finished 房间里的共同 approved 成员
    teammates: () => request({ method: 'GET', url: '/users/me/teammates' }),
  },
  rooms: {
    createCarpool: (data) => request({ method: 'POST', url: '/rooms/carpool', data }),
    createEntertainment: (data) =>
      request({ method: 'POST', url: '/rooms/entertainment', data }),
    createGroup: (data) => request({ method: 'POST', url: '/rooms/group', data }),
    updateCarpool: (roomId, data) =>
      request({ method: 'PATCH', url: `/rooms/${roomId}/carpool`, data }),
    updateEntertainment: (roomId, data) =>
      request({ method: 'PATCH', url: `/rooms/${roomId}/entertainment`, data }),
    updateGroup: (roomId, data) =>
      request({ method: 'PATCH', url: `/rooms/${roomId}/group`, data }),
    matchCarpool: (data) =>
      request({ method: 'POST', url: '/rooms/carpool/match-candidates', data }),
    matchEntertainment: (data) =>
      request({ method: 'POST', url: '/rooms/entertainment/match-candidates', data }),
    matchGroup: (data) =>
      request({ method: 'POST', url: '/rooms/group/match-candidates', data }),
    listCarpool: (query) => request({ method: 'GET', url: '/rooms/carpool', query }),
    listEntertainment: (query) =>
      request({ method: 'GET', url: '/rooms/entertainment', query }),
    listGroup: (query) => request({ method: 'GET', url: '/rooms/group', query }),
    detail: (roomId) => request({ method: 'GET', url: `/rooms/${roomId}` }),
    cancel: (roomId) => request({ method: 'PATCH', url: `/rooms/${roomId}/cancel` }),
    finish: (roomId) => request({ method: 'PATCH', url: `/rooms/${roomId}/finish` }),
    listApplications: (roomId) =>
      request({ method: 'GET', url: `/rooms/${roomId}/applications` }),
  },
  hall: {
    dashboard: () => request({ method: 'GET', url: '/hall/dashboard' }),
  },
  // 地点联想（#4b）—— 用于发布/筛选页的"地点输入"自动补全
  places: {
    suggest: (q, limit = 8) =>
      request({ method: 'GET', url: '/places/suggest', query: { q, limit } }),
  },
  members: {
    apply: (roomId, data) =>
      request({ method: 'POST', url: `/rooms/${roomId}/members`, data: data || {} }),
    listMembers: (roomId, query) =>
      request({ method: 'GET', url: `/rooms/${roomId}/members`, query }),
    audit: (roomId, memberId, action) =>
      request({
        method: 'PATCH',
        url: `/rooms/${roomId}/applications/${memberId}`,
        data: { action },
      }),
    leave: (roomId) =>
      request({ method: 'DELETE', url: `/rooms/${roomId}/members/me` }),
  },
  evaluations: {
    submit: (roomId, data) =>
      request({ method: 'POST', url: `/rooms/${roomId}/evaluations`, data }),
    list: (roomId) => request({ method: 'GET', url: `/rooms/${roomId}/evaluations` }),
  },
  social: {
    friends: () => request({ method: 'GET', url: '/social/friends' }),
    removeFriend: (userId) =>
      request({ method: 'DELETE', url: `/social/friends/${userId}` }),
    sendRequest: (data) =>
      request({ method: 'POST', url: '/social/friend-requests', data }),
    listRequests: (query) =>
      request({ method: 'GET', url: '/social/friend-requests', query }),
    auditRequest: (friendId, action) =>
      request({
        method: 'PATCH',
        url: `/social/friend-requests/${friendId}`,
        data: { action },
      }),
    blocks: () => request({ method: 'GET', url: '/social/blocks' }),
    block: (data) => request({ method: 'POST', url: '/social/blocks', data }),
    unblock: (userId) =>
      request({ method: 'DELETE', url: `/social/blocks/${userId}` }),
    // 朋友群聊（Wave 3 #7b）
    createGroup: (data) =>
      request({ method: 'POST', url: '/social/groups', data }),
    listGroups: () => request({ method: 'GET', url: '/social/groups' }),
    groupDetail: (groupId) =>
      request({ method: 'GET', url: `/social/groups/${groupId}` }),
    leaveGroup: (groupId) =>
      request({ method: 'DELETE', url: `/social/groups/${groupId}/members/me` }),
  },
  chat: {
    onlineFriends: () => request({ method: 'GET', url: '/chat/online-friends' }),
    conversations: () => request({ method: 'GET', url: '/chat/conversations' }),
    history: (convId, query) =>
      request({
        method: 'GET',
        url: `/chat/conversations/${convId}/messages`,
        query,
      }),
    send: (data) => request({ method: 'POST', url: '/chat/messages', data }),
    markRead: (convId) =>
      request({ method: 'POST', url: `/chat/conversations/${convId}/read` }),
    // 删除/隐藏会话（持久化在 Conversation_Hidden 表）
    hide: (convId) =>
      request({ method: 'POST', url: `/chat/conversations/${convId}/hide` }),
    unhide: (convId) =>
      request({ method: 'DELETE', url: `/chat/conversations/${convId}/hide` }),
  },

  // ----- §8 Notification -----
  notifications: {
    list: (query) =>
      request({ method: 'GET', url: '/users/me/notifications', query }),
    unreadCount: () =>
      request({ method: 'GET', url: '/users/me/notifications/unread-count' }),
    markAllRead: () =>
      request({ method: 'POST', url: '/users/me/notifications/read-all' }),
    markRead: (id) =>
      request({ method: 'POST', url: `/users/me/notifications/${id}/read` }),
  },

  community: {
    listPosts: (query) => request({ method: 'GET', url: '/posts', query }),
    postDetail: (postId) => request({ method: 'GET', url: `/posts/${postId}` }),
    createPost: (data) => request({ method: 'POST', url: '/posts', data }),
    deletePost: (postId) => request({ method: 'DELETE', url: `/posts/${postId}` }),
    toggleLike: (postId) => request({ method: 'POST', url: `/posts/${postId}/like` }),
    comment: (postId, data) => request({ method: 'POST', url: `/posts/${postId}/comments`, data }),
    announcements: () => request({ method: 'GET', url: '/announcements' }),
    createAnnouncement: (data) => request({ method: 'POST', url: '/announcements', data }),
    favorites: (type) => request({ method: 'GET', url: '/favorites', query: type ? { type } : undefined }),
    favorite: (targetType, targetId) => request({ method: 'POST', url: '/favorites', data: { targetType, targetId } }),
    unfavorite: (targetType, targetId) => request({ method: 'DELETE', url: `/favorites/${targetType}/${targetId}` }),
    myVerification: () => request({ method: 'GET', url: '/verifications/me' }),
    submitVerification: (data) => request({ method: 'POST', url: '/verifications', data }),
  },
};

export function mediaUrl(value) {
  if (!value || !value.startsWith('/uploads/')) return value || '';
  try {
    return `${new URL(BASE_URL, window.location.origin).origin}${value}`;
  } catch {
    return value;
  }
}

export { request };
export default api;
