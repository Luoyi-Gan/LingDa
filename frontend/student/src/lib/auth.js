// lib/auth.js —— token / 当前用户 持久化与跳转
// Web 端使用 localStorage 保存登录态，并通过路由跳转处理鉴权失效。
import { navigate } from './bridge';

const TOKEN_KEY = 'token';
const USER_KEY = 'currentUser';

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
export function hasToken() {
  return !!getToken();
}
export function saveCurrentUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getCurrentUser() {
  return readJSON(USER_KEY);
}

/** Tab 页守卫：未登录则跳登录并返回 true */
export function requireLogin() {
  if (hasToken()) return false;
  navigate('/login', { replace: true });
  return true;
}

export function logout() {
  clearAuth();
  navigate('/login', { replace: true });
}

export default {
  saveToken,
  getToken,
  clearAuth,
  hasToken,
  saveCurrentUser,
  getCurrentUser,
  requireLogin,
  logout,
};
