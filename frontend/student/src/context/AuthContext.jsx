// AuthContext —— 替代 app.globalData.currentUser + app.refreshCurrentUser()
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import authLib from '../lib/auth';

const AuthCtx = createContext(null);

export function useAuth() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() =>
    authLib.getCurrentUser(),
  );

  // 对应 app.js: 启动时若有 token 就异步刷新一次
  const refreshCurrentUser = useCallback(() => {
    return api.users.me().then(
      (u) => {
        setCurrentUser(u);
        authLib.saveCurrentUser(u);
        return u;
      },
      () => null, // 401 已被 api.js 处理
    );
  }, []);

  useEffect(() => {
    const cached = authLib.getCurrentUser();
    if (cached) setCurrentUser(cached);
    if (authLib.hasToken()) refreshCurrentUser();
  }, [refreshCurrentUser]);

  // 登录成功后调用
  const setUser = useCallback((u) => {
    setCurrentUser(u);
    if (u) authLib.saveCurrentUser(u);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    authLib.logout();
  }, []);

  return (
    <AuthCtx.Provider
      value={{ currentUser, setUser, refreshCurrentUser, logout }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
