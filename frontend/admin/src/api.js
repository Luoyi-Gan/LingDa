import axios from 'axios';
import { adminAuth } from './auth';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3000/api/v1';

const http = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

http.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  const token = adminAuth.token();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function snakeKey(key) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toSnake(value) {
  if (Array.isArray(value)) return value.map(toSnake);
  if (value && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [snakeKey(key), toSnake(child)]),
    );
  }
  return value;
}

function forceLogout() {
  adminAuth.clear();
  if (!window.location.pathname.endsWith('/login')) {
    window.location.assign(`${window.location.origin}/login`);
  }
}

function apiError(message, code) {
  return Object.assign(new Error(message || '请求失败'), { code });
}

async function request(method, url, data, params) {
  try {
    const response = await http({ method, url, data, params });
    const body = response.data || {};
    if (body.code === 0) return toSnake(body.data);
    if (body.code === 10001) {
      forceLogout();
      throw apiError(body.msg || '请重新登录', 10001);
    }
    throw apiError(body.msg || '请求失败', body.code);
  } catch (err) {
    if (err?.code === 10001) throw err;
    const status = err?.response?.status;
    if (status === 401) {
      forceLogout();
      throw apiError('登录已失效，请重新登录', 10001);
    }
    if (err?.response?.data?.msg) {
      throw apiError(err.response.data.msg, err.response.data.code);
    }
    if (err instanceof Error && err.message && !err.response) {
      if (err.message !== 'Network Error') throw err;
    }
    throw apiError(
      status >= 500 ? '服务器错误' : err?.message || '网络错误，请确认后端已启动',
      status,
    );
  }
}

/** 认证材料路径 → 可请求的 API 相对路径 */
function materialApiPath(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/uploads/')) return path.replace(/^\/uploads\//, 'uploads/');
  if (path.startsWith('uploads/')) return path;
  return path.replace(/^\//, '');
}

export const adminApi = {
  uploadImages: (files) => {
    const data = new FormData();
    files.forEach((file) => data.append('files', file));
    return request('POST', '/uploads/images', data);
  },

  privateMaterial: async (path) => {
    const url = materialApiPath(path);
    if (/^https?:\/\//.test(url)) {
      const response = await axios.get(url, { responseType: 'blob' });
      return response.data;
    }
    const response = await http.get(url, { responseType: 'blob' });
    return response.data;
  },

  login: (data) => request('POST', '/auth/login', data),
  previewAdmin: () => request('POST', '/auth/preview-admin'),
  me: () => request('GET', '/users/me'),
  overview: () => request('GET', '/admin/overview'),
  reviewQueue: () => request('GET', '/admin/review-queue'),

  posts: (params = {}) => {
    const { risk, riskLevel, ...rest } = params;
    return request('GET', '/admin/posts', undefined, {
      ...rest,
      ...(riskLevel || risk ? { riskLevel: riskLevel || risk } : {}),
    });
  },

  comments: async (params = {}) => {
    const { risk, riskLevel, ...rest } = params;
    const data = await request('GET', '/admin/comments', undefined, rest);
    const level = riskLevel || risk;
    if (!level || !data?.list) return data;
    return {
      ...data,
      list: data.list.filter((item) => item.risk_level === level),
      total: data.list.filter((item) => item.risk_level === level).length,
    };
  },

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

export function mediaUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//.test(value) || value.startsWith('data:')) return value;
  if (!value.startsWith('/uploads/')) return value;
  try {
    return `${new URL(API_BASE, window.location.origin).origin}${value}`;
  } catch {
    return value;
  }
}
