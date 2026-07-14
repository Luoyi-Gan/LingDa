// 按学号精确搜索用户 + 发送好友申请
// UI 重做：shadcn Dialog + Tailwind
import { useState, useEffect } from 'react';
import {
  Search,
  Loader2,
  UserSearch,
  UserPlus,
  MessageCircle,
  Check,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { useWxNav } from '../lib/nav';
import useDebouncedValue from '../hooks/useDebouncedValue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { cn } from '../lib/cn';

export default function SearchUserModal({ open, onClose }) {
  const { showToast } = useUI();
  const nav = useWxNav();
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 350);
  const [loading, setLoading] = useState(false);
  const [hit, setHit] = useState(null);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  // 关闭时重置
  useEffect(() => {
    if (!open) {
      setQ('');
      setHit(null);
      setReason('');
      setLoading(false);
      setSending(false);
    }
  }, [open]);

  // 触发搜索：≥4 位才查（避免单字符全表扫）
  useEffect(() => {
    if (!open) return;
    const v = (dq || '').trim();
    if (v.length < 4) {
      setHit(null);
      setReason('');
      return;
    }
    setLoading(true);
    setReason('');
    api.users
      .search(v)
      .then((r) => {
        setHit(r.user || null);
        if (!r.user && r.reason) setReason(r.reason);
      })
      .catch(() => setHit(null))
      .finally(() => setLoading(false));
  }, [dq, open]);

  const sendRequest = () => {
    if (!hit || sending) return;
    setSending(true);
    api.social
      .sendRequest({ targetUserId: hit.user_id })
      .then(() => {
        showToast({ title: '已发送好友申请', icon: 'success' });
        setHit({ ...hit, friend_status: 'pending_out' });
      })
      .catch(() => {})
      .finally(() => setSending(false));
  };

  const openPrivate = () => {
    onClose && onClose();
    setTimeout(() => {
      nav.navigateTo({
        url: `/pages/chat-detail/chat-detail?convId=private_${hit.user_id}&type=private&userId=${hit.user_id}&name=${encodeURIComponent(hit.username || '')}`,
      });
    }, 60);
  };

  const status = hit?.friend_status ?? 'none';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>按学号查找好友</DialogTitle>
          <DialogDescription>
            输入完整学号（4 位以上）精确查找
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5">
          {/* Search input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              placeholder="请输入学号"
              value={q}
              onChange={(e) => setQ(e.target.value.replace(/\s+/g, ''))}
              className="flex h-11 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
          </div>

          {/* Result card */}
          {hit ? (
            <div className="rounded-bento border border-border bg-card p-4 flex items-start gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-border shrink-0">
                <AvatarFallback
                  style={{ background: hit.avatar_color }}
                  className="text-white font-bold text-lg"
                >
                  {hit.avatar_text}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-heading text-base font-bold text-foreground truncate">
                  {hit.username}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {hit.college || '—'}
                  {hit.major ? ` · ${hit.major}` : ''}
                </div>
                {Array.isArray(hit.tags) && hit.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {hit.tags.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 self-center">
                {status === 'self' && (
                  <Button size="sm" variant="ghost" disabled>
                    这是你自己
                  </Button>
                )}
                {status === 'none' && (
                  <Button
                    size="sm"
                    variant="cta"
                    disabled={sending}
                    onClick={sendRequest}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {sending ? '发送中…' : '加好友'}
                  </Button>
                )}
                {status === 'pending_out' && (
                  <Button size="sm" variant="ghost" disabled>
                    <Check className="h-3.5 w-3.5" />
                    已申请
                  </Button>
                )}
                {status === 'pending_in' && (
                  <Button size="sm" variant="ghost" disabled>
                    对方已申请你
                  </Button>
                )}
                {status === 'accepted' && (
                  <Button size="sm" variant="cta" onClick={openPrivate}>
                    <MessageCircle className="h-3.5 w-3.5" />
                    发消息
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <EmptyHint
              q={q}
              loading={loading}
              reason={reason}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyHint({ q, loading, reason }) {
  let Icon = UserSearch;
  let text = '请输入完整学号';
  if (reason === 'not_registered') {
    Icon = UserX;
    text = '该学号尚未注册灵搭';
  } else if (reason === 'restricted') {
    Icon = ShieldAlert;
    text = '该账号已被限制';
  } else if (q.trim().length >= 4 && !loading) {
    Icon = UserX;
    text = '没找到该用户';
  }
  return (
    <div className="rounded-bento border border-dashed border-border p-8 flex flex-col items-center text-center">
      <Icon className="h-9 w-9 text-muted-foreground/40 mb-3" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
