// 用户名片浮层 —— UI 重做：Tailwind + lucide
// · 桌面：跟随锚点定位（hover/点击触发的非模态浮层）
// · 移动：居中模态
// 行为完全保留：申请/接受/婉拒/删除好友 + 发起私聊
import { useEffect, useState } from 'react';
import {
  X,
  Star,
  MessageCircle,
  UserPlus,
  UserMinus,
  Check,
  Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useFriends } from '../context/FriendsContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useWxNav } from '../lib/nav';
import { makeAvatar } from '../lib/avatar';
import { formatEnrollmentCohort } from '../lib/cohort';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { cn } from '../lib/cn';

export default function UserCard({ userId, fallbackName, onClose, anchorRect }) {
  const { getStatus, sendRequest, removeFriend, audit, findIncomingFriendId } =
    useFriends() || {};
  const { currentUser } = useAuth() || {};
  const { showToast, showModal } = useUI();
  const nav = useWxNav();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const status = getStatus ? getStatus(userId) : 'none';
  const isMe = currentUser?.user_id === userId;

  useEffect(() => {
    if (!userId) return;
    api.users
      .profile(userId)
      .then((d) => setProfile(d))
      .catch(() => setProfile(null))
      .then(() => setLoading(false));
  }, [userId]);

  const onAdd = async () => {
    setActing(true);
    try {
      await sendRequest(userId);
      showToast({ title: '好友申请已发送', icon: 'success' });
    } catch {}
    setActing(false);
  };

  const onAccept = async () => {
    setActing(true);
    try {
      const fid = findIncomingFriendId(userId);
      if (fid != null) {
        await audit(fid, 'accept');
        showToast({ title: '已添加好友', icon: 'success' });
      }
    } catch {}
    setActing(false);
  };

  const onReject = async () => {
    const fid = findIncomingFriendId(userId);
    if (fid == null) return;
    setActing(true);
    try {
      await audit(fid, 'reject');
      showToast({ title: '已婉拒', icon: 'success' });
    } catch {}
    setActing(false);
  };

  const onRemove = async () => {
    const r = await showModal({
      title: '删除好友',
      content: `确定不再与「${profile?.user?.username || fallbackName || userId}」做好友？（聊天历史会保留）`,
      confirmText: '删除',
      confirmColor: '#F59E0B',
    });
    if (!r.confirm) return;
    setActing(true);
    try {
      await removeFriend(userId);
      showToast({ title: '已删除好友', icon: 'success' });
      onClose && onClose();
    } catch {}
    setActing(false);
  };

  const goChat = () => {
    const name = profile?.user?.username || fallbackName || '';
    onClose && onClose();
    nav.navigateTo({
      url: `/pages/chat-detail/chat-detail?convId=private_${userId}&type=private&userId=${userId}&name=${encodeURIComponent(name)}`,
    });
  };

  // 定位：桌面贴锚点 / 移动居中
  const positionStyle = (() => {
    if (typeof window === 'undefined') return {};
    const wide = window.innerWidth >= 1024;
    if (!wide || !anchorRect) return {};
    const cardW = 340;
    const cardH = 380;
    let left = anchorRect.left + anchorRect.width / 2 - cardW / 2;
    let top = anchorRect.bottom + 8;
    if (left + cardW > window.innerWidth - 12)
      left = window.innerWidth - cardW - 12;
    if (left < 12) left = 12;
    if (top + cardH > window.innerHeight - 12)
      top = anchorRect.top - cardH - 8;
    return { left: `${left}px`, top: `${top}px` };
  })();

  const u = profile?.user || {};
  const av = makeAvatar(u.username || fallbackName || userId || '?');
  const name = u.username || fallbackName || userId || '—';
  const isAnchored = !!anchorRect && typeof window !== 'undefined' && window.innerWidth >= 1024;

  return (
    <div
      onClick={onClose}
      className={cn(
        'fixed inset-0 z-[100] animate-in fade-in-0',
        isAnchored ? 'bg-transparent' : 'bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4',
      )}
    >
      <div
        role="dialog"
        aria-modal={!isAnchored}
        aria-label={`${name}的个人资料`}
        onClick={(e) => e.stopPropagation()}
        style={isAnchored ? { position: 'fixed', width: 340, ...positionStyle } : undefined}
        className={cn(
          'w-full max-w-sm rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl',
          'animate-in fade-in-0 zoom-in-95',
          !isAnchored && 'mx-auto',
        )}
      >
        {/* Head */}
        <div className="p-5 pb-4 flex items-start gap-3 border-b border-border">
          <Avatar className="h-14 w-14 ring-2 ring-border shrink-0">
            <AvatarFallback
              style={{ background: u.avatar_color || av.color }}
              className="text-white font-bold text-xl"
            >
              {u.avatar_text || av.text}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-heading text-base font-bold text-foreground truncate">
              {name}
            </div>
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {u.college || ''}
              {u.major ? ` · ${u.major}` : ''}
              {u.grade ? ` · ${formatEnrollmentCohort(u.grade)}` : ''}
            </div>
            {profile?.rating && (
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                <Star className="h-2.5 w-2.5" fill="currentColor" />
                <span className="tabular-nums">{profile.rating.average || '暂无评分'}</span>
                <span className="opacity-70">· {profile.rating.total || 0} 条评价</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tags */}
        {Array.isArray(u.tags) && u.tags.length > 0 && (
          <div className="px-5 pt-3 flex flex-wrap gap-1.5">
            {u.tags.slice(0, 6).map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="px-5 py-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            加载中…
          </div>
        )}

        {/* Actions */}
        {!isMe && (
          <div className="p-5 flex flex-col gap-2">
            {status === 'friend' && (
              <>
                <Button variant="cta" onClick={goChat} className="w-full">
                  <MessageCircle className="h-4 w-4" />
                  发起私聊
                </Button>
                <Button
                  variant="ghost"
                  disabled={acting}
                  onClick={onRemove}
                  className="w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 dark:text-rose-400"
                >
                  <UserMinus className="h-4 w-4" />
                  删除好友
                </Button>
              </>
            )}
            {status === 'outgoing' && (
              <Button variant="ghost" disabled className="w-full">
                <Check className="h-4 w-4" />
                已申请，等待对方同意…
              </Button>
            )}
            {status === 'incoming' && (
              <>
                <Button
                  variant="cta"
                  disabled={acting}
                  onClick={onAccept}
                  className="w-full"
                >
                  <Check className="h-4 w-4" />
                  接受好友申请
                </Button>
                <Button
                  variant="ghost"
                  disabled={acting}
                  onClick={onReject}
                  className="w-full"
                >
                  婉拒
                </Button>
              </>
            )}
            {status === 'none' && (
              <Button
                variant="default"
                disabled={acting}
                onClick={onAdd}
                className="w-full"
              >
                <UserPlus className="h-4 w-4" />
                申请添加好友
              </Button>
            )}
          </div>
        )}

        {isMe && (
          <div className="p-5">
            <div className="rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground text-center">
              这是你自己
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
