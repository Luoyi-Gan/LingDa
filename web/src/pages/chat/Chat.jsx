// UI 重做 Phase 3：Chat 消息页 Bento 重写
// 主色三件套 + 简笔画装饰
// · Hero (t-violet) 标题 + 找人/群聊按钮，角落 MessageCircle 简笔
// · 在线好友 (t-teal) 横向头像滚动，角落 Users 简笔
// · 会话列表：响应式 2 列 / 1 列；group/sgroup 用 emoji icon，private 用字母
// · 群聊创建 picker 用 shadcn Dialog 重做
import { useEffect, useState, useCallback } from 'react';
import {
  MessageCircle,
  Search,
  Plus,
  Users,
  X,
  Check,
  Inbox,
} from 'lucide-react';
import { convIcon } from '../../lib/iconMap';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useWxNav } from '../../lib/nav';
import { useUI } from '../../context/UIContext';
import { useFriends } from '../../context/FriendsContext';
import { makeAvatar } from '../../lib/avatar';
import SearchUserModal from '../../components/SearchUserModal';
import { Card } from '../../components/ui/card';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/cn';

const HIDDEN_KEY = 'chat:hidden';

function readHidden() {
  try {
    return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}
function writeHidden(set) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...set]));
}

export default function Chat() {
  const nav = useWxNav();
  const { showModal, showToast } = useUI();
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [hidden, setHidden] = useState(() => readHidden());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSelected, setPickerSelected] = useState([]);
  const [pickerName, setPickerName] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { friends = [], refresh: refreshFriends } = useFriends() || {};

  const loadData = useCallback(() => {
    Promise.all([api.chat.onlineFriends(), api.chat.conversations()])
      .then(([on, conv]) => {
        setOnlineFriends(on.list || []);
        setConversations(conv.list || []);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (authLib.requireLogin()) return;
    loadData();
    refreshFriends && refreshFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData]);

  const openConv = (item) => {
    const q = [
      `convId=${encodeURIComponent(item.conv_id)}`,
      `type=${encodeURIComponent(item.type || '')}`,
      `name=${encodeURIComponent(item.name || '')}`,
    ];
    if (item.user_id) q.push(`userId=${encodeURIComponent(item.user_id)}`);
    if (item.room_id) q.push(`roomId=${encodeURIComponent(item.room_id)}`);
    if (item.group_id) q.push(`groupId=${encodeURIComponent(item.group_id)}`);
    nav.navigateTo({ url: `/pages/chat-detail/chat-detail?${q.join('&')}` });
  };

  const openPrivate = (uid, name) => {
    nav.navigateTo({
      url: `/pages/chat-detail/chat-detail?convId=private_${uid}&type=private&userId=${uid}&name=${encodeURIComponent(name || '')}`,
    });
  };

  // 删除会话（保持原逻辑）
  const removeConv = (e, item) => {
    e.stopPropagation();
    const isGroup =
      item.type === 'group' ||
      (typeof item.conv_id === 'string' && item.conv_id.startsWith('group_'));
    const roomId =
      item.room_id ||
      (isGroup && typeof item.conv_id === 'string'
        ? Number(item.conv_id.slice('group_'.length))
        : null);

    const hidePersistent = () =>
      api.chat
        .hide(item.conv_id)
        .then(() => {
          setHidden((prev) => {
            const next = new Set(prev);
            next.add(item.conv_id);
            writeHidden(next);
            return next;
          });
          loadData();
        })
        .catch(() => {
          setHidden((prev) => {
            const next = new Set(prev);
            next.add(item.conv_id);
            writeHidden(next);
            return next;
          });
        });

    if (isGroup && roomId) {
      showModal({
        title: '退出队伍并删除聊天',
        content: `这会把你从「${item.name}」中移除，名额释放给其他搭子，确定？`,
        confirmText: '退队并删除',
        confirmColor: '#F59E0B',
      }).then((res) => {
        if (!res.confirm) return;
        api.rooms
          .detail(roomId)
          .then((d) => {
            if (d.my_membership && d.my_membership.is_owner) {
              showToast({
                title: '你是房主，请在群聊里点「结束并解散」',
                icon: 'none',
                duration: 2500,
              });
              return;
            }
            api.members
              .leave(roomId)
              .then(() => {
                hidePersistent();
                showToast({ title: '已退队并删除', icon: 'success' });
              })
              .catch(() => {});
          })
          .catch(() => {
            hidePersistent();
            showToast({ title: '已删除', icon: 'success' });
          });
      });
      return;
    }

    showModal({
      title: '删除聊天',
      content: `删除与「${item.name}」的会话。若之后对方再发消息，会话会重新出现。`,
      confirmText: '删除',
      confirmColor: '#F59E0B',
    }).then((res) => {
      if (!res.confirm) return;
      hidePersistent();
      showToast({ title: '已删除', icon: 'success' });
    });
  };

  const openPicker = () => {
    setPickerSelected([]);
    setPickerName('');
    setPickerOpen(true);
    refreshFriends && refreshFriends();
  };

  const toggleGroupPick = (uid) => {
    setPickerSelected((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid],
    );
  };

  const createGroup = () => {
    if (pickerSelected.length < 2) {
      showToast({ title: '至少选 2 位好友', icon: 'none' });
      return;
    }
    api.social
      .createGroup({
        name: pickerName.trim() || undefined,
        memberIds: pickerSelected,
      })
      .then((g) => {
        setPickerOpen(false);
        showToast({ title: '群聊已创建', icon: 'success' });
        loadData();
        nav.navigateTo({
          url: `/pages/chat-detail/chat-detail?convId=${g.conv_id}&type=sgroup&groupId=${g.group_id}&name=${encodeURIComponent(g.name || '')}`,
        });
      })
      .catch(() => {});
  };

  // 合入未聊过的好友占位
  const convIds = new Set(conversations.map((c) => c.conv_id));
  const friendConvs = (friends || [])
    .filter((f) => !convIds.has(`private_${f.user_id}`))
    .map((f) => ({
      conv_id: `private_${f.user_id}`,
      type: 'private',
      name: f.username,
      avatar_text: f.avatar_text,
      avatar_color: f.avatar_color,
      user_id: f.user_id,
      last_msg: '打个招呼吧',
      last_time: '',
      unread: 0,
      online: f.online,
    }));
  const visibleConvs = [...conversations, ...friendConvs].filter(
    (c) => !hidden.has(c.conv_id),
  );

  const totalUnread = visibleConvs.reduce((a, c) => a + (c.unread || 0), 0);

  return (
    <div className="relative min-h-screen pb-32 md:pb-12">
      <div className="relative mx-auto w-full max-w-[1180px] px-4 pt-6 md:px-8 md:pt-10">
        <div className="bento-grid">
          {/* === Hero —— t-violet + 角落 MessageCircle 简笔 === */}
          <Card
            bento
            className="col-span-2 md:col-span-4 xl:col-span-4 t-violet border-transparent p-6 md:p-7 relative overflow-hidden"
          >
            <MessageCircle
              aria-hidden
              className="absolute -right-8 -bottom-8 h-44 w-44 opacity-20"
              strokeWidth={1.25}
            />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70 mb-2">
                Messages
              </p>
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
                消息
              </h1>
              <p className="mt-1.5 text-sm opacity-75">
                找人加好友 · 私聊 · 群聊一目了然
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="bg-white/55 hover:bg-white/75 dark:bg-white/10 dark:hover:bg-white/15 text-current border border-white/40 dark:border-white/10"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="h-3.5 w-3.5" />
                  按学号找人
                </Button>
                <Button
                  size="sm"
                  className="bg-foreground text-background hover:bg-foreground/90"
                  onClick={openPicker}
                >
                  <Plus className="h-3.5 w-3.5" />
                  发起群聊
                </Button>
              </div>
            </div>
          </Card>

          {/* === Stats === */}
          <Card
            bento
            className="col-span-2 md:col-span-4 xl:col-span-2 p-5 md:p-6 relative overflow-hidden"
          >
            <Inbox
              aria-hidden
              className="absolute -right-5 -bottom-5 h-28 w-28 text-foreground/[0.06]"
              strokeWidth={1.25}
            />
            <div className="relative grid grid-cols-2 gap-4 h-full content-center">
              <div>
                <div className="font-heading text-3xl md:text-4xl font-bold tabular-nums text-foreground">
                  {loaded ? visibleConvs.length : <Skeleton className="h-9 w-12" />}
                </div>
                <div className="text-xs text-muted-foreground mt-1">会话数</div>
              </div>
              <div>
                <div className="font-heading text-3xl md:text-4xl font-bold tabular-nums">
                  {loaded ? (
                    totalUnread > 0 ? (
                      <span className="text-cta">{totalUnread}</span>
                    ) : (
                      <span className="text-foreground">0</span>
                    )
                  ) : (
                    <Skeleton className="h-9 w-12" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">未读消息</div>
              </div>
            </div>
          </Card>

          {/* === 在线好友 —— t-teal === */}
          {onlineFriends.length > 0 && (
            <Card
              bento
              className="col-span-2 md:col-span-4 xl:col-span-6 t-teal border-transparent p-5 md:p-6 relative overflow-hidden"
            >
              <Users
                aria-hidden
                className="absolute -right-6 -bottom-6 h-36 w-36 opacity-20"
                strokeWidth={1.25}
              />
              <div className="relative flex items-center gap-2 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
                  在线好友 · {onlineFriends.length}
                </span>
              </div>
              <div className="relative flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {onlineFriends.map((item) => (
                  <button
                    key={item.user_id}
                    onClick={() => openPrivate(item.user_id, item.username)}
                    className="shrink-0 w-16 flex flex-col items-center gap-1.5 group"
                  >
                    <div className="relative">
                      <Avatar className="h-14 w-14 ring-2 ring-white/60 dark:ring-white/10 group-hover:ring-white/90 transition-all">
                        <AvatarFallback
                          style={{ background: item.avatar_color }}
                          className="text-white font-bold"
                        >
                          {item.avatar_text}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-card" />
                    </div>
                    <span className="text-[11px] font-medium truncate w-full text-center">
                      {item.username}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* === 会话列表 === */}
          {!loaded &&
            [0, 1, 2, 3].map((i) => (
              <Card
                bento
                key={`s${i}`}
                className="col-span-2 md:col-span-2 xl:col-span-3 p-4 flex items-center gap-3"
              >
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </Card>
            ))}
          {loaded && visibleConvs.length === 0 && (
            <Card bento className="col-span-2 md:col-span-4 xl:col-span-6 p-10 text-center">
              <MessageCircle className="h-9 w-9 text-muted-foreground/40 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">
                还没有会话，去上面「按学号找人」加好友，或「发起群聊」拉一群
              </p>
            </Card>
          )}
          {loaded &&
            visibleConvs.map((item) => (
              <ConvCard
                key={item.conv_id}
                item={item}
                onClick={() => openConv(item)}
                onDelete={(e) => removeConv(e, item)}
              />
            ))}
        </div>
      </div>

      {/* 发起群聊 Dialog (shadcn) */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md p-0 gap-0">
          <DialogHeader className="p-5 pb-3">
            <DialogTitle>新建群聊</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              已选 {pickerSelected.length} 位 · 至少选 2 位好友
            </p>
          </DialogHeader>
          <div className="px-5 pb-3">
            <Input
              value={pickerName}
              onChange={(e) => setPickerName(e.target.value)}
              placeholder="群名（可留空，默认成员名拼接）"
            />
          </div>
          <div className="max-h-[40vh] overflow-y-auto px-2">
            {friends.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                暂无好友，先去「按学号找人」加几个
              </p>
            )}
            {friends.map((f) => {
              const av = makeAvatar(f.username || f.user_id || '?');
              const on = pickerSelected.includes(f.user_id);
              return (
                <button
                  key={f.user_id}
                  onClick={() => toggleGroupPick(f.user_id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                    on ? 'bg-primary/10' : 'hover:bg-muted',
                  )}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback
                      style={{ background: f.avatar_color || av.color }}
                      className="text-white text-xs font-bold"
                    >
                      {f.avatar_text || av.text}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium truncate">
                    {f.username}
                  </span>
                  <span
                    className={cn(
                      'h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors',
                      on
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background',
                    )}
                  >
                    {on && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
          <DialogFooter className="flex gap-2 p-5 pt-3 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setPickerOpen(false)}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              variant="cta"
              onClick={createGroup}
              disabled={pickerSelected.length < 2}
              className="flex-[1.4]"
            >
              创建群聊
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SearchUserModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

// 单条会话卡片
function ConvCard({ item, onClick, onDelete }) {
  const isGroup = item.type === 'group' || item.type === 'sgroup';
  const tint =
    item.type === 'group'
      ? 'after:bg-teal-500'
      : item.type === 'sgroup'
        ? 'after:bg-violet-500'
        : 'after:bg-sky-500';
  return (
    <Card
      bento
      interactive
      onClick={onClick}
      className={cn(
        'col-span-2 md:col-span-2 xl:col-span-3 p-4 flex items-center gap-3 relative group',
        // 左侧 2px 类型色条（用 after 伪元素，不占布局）
        'after:absolute after:left-0 after:top-3 after:bottom-3 after:w-0.5 after:rounded-r',
        tint,
      )}
    >
      <div className="relative shrink-0">
        {isGroup ? (
          (() => {
            const Icon = convIcon(item.type, item.icon_emoji, item.room_type);
            return (
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center ring-2 ring-border text-white"
                style={{ background: item.icon_color }}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
            );
          })()
        ) : (
          <Avatar className="h-12 w-12 ring-2 ring-border">
            <AvatarFallback
              style={{ background: item.avatar_color }}
              className="text-white font-bold"
            >
              {item.avatar_text}
            </AvatarFallback>
          </Avatar>
        )}
        {item.online && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground truncate">
            {item.name}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground shrink-0 tabular-nums">
            {item.last_time}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {item.last_msg}
        </p>
      </div>
      {item.unread > 0 && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-cta text-cta-foreground text-[10px] font-bold tabular-nums shrink-0">
          {item.unread > 99 ? '99+' : item.unread}
        </span>
      )}
      <button
        onClick={onDelete}
        aria-label="删除会话"
        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-full bg-background hover:bg-rose-100 hover:text-rose-700 text-muted-foreground flex items-center justify-center absolute top-2 right-2"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </Card>
  );
}
