// UI 重做 Phase 7：TabBar 底部导航
// · 4 标签 + 中间 FAB；lucide 图标替代 png；backdrop-blur 玻璃感
// · 真未读数轮询 + ChatDetail markRead 事件即时归零
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  FileText,
  MessageCircle,
  User,
  Plus,
} from 'lucide-react';
import { api } from '../lib/api';
import authLib from '../lib/auth';
import PublishSheet from './PublishSheet';
import useVisibilityInterval from '../hooks/useVisibilityInterval';
import { cn } from '../lib/cn';

const TABS = [
  { idx: 0, path: '/hall', text: '大厅', icon: LayoutGrid },
  { idx: 1, path: '/posts', text: '帖子', icon: FileText },
  { idx: 2, path: '/chat', text: '聊天', icon: MessageCircle },
  { idx: 3, path: '/me', text: '我的', icon: User },
];

export default function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const selected = TABS.find((t) => pathname.startsWith(t.path))?.idx ?? 0;
  const [unread, setUnread] = useState(0);
  const [sheet, setSheet] = useState(false);

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
    if (pathname.startsWith('/chat')) {
      const t = setTimeout(refreshUnread, 1200);
      return () => clearTimeout(t);
    }
  }, [pathname, refreshUnread]);

  const switchTab = (path) => navigate(path);

  const TabItem = ({ t, showDot }) => {
    const on = selected === t.idx;
    const Icon = t.icon;
    return (
      <button
        onClick={() => switchTab(t.path)}
        className={cn(
          'group flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5',
          'transition-colors',
        )}
      >
        <div className="relative">
          <Icon
            className={cn(
              'h-5 w-5 transition-all',
              on
                ? 'text-primary scale-110'
                : 'text-muted-foreground group-hover:text-foreground',
            )}
            strokeWidth={on ? 2.4 : 2}
          />
          {showDot && unread > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full bg-cta text-cta-foreground text-[9px] font-bold leading-none tabular-nums">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
        <span
          className={cn(
            'text-[10px] font-bold transition-colors',
            on ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
          )}
        >
          {t.text}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* 桌面 ≥ lg(1024px) 隐藏：桌面用左侧 DesktopNav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/85 backdrop-blur-lg">
        <div className="mx-auto w-full max-w-[1180px] relative">
          <div className="flex items-stretch h-[56px] pb-[env(safe-area-inset-bottom)] px-2">
            <TabItem t={TABS[0]} />
            <TabItem t={TABS[1]} />
            {/* 中间 FAB 占位 */}
            <div className="w-14 shrink-0" />
            <TabItem t={TABS[2]} showDot />
            <TabItem t={TABS[3]} />
          </div>
          {/* FAB —— 浮在 TabBar 上方 */}
          <button
            onClick={() => setSheet(true)}
            aria-label="发起组队"
            className="absolute left-1/2 -translate-x-1/2 -top-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-xl shadow-foreground/20 hover:scale-105 active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <PublishSheet open={sheet} onClose={() => setSheet(false)} />
    </>
  );
}
