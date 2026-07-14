// UI 重做：桌面（≥lg）左侧常驻垂直导航 —— Tailwind + lucide 图标
// 与底部 TabBar 共享同一组图标符号。移动端整体 hidden。
import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  Compass,
  Megaphone,
  Newspaper,
  MessageCircle,
  User,
  Plus,
  Bookmark,
  Settings,
  HeartHandshake,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { makeAvatar } from '../lib/avatar';
import { api } from '../lib/api';
import authLib from '../lib/auth';
import PublishSheet from './PublishSheet';
import useVisibilityInterval from '../hooks/useVisibilityInterval';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '../lib/cn';

const NAV = [
  { id: 'announcements', path: '/announcements', text: '校园公告', desc: '重要通知', icon: Megaphone },
  { id: 'posts', path: '/posts', text: '校园贴吧', desc: '学生社区', icon: Newspaper },
  { id: 'partners', path: '/partners', text: '找搭子', desc: '拼车娱乐学习', icon: Compass },
  { id: 'teams', path: '/teams', text: '我的组队', desc: '参与记录', icon: HeartHandshake },
  { id: 'chat', path: '/chat', text: '消息中心', desc: '私聊群聊', icon: MessageCircle },
  { id: 'saved', path: '/saved', text: '我的收藏', desc: '稍后查看', icon: Bookmark },
  { id: 'profile', path: '/me', text: '个人资料', desc: '身份设置', icon: User },
  { id: 'settings', path: '/settings', text: '设置', desc: '偏好管理', icon: Settings },
];

export default function DesktopNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { currentUser } = useAuth() || {};
  const av = makeAvatar(currentUser?.username || currentUser?.user_id || '我');
  const [sheet, setSheet] = useState(false);
  const [unread, setUnread] = useState(0);

  // 同 TabBar：未读数轮询，桌面同样需要红点
  const refreshUnread = useCallback(() => {
    if (!authLib.hasToken()) {
      setUnread(0);
      return;
    }
    api.chat
      .conversations()
      .then((r) => {
        const list = r.list || [];
        const n = list.reduce((s, c) => s + (Number(c.unread) || 0), 0);
        setUnread(n);
      })
      .catch(() => {});
  }, []);

  useVisibilityInterval(refreshUnread, 30_000);

  useEffect(() => {
    const onRead = () => refreshUnread();
    window.addEventListener('chat:read', onRead);
    return () => window.removeEventListener('chat:read', onRead);
  }, [refreshUnread]);

  useEffect(() => {
    const onPublish = () => setSheet(true);
    window.addEventListener('lingda:publish', onPublish);
    return () => window.removeEventListener('lingda:publish', onPublish);
  }, []);

  return (
    <nav
      aria-label="主导航"
      className="hidden lg:flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white/86 backdrop-blur-xl"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pb-8 pt-7">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-xl font-extrabold text-white shadow-sm shadow-blue-900/10">
          灵
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-heading text-xl font-bold tracking-tight text-slate-950">
            灵搭
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.28em] text-slate-500">
            LingDa
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4">
        <button
          type="button"
          onClick={() => setSheet(true)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-900/10 transition hover:bg-blue-500 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          发起组队
        </button>
      </div>
      <PublishSheet open={sheet} onClose={() => setSheet(false)} />

      {/* Nav items */}
      <div className="mt-5 flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map((n) => {
          const on = pathname.startsWith(n.path) && (n.path !== '/me' || n.id === 'profile');
          const Icon = n.icon;
          const showDot = n.path === '/chat' && unread > 0;
          return (
            <button
              type="button"
              key={n.id}
              onClick={() => navigate(n.path)}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                on
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <div className="relative shrink-0">
                <Icon
                  className={cn('h-5 w-5 transition-transform', on && 'scale-105')}
                  strokeWidth={on ? 2.4 : 2}
                />
                {showDot && (
                  <span className="absolute -right-1 -top-1 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-sm font-semibold',
                    on ? 'text-blue-700' : 'text-slate-700',
                  )}
                >
                  {n.text}
                </div>
                <div className="truncate text-[11px] text-slate-400">
                  {n.desc}
                </div>
              </div>
              {on && (
                <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r bg-blue-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* User card */}
      <div className="border-t border-slate-200 p-4">
        <button
          type="button"
          onClick={() => navigate('/me')}
          className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-blue-200"
        >
          <Avatar className="h-10 w-10 ring-2 ring-slate-100">
            <AvatarFallback
              style={{ background: av.color }}
              className="text-white text-xs font-bold"
            >
              {av.text}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {currentUser?.username || '未登录'}
            </div>
            <div className="truncate text-[11px] text-slate-500">
              {currentUser?.college || '点击进入个人中心'}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </nav>
  );
}
