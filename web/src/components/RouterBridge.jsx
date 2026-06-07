// 把 react-router 的 navigate 注册给命令式桥（api.js / auth.js 用）
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setNavigate } from '../lib/bridge';

export default function RouterBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigate((path, opts = {}) => navigate(path, opts));
  }, [navigate]);
  return null;
}
