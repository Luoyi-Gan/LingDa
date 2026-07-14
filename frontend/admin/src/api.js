import axios from 'axios';
import { adminAuth } from './auth';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3000/api/v1',
  timeout: 20000,
});

http.interceptors.request.use((config) => {
  const token = adminAuth.token();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function snakeKey(key) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toSnake(value) {
  if (Array.isArray(value)) return value.map(toSnake);
  if (value && value.constructor === Object) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [snakeKey(key), toSnake(child)]));
  }
  return value;
}

async function request(method, url, data, params) {
  const response = await http({ method, url, data, params });
  const body = response.data || {};
  if (body.code !== 0) throw new Error(body.msg || '请求失败');
  return toSnake(body.data);
}

export const adminApi = {
  login: (data) => request('POST', '/auth/login', data),
  me: () => request('GET', '/users/me'),
  overview: () => request('GET', '/admin/overview'),
  reviewQueue: () => request('GET', '/admin/review-queue'),
  posts: (params) => request('GET', '/admin/posts', undefined, params),
  comments: (params) => request('GET', '/admin/comments', undefined, params),
  verifications: (params) => request('GET', '/admin/verifications', undefined, params),
  announcements: (params) => request('GET', '/admin/announcements', undefined, params),
  createAnnouncement: (data) => request('POST', '/announcements', data),
  updateAnnouncement: (id, data) => request('PATCH', `/admin/announcements/${id}`, data),
  reviewPost: (id, data) => request('POST', `/admin/posts/${id}/review`, data),
  reviewComment: (id, data) => request('POST', `/admin/comments/${id}/review`, data),
  reviewVerification: (id, data) => request('POST', `/admin/verifications/${id}/review`, data),
  moderatePost: (id, data) => request('PATCH', `/admin/posts/${id}/status`, data),
  moderateComment: (id, data) => request('PATCH', `/admin/comments/${id}/status`, data),
};
