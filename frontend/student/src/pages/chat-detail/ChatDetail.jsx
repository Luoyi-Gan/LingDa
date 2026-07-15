// UI 重做 Phase 8：ChatDetail 会话详情
// · 消息气泡：他人白底/我方主色
// · 输入栏：圆角 + CTA 发送
// · 顶部 NavBar 右侧操作（解散 / 删好友）用 shadcn Button
// · MVP REST 轮询逻辑保留不变
import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, MoreVertical, MessageCircle } from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useQueryOptions, useWxNav } from '../../lib/nav';
import { useUI } from '../../context/UIContext';
import { useFriends } from '../../context/FriendsContext';
import NavBar from '../../components/NavBar';
import HoverableUserAvatar from '../../components/HoverableUserAvatar';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { cn } from '../../lib/cn';

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes(),
    ).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export default function ChatDetail() {
  const options = useQueryOptions();
  const convId = options.convId || '';
  const type =
    options.type ||
    (convId.startsWith('sgroup_')
      ? 'sgroup'
      : convId.startsWith('group_')
        ? 'group'
        : 'private');
  const userId =
    options.userId ||
    (type === 'private' ? convId.slice('private_'.length) : '');
  const roomId =
    options.roomId || (type === 'group' ? convId.slice('group_'.length) : '');
  const groupId =
    options.groupId || (type === 'sgroup' ? convId.slice('sgroup_'.length) : '');
  const title = decodeURIComponent(
    options.name ||
      (type === 'group' ? '群聊' : type === 'sgroup' ? '朋友群' : '私聊'),
  );

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [roomStatus, setRoomStatus] = useState('');
  const { showModal, showToast } = useUI();
  const nav = useWxNav();
  const { getStatus, removeFriend } = useFriends() || {};
  const isFriend = type === 'private' && userId && getStatus
    ? getStatus(userId) === 'friend'
    : false;

  const deleteFriend = () => {
    showModal({
      title: '删除好友',
      content: '将不再是好友（聊天记录保留），确定？',
      confirmText: '删除',
      confirmColor: '#F59E0B',
    }).then((res) => {
      if (!res.confirm) return;
      removeFriend(userId)
        .then(() => {
          showToast({ title: '已删除好友', icon: 'success' });
          setTimeout(() => nav.navigateBack({ delta: 1 }), 500);
        })
        .catch(() => {});
    });
  };

  useEffect(() => {
    if (type !== 'group' || !roomId) return;
    api.rooms
      .detail(Number(roomId))
      .then((d) => {
        setIsOwner(!!d.my_membership?.is_owner);
        setRoomStatus(d.room?.status || '');
      })
      .catch(() => {});
  }, [type, roomId]);

  const dissolve = () => {
    showModal({
      title: '结束并解散队伍',
      content:
        '队伍将标记为「已结束」，聊天关闭，全体队员收到「去评价」提醒。此操作不可撤销。',
      confirmText: '结束并解散',
      confirmColor: '#F59E0B',
    }).then((res) => {
      if (!res.confirm) return;
      api.rooms
        .finish(Number(roomId))
        .then(() => {
          showToast({ title: '已解散', icon: 'success' });
          setRoomStatus('finished');
          setTimeout(() => nav.navigateBack({ delta: 1 }), 600);
        })
        .catch(() => {});
    });
  };

  const closed = roomStatus === 'finished' || roomStatus === 'cancelled';

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const pollTimer = useRef(null);
  const messagesRef = useRef([]);
  messagesRef.current = messages;

  const enrich = (m) => ({ ...m, time_label: formatTime(m.send_time) });

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (bottomRef.current) bottomRef.current.scrollIntoView({ block: 'end' });
    });
  }, []);

  const loadInitial = useCallback(() => {
    setLoading(true);
    api.chat
      .history(convId, { pageSize: 50 })
      .then((res) => {
        const list = (res.list || []).reverse().map(enrich);
        setMessages(list);
        setLoading(false);
        scrollToBottom();
        api.chat
          .markRead(convId)
          .then(() => window.dispatchEvent(new Event('chat:read')))
          .catch(() => {});
      })
      .catch(() => setLoading(false));
  }, [convId, scrollToBottom]);

  const pollOnce = useCallback(() => {
    api.chat
      .history(convId, { pageSize: 30 })
      .then((res) => {
        const fresh = (res.list || []).reverse().map(enrich);
        const existingIds = new Set(messagesRef.current.map((m) => m.msg_id));
        const append = fresh.filter((m) => !existingIds.has(m.msg_id));
        if (append.length === 0) return;
        setMessages((prev) => [...prev, ...append]);
        scrollToBottom();
        api.chat
          .markRead(convId)
          .then(() => window.dispatchEvent(new Event('chat:read')))
          .catch(() => {});
      })
      .catch(() => {});
  }, [convId, scrollToBottom]);

  useEffect(() => {
    if (authLib.requireLogin()) return;
    document.title = title;
    loadInitial();

    const start = () => {
      if (pollTimer.current) return;
      pollTimer.current = setInterval(pollOnce, 5000);
    };
    const stop = () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
    start();

    const onVis = () => {
      if (document.visibilityState === 'hidden') stop();
      else {
        pollOnce();
        start();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (roomStatus === 'finished' || roomStatus === 'cancelled') {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      setMessages([]);
    }
  }, [roomStatus]);

  const sendMessage = () => {
    const content = (draft || '').trim();
    if (!content || sending) return;
    setSending(true);

    const payload = { content };
    if (type === 'group') payload.roomId = Number(roomId);
    else if (type === 'sgroup') payload.socialGroupId = Number(groupId);
    else payload.targetUserId = userId;

    api.chat
      .send(payload)
      .then((msg) => {
        const enriched = enrich(msg);
        setMessages((prev) => [...prev, enriched]);
        setDraft('');
        setSending(false);
        scrollToBottom();
      })
      .catch(() => setSending(false));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 顶部右侧操作
  const rightAction =
    type === 'group' && isOwner && !closed ? (
      <Button size="sm" variant="ghost" onClick={dissolve}>
        <MoreVertical className="h-4 w-4" />
        <span className="hidden md:inline">结束并解散</span>
      </Button>
    ) : type === 'private' && isFriend ? (
      <Button size="sm" variant="ghost" onClick={deleteFriend}>
        <MoreVertical className="h-4 w-4" />
        <span className="hidden md:inline">删除好友</span>
      </Button>
    ) : null;

  // 类型徽
  const typeBadge =
    type === 'group' ? '匹配房 · 群聊' : type === 'sgroup' ? '朋友群' : '私聊';

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <NavBar title={title} right={rightAction} />

      {/* 顶部类型徽 */}
      <div className="mx-auto w-full max-w-[860px] px-4 md:px-6 pt-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              type === 'group'
                ? 'bg-teal-500'
                : type === 'sgroup'
                  ? 'bg-violet-500'
                  : 'bg-sky-500',
            )}
          />
          {typeBadge}
        </div>
      </div>

      {/* 消息区 */}
      <div
        ref={scrollRef}
        className="flex-1 mx-auto w-full max-w-[860px] px-4 md:px-6 py-4 space-y-3 overflow-y-auto"
      >
        {loading && !messages.length && (
          <div className="text-center text-sm text-muted-foreground py-12">
            加载中…
          </div>
        )}
        {!loading && !messages.length && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">
              还没有消息，聊点什么吧
            </p>
          </div>
        )}

        {messages.map((item) => {
          const me = item.is_me;
          const showName = !me && (type === 'group' || type === 'sgroup');
          return (
            <div
              key={item.msg_id}
              className={cn(
                'flex items-end gap-2 max-w-full animate-in fade-in-0 slide-in-from-bottom-1',
                me ? 'justify-end' : 'justify-start',
              )}
            >
              {!me && (
                <HoverableUserAvatar
                  userId={item.from_user_id}
                  fallbackName={item.from_username}
                  className="shrink-0"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      style={{ background: item.from_avatar_color }}
                      className="text-white text-xs font-bold"
                    >
                      {item.from_avatar_text}
                    </AvatarFallback>
                  </Avatar>
                </HoverableUserAvatar>
              )}
              <div className={cn('flex flex-col max-w-[78%] md:max-w-[60%]', me ? 'items-end' : 'items-start')}>
                {showName && (
                  <span className="text-[10px] font-semibold text-muted-foreground mb-1 px-1">
                    {item.from_username}
                  </span>
                )}
                <div
                  className={cn(
                    'rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm',
                    me
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card text-card-foreground border border-border rounded-bl-sm',
                  )}
                >
                  {item.content}
                </div>
                <span className="text-[10px] text-muted-foreground/70 mt-1 px-1 tabular-nums">
                  {item.time_label}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* 输入栏 */}
      <div className="sticky bottom-0 border-t border-border bg-background/85 backdrop-blur-lg">
        <div className="mx-auto w-full max-w-[860px] px-3 md:px-6 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] flex items-end gap-2">
          <div className="flex-1 relative">
            <input
              value={draft}
              disabled={closed}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={closed ? '聊天已关闭' : '发条消息…'}
              className={cn(
                'flex h-11 w-full rounded-full border border-input bg-card pl-4 pr-12 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'placeholder:text-muted-foreground',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            />
          </div>
          <Button
            variant="cta"
            size="icon"
            disabled={sending || !draft || closed}
            onClick={sendMessage}
            className="h-11 w-11 rounded-full"
            aria-label="发送"
          >
            <Send className="h-4 w-4" strokeWidth={2.4} />
          </Button>
        </div>
      </div>
    </div>
  );
}
