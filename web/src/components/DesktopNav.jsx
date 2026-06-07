// UI 重做：桌面（≥lg）左侧常驻垂直导航 —— Tailwind + lucide 图标
// 与底部 TabBar 共享同一组图标符号。移动端整体 hidden。
import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  FileText,
  MessageCircle,
  User,
  Plus,
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
  { path: '/hall', text: '大厅', desc: '组队大厅', icon: LayoutGrid },
  { path: '/posts', text: '帖子', desc: '广场动态', icon: FileText },
  { path: '/chat', text: '聊天', desc: '消息会话', icon: MessageCircle },
  { path: '/me', text: '我的', desc: '个人中心', icon: User },
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

  return (
    <nav
      aria-label="主导航"
      className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-card/60 backdrop-blur-sm h-screen sticky top-0"
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-heading font-extrabold text-base">
          灵
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            灵搭
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
            LingDa
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-3">
        <button
          onClick={() => setSheet(true)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cta text-cta-foreground hover:bg-cta/90 active:scale-[0.98] transition-all px-4 py-2.5 font-semibold text-sm shadow-[0_8px_22px_-10px_hsl(var(--cta)/0.55)]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          发起组队
        </button>
      </div>
      <PublishSheet open={sheet} onClose={() => setSheet(false)} />

      {/* Nav items */}
      <div className="px-3 mt-3 flex-1 space-y-1 overflow-y-auto">
        {NAV.map((n) => {
          const on = pathname.startsWith(n.path);
          const Icon = n.icon;
          const showDot = n.path === '/chat' && unread > 0;
          return (
            <button
              key={n.path}
              onClick={() => navigate(n.path)}
              className={cn(
                'w-full group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                on
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <div className="relative shrink-0">
                <Icon
                  className={cn('h-5 w-5 transition-transform', on && 'scale-110')}
                  strokeWidth={on ? 2.4 : 2}
                />
                {showDot && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full bg-cta text-cta-foreground text-[9px] font-bold leading-none tabular-nums">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-sm font-semibold',
                    on ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {n.text}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {n.desc}
                </div>
              </div>
              {on && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* User card */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => navigate('/me')}
          className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted transition-colors text-left"
        >
          <Avatar className="h-9 w-9 ring-2 ring-border">
            <AvatarFallback
              style={{ background: av.color }}
              className="text-white text-xs font-bold"
            >
              {av.text}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">
              {currentUser?.username || '未登录'}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {currentUser?.college || '点击进入个人中心'}
            </div>
          </div>
        </button>
      </div>
    </nav>
  );
}
