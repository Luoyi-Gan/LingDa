import { useEffect, useState, useCallback } from 'react';
import {
  Check,
  MessageCircle,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { convIcon } from '../../lib/iconMap';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useWxNav } from '../../lib/nav';
import { useUI } from '../../context/UIContext';
import { useFriends } from '../../context/FriendsContext';
import { makeAvatar } from '../../lib/avatar';
import SearchUserModal from '../../components/SearchUserModal';
import HoverableUserAvatar from '../../components/HoverableUserAvatar';
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
import {
  AppPage,
  EmptyPanel,
  PageHeader,
  SectionHeader,
  SectionSurface,
  TypeBadge,
} from '../../components/layout/AppScaffold';
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
        confirmColor: '#2563EB',
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
      confirmColor: '#2563EB',
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
    <>
      <AppPage
        aside={
          <ChatAside
            loaded={loaded}
            conversations={visibleConvs}
            unread={totalUnread}
            onlineFriends={onlineFriends}
            onPrivate={openPrivate}
          />
        }
      >
        <PageHeader
          eyebrow="Messages"
          title="消息中心"
          subtitle="找人、私聊和群聊都从这里开始。"
          action={
            <>
              <Button variant="outline" onClick={() => setSearchOpen(true)}>
                <Search className="h-4 w-4" />
                按学号找人
              </Button>
              <Button onClick={openPicker}>
                <Plus className="h-4 w-4" />
                发起群聊
              </Button>
            </>
          }
        />

        {onlineFriends.length > 0 && (
          <section className="space-y-3 xl:hidden">
            <SectionHeader title="在线好友" subtitle={`${onlineFriends.length} 位好友在线`} />
            <div className="flex gap-3 overflow-x-auto pb-1">
              {onlineFriends.map((item) => (
                <div
                  key={item.user_id}
                  className="flex w-16 shrink-0 flex-col items-center gap-1.5"
                >
                  <HoverableUserAvatar
                    userId={item.user_id}
                    fallbackName={item.username}
                    className="relative"
                  >
                    <Avatar className="h-12 w-12 ring-2 ring-white">
                      <AvatarFallback
                        style={{ background: item.avatar_color }}
                        className="font-bold text-white"
                      >
                        {item.avatar_text}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </HoverableUserAvatar>
                  <button
                    type="button"
                    onClick={() => openPrivate(item.user_id, item.username)}
                    className="w-full truncate text-center text-xs font-medium text-slate-600"
                  >
                    {item.username}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <SectionHeader
            title="会话"
            subtitle={loaded ? `${visibleConvs.length} 个会话 · ${totalUnread} 条未读` : '正在同步消息'}
          />
          <SectionSurface>
            {!loaded &&
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 border-b border-slate-100 p-4 last:border-b-0">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            {loaded && visibleConvs.length === 0 && (
              <EmptyPanel
                icon={MessageCircle}
                text="还没有会话，先按学号找人，或发起一个群聊。"
              />
            )}
            {loaded &&
              visibleConvs.map((item) => (
                <ConvRow
                  key={item.conv_id}
                  item={item}
                  onClick={() => openConv(item)}
                  onDelete={(e) => removeConv(e, item)}
                />
              ))}
          </SectionSurface>
        </section>
      </AppPage>

      <GroupPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        friends={friends}
        pickerName={pickerName}
        setPickerName={setPickerName}
        pickerSelected={pickerSelected}
        toggleGroupPick={toggleGroupPick}
        createGroup={createGroup}
      />
      <SearchUserModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function ConvRow({ item, onClick, onDelete }) {
  const isGroup = item.type === 'group' || item.type === 'sgroup';
  const badgeTone = item.type === 'group' ? 'green' : item.type === 'sgroup' ? 'violet' : 'blue';
  const label = isGroup ? '群聊' : '私聊';
  return (
    <div
      className="group grid w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50"
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`${item.name || '会话'}，${label}，${item.last_msg || '暂无消息'}`}
        className="grid min-w-0 grid-cols-[auto_1fr] items-center gap-3 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        <span className="relative" aria-hidden="true">
          {isGroup ? (
            (() => {
              const Icon = convIcon(item.type, item.icon_emoji, item.room_type);
              return (
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-white"
                  style={{ background: item.icon_color || '#2563EB' }}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
              );
            })()
          ) : (
            <HoverableUserAvatar
              userId={item.user_id}
              fallbackName={item.name}
            >
              <Avatar className="h-11 w-11">
                <AvatarFallback
                  style={{ background: item.avatar_color || '#2563EB' }}
                  className="font-bold text-white"
                >
                  {item.avatar_text}
                </AvatarFallback>
              </Avatar>
            </HoverableUserAvatar>
          )}
          {item.online && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold text-slate-950">{item.name}</span>
            <TypeBadge tone={badgeTone}>{label}</TypeBadge>
          </span>
          <span className="mt-1 block truncate text-sm text-slate-500">
            {item.last_msg || '暂无消息'}
          </span>
        </span>
      </button>
      <span className="flex items-center gap-3">
        <span className="hidden text-xs tabular-nums text-slate-400 md:inline">
          {item.last_time}
        </span>
        {item.unread > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
            {item.unread > 99 ? '99+' : item.unread}
          </span>
        )}
        <button
          type="button"
          onClick={onDelete}
          onKeyDown={(e) => e.key === 'Enter' && onDelete(e)}
          aria-label="删除会话"
          className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 group-hover:inline-flex"
        >
          <X className="h-4 w-4" />
        </button>
      </span>
    </div>
  );
}

function ChatAside({ loaded, conversations, unread, onlineFriends, onPrivate }) {
  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-heading text-base font-bold text-slate-950">消息概览</h3>
        <div className="mt-4 grid grid-cols-2 divide-x divide-slate-100 text-center">
          <div>
            <div className="font-heading text-2xl font-bold tabular-nums text-slate-950">
              {loaded ? conversations.length : '·'}
            </div>
            <div className="mt-1 text-xs text-slate-500">会话</div>
          </div>
          <div>
            <div className="font-heading text-2xl font-bold tabular-nums text-red-500">
              {loaded ? unread : '·'}
            </div>
            <div className="mt-1 text-xs text-slate-500">未读</div>
          </div>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-heading text-base font-bold text-slate-950">在线好友</h3>
        <div className="mt-4 space-y-3">
          {onlineFriends.length === 0 && (
            <p className="text-sm text-slate-500">暂无好友在线</p>
          )}
          {onlineFriends.slice(0, 6).map((item) => (
            <div
              key={item.user_id}
              className="flex w-full items-center gap-3 text-left"
            >
              <HoverableUserAvatar
                userId={item.user_id}
                fallbackName={item.username}
                className="relative shrink-0"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback
                    style={{ background: item.avatar_color }}
                    className="text-xs font-bold text-white"
                  >
                    {item.avatar_text}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </HoverableUserAvatar>
              <button
                type="button"
                onClick={() => onPrivate(item.user_id, item.username)}
                className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-slate-700"
              >
                {item.username}
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function GroupPickerDialog({
  open,
  onOpenChange,
  friends,
  pickerName,
  setPickerName,
  pickerSelected,
  toggleGroupPick,
  createGroup,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-lg border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-100 p-5 pb-4">
          <DialogTitle className="text-xl text-slate-950">新建群聊</DialogTitle>
          <p className="mt-1 text-sm text-slate-500">
            已选 {pickerSelected.length} 位，至少选择 2 位好友。
          </p>
        </DialogHeader>
        <div className="px-5 py-4">
          <Input
            value={pickerName}
            onChange={(e) => setPickerName(e.target.value)}
            placeholder="群名（可留空，默认成员名拼接）"
          />
        </div>
        <div className="max-h-[40vh] overflow-y-auto px-2 pb-2">
          {friends.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              暂无好友，先去「按学号找人」加几个
            </p>
          )}
          {friends.map((f) => {
            const av = makeAvatar(f.username || f.user_id || '?');
            const on = pickerSelected.includes(f.user_id);
            return (
              <button
                key={f.user_id}
                type="button"
                onClick={() => toggleGroupPick(f.user_id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  on ? 'bg-blue-50' : 'hover:bg-slate-50',
                )}
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback
                    style={{ background: f.avatar_color || av.color }}
                    className="text-xs font-bold text-white"
                  >
                    {f.avatar_text || av.text}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-sm font-medium text-slate-800">
                  {f.username}
                </span>
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                    on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white',
                  )}
                >
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
        <DialogFooter className="border-t border-slate-100 p-5 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
            取消
          </Button>
          <Button
            onClick={createGroup}
            disabled={pickerSelected.length < 2}
            className="flex-[1.4]"
          >
            创建群聊
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
