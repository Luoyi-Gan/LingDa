// UI 重做 Phase 2：Me 个人中心 Bento 重写
// 主色三件套：t-sky / t-violet / t-teal，配 t-amber 强调
// 每块角落保留简笔画装饰图标
import { useEffect, useState, useCallback } from 'react';
import {
  Star,
  Users,
  UserPlus,
  Settings as SettingsIcon,
  Bell,
  Lock,
  Edit3,
  Trophy,
  Flag,
  MessageSquare,
  ChevronRight,
  LogOut,
  Heart,
} from 'lucide-react';
import { api } from '../../lib/api';
import { achievementIcon } from '../../lib/iconMap';
import authLib from '../../lib/auth';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useWxNav } from '../../lib/nav';
import EditProfileModal from '../../components/EditProfileModal';
import FriendRequestsModal from '../../components/FriendRequestsModal';
import { useFriends } from '../../context/FriendsContext';
import { Card } from '../../components/ui/card';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/cn';

const DETAIL_PATH = {
  carpool: '/pages/detail-carpool/detail-carpool',
  entertainment: '/pages/detail-entertainment/detail-entertainment',
  group: '/pages/detail-study/detail-study',
};

export default function Me() {
  const { setUser } = useAuth();
  const { showToast, showModal } = useUI();
  const nav = useWxNav();
  const [user, setUserState] = useState({});
  const [editing, setEditing] = useState(false);
  const [friendReqOpen, setFriendReqOpen] = useState(false);
  const { incoming = [], friends = [] } = useFriends() || {};
  const [ratingDist, setRatingDist] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [teammates, setTeammates] = useState([]);
  const [sendingTo, setSendingTo] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const loadTeams = useCallback(() => {
    api.users
      .myRooms({ phase: 'ongoing', page: 1, pageSize: 20 })
      .then((r) => setMyTeams(r.list || []))
      .catch(() => {});
  }, []);

  const loadTeammates = useCallback(() => {
    api.users
      .teammates()
      .then((r) => setTeammates(r.list || []))
      .catch(() => {});
  }, []);

  const loadData = () => {
    api.users.me().then((me) => {
      setUser(me);
      authLib.saveCurrentUser(me);
      const uid = me.user_id;
      Promise.all([
        api.users.profile(uid),
        api.users.evaluations(uid, { page: 1, pageSize: 10 }),
      ])
        .then(([profile, evalRes]) => {
          setUserState({ ...profile.user, phone: me.phone });
          setRatingDist(profile.rating.distribution);
          setEvaluations(evalRes.list || []);
          setAchievements(profile.achievements);
        })
        .catch(() => {})
        .finally(() => setLoaded(true));
    });
  };

  useEffect(() => {
    if (authLib.requireLogin()) return;
    loadData();
    loadTeams();
    loadTeammates();
  }, [loadTeams, loadTeammates]);

  const openTeam = (t) => {
    const path = DETAIL_PATH[t.room_type] || DETAIL_PATH.group;
    nav.navigateTo({ url: `${path}?id=${t.room_id}` });
  };

  const openTeammate = (m) => {
    nav.navigateTo({
      url: `/pages/chat-detail/chat-detail?convId=private_${m.user_id}&type=private&userId=${m.user_id}&name=${encodeURIComponent(m.username || '')}`,
    });
  };

  const teammateAction = (e, m) => {
    e.stopPropagation();
    if (m.friend_status === 'accepted') {
      openTeammate(m);
      return;
    }
    if (m.friend_status === 'none') {
      setSendingTo(m.user_id);
      api.social
        .sendRequest({ targetUserId: m.user_id })
        .then(() => {
          showToast({ title: '已发送好友申请', icon: 'success' });
          setTeammates((prev) =>
            prev.map((x) =>
              x.user_id === m.user_id ? { ...x, friend_status: 'pending_out' } : x,
            ),
          );
        })
        .catch(() => {})
        .finally(() => setSendingTo(null));
    }
  };

  const leaveTeam = (e, t) => {
    e.stopPropagation();
    const isOwner = t.role === 'owner';
    showModal({
      title: isOwner ? '结束并解散' : '退出队伍',
      content: isOwner
        ? `这会把「${t.title}」标记为已结束，所有成员将无法继续加入，确定？`
        : `这会把你从「${t.title}」中移除，名额释放给其他搭子，确定？`,
      confirmText: isOwner ? '结束' : '退队',
      confirmColor: '#F59E0B',
    }).then((res) => {
      if (!res.confirm) return;
      const p = isOwner
        ? api.rooms.finish(t.room_id)
        : api.members.leave(t.room_id);
      p.then(() => {
        showToast({
          title: isOwner ? '已结束' : '已退队',
          icon: 'success',
        });
        loadTeams();
      }).catch(() => {});
    });
  };

  const onLogout = () => {
    showModal({ title: '退出登录', content: '确定要退出吗?' }).then((res) => {
      if (res.confirm) authLib.logout();
    });
  };

  return (
    <div className="relative min-h-screen pb-32 md:pb-12">
      <div className="relative mx-auto w-full max-w-[1180px] px-4 pt-6 md:px-8 md:pt-10">
        <div className="bento-grid">
          {/* ===== Personal Hero —— 大卡：头像 + 名字 + 学院 + 标签 ===== */}
          <Card
            bento
            className="col-span-2 md:col-span-4 xl:col-span-4 row-span-2 relative overflow-hidden p-6 md:p-8"
          >
            {/* 角落简笔几何装饰 */}
            <svg
              aria-hidden
              className="absolute -right-8 -top-8 w-48 h-48 opacity-[0.06] text-primary"
              viewBox="0 0 200 200"
              fill="none"
            >
              <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 10 100 L 190 100 M 100 10 L 100 190" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="relative flex items-start gap-5">
              <Avatar className="h-20 w-20 md:h-24 md:w-24 ring-2 ring-border">
                <AvatarFallback
                  style={{ background: user.avatar_color }}
                  className="text-white font-bold text-3xl"
                >
                  {user.avatar_text || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Profile
                  </p>
                  {user.rating && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                      <Star className="h-3 w-3" fill="currentColor" />
                      <span className="tabular-nums">{user.rating}</span>
                    </span>
                  )}
                </div>
                {loaded ? (
                  <h1 className="font-heading text-3xl md:text-4xl font-bold leading-tight tracking-tight truncate text-foreground">
                    {user.username || '同学'}
                  </h1>
                ) : (
                  <Skeleton className="h-10 w-40" />
                )}
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {user.college}
                  {user.major && <> · {user.major}</>}
                </p>
                {Array.isArray(user.tags) && user.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {user.tags.slice(0, 6).map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* 三项核心数据 inline */}
            <div className="relative mt-6 pt-5 border-t border-border grid grid-cols-3 gap-4">
              <div>
                <div className="font-heading text-2xl md:text-3xl font-bold tabular-nums text-foreground">
                  {user.post_count ?? 0}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">组队</div>
              </div>
              <div className="border-l border-border pl-4">
                <div className="font-heading text-2xl md:text-3xl font-bold tabular-nums text-foreground">
                  {user.match_count ?? 0}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">搭子</div>
              </div>
              <div className="border-l border-border pl-4">
                <div className="font-heading text-2xl md:text-3xl font-bold tabular-nums text-foreground">
                  {user.rating_count ?? 0}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">收到评价</div>
              </div>
            </div>
          </Card>

          {/* ===== 设置 —— 紧贴 Hero 旁，4 item 紧凑列表 ===== */}
          <Card
            bento
            className="col-span-2 md:col-span-4 xl:col-span-2 row-span-2 p-4 md:p-5 relative overflow-hidden"
          >
            <SettingsIcon
              aria-hidden
              className="absolute -right-6 -bottom-6 h-32 w-32 text-foreground/[0.04]"
              strokeWidth={1.25}
            />
            <div className="relative flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                设置
              </span>
            </div>
            <div className="relative space-y-1">
              <SettingRow
                icon={Edit3}
                label="编辑个人信息"
                onClick={() => setEditing(true)}
              />
              <SettingRow
                icon={UserPlus}
                label={`好友申请${friends.length > 0 ? ` · ${friends.length}` : ''}`}
                badge={incoming.length}
                onClick={() => setFriendReqOpen(true)}
              />
              <SettingRow icon={Lock} label="隐私设置" muted />
              <SettingRow icon={Bell} label="消息通知" muted />
              <button
                onClick={onLogout}
                className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-muted text-muted-foreground hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-300 transition-colors py-2.5 text-sm font-semibold"
              >
                <LogOut className="h-3.5 w-3.5" />
                退出登录
              </button>
            </div>
          </Card>

          {/* ===== 我的队伍 —— t-teal 大色块 + 角落 Flag 简笔 ===== */}
          {myTeams.length > 0 && (
            <Card
              bento
              className="col-span-2 md:col-span-4 xl:col-span-3 t-teal border-transparent p-5 md:p-6 relative overflow-hidden"
            >
              <Flag
                aria-hidden
                className="absolute -right-6 -bottom-6 h-36 w-36 opacity-25"
                strokeWidth={1.25}
              />
              <div className="relative flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
                  我的队伍
                </span>
                <span className="ml-auto inline-flex items-center rounded-full bg-white/50 dark:bg-white/10 px-2 py-0.5 text-[10px] font-semibold">
                  进行中 · {myTeams.length}
                </span>
              </div>
              <div className="relative space-y-2">
                {myTeams.slice(0, 4).map((t) => (
                  <div
                    key={t.room_id}
                    onClick={() => openTeam(t)}
                    className="flex items-center gap-3 rounded-lg bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm p-3 cursor-pointer hover:bg-white/70 dark:hover:bg-white/[0.10] transition-colors group"
                  >
                    <div
                      className="h-1 self-stretch w-1 rounded-full shrink-0"
                      style={{ background: t.accent }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider opacity-70">
                        <span>{t.accent_label}</span>
                        {t.role === 'owner' && (
                          <span className="inline-flex items-center rounded-full bg-amber-200/80 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 px-1.5 py-0.5 text-[9px] font-bold">
                            房主
                          </span>
                        )}
                        <span className="opacity-60">
                          · {t.status === 'full' ? '已满员' : '招募中'}
                        </span>
                      </div>
                      <div className="font-semibold text-sm truncate mt-0.5">
                        {t.title}
                      </div>
                      <div className="text-xs opacity-70 mt-0.5 tabular-nums">
                        {t.meet_time
                          ? new Date(t.meet_time).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '时间待定'}
                      </div>
                    </div>
                    <button
                      onClick={(e) => leaveTeam(e, t)}
                      className="text-xs font-bold rounded-full bg-white/60 dark:bg-white/10 px-3 py-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                    >
                      {t.role === 'owner' ? '结束' : '退队'}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ===== 评分分布 —— 数据卡：白底 + 5 条横向柱 ===== */}
          <Card
            bento
            className={cn(
              'col-span-2 md:col-span-4 xl:col-span-3 p-5 md:p-6 relative overflow-hidden',
              myTeams.length === 0 && 'xl:col-span-6',
            )}
          >
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                评分分布
              </span>
              {user.rating != null && (
                <span className="ml-auto inline-flex items-baseline gap-0.5">
                  <span className="font-heading text-2xl font-bold tabular-nums text-foreground">
                    {user.rating}
                  </span>
                  <span className="text-xs text-muted-foreground">/5.0</span>
                </span>
              )}
            </div>
            <div className="space-y-2">
              {(loaded ? ratingDist : Array(5).fill({ stars: 0, pct: 0, count: 0 })).map(
                (item, i) => (
                  <div key={item.stars || i} className="flex items-center gap-3 text-xs">
                    <span className="w-6 inline-flex items-center gap-0.5 text-muted-foreground font-semibold">
                      {item.stars}
                      <Star className="h-2.5 w-2.5" fill="currentColor" />
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${item.pct || 0}%` }}
                      />
                    </div>
                    <span className="w-6 text-right tabular-nums text-muted-foreground">
                      {item.count || 0}
                    </span>
                  </div>
                ),
              )}
            </div>
          </Card>

          {/* ===== 成就 —— t-amber 色块 + Trophy 简笔 ===== */}
          {achievements.length > 0 && (
            <Card
              bento
              className="col-span-2 md:col-span-4 xl:col-span-6 t-amber border-transparent p-5 md:p-6 relative overflow-hidden"
            >
              <Trophy
                aria-hidden
                className="absolute -right-6 -bottom-6 h-40 w-40 opacity-20"
                strokeWidth={1.25}
              />
              <div className="relative flex items-center gap-2 mb-4">
                <Trophy className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
                  成就 · {achievements.filter((a) => a.got).length}/{achievements.length}
                </span>
              </div>
              <div className="relative grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {achievements.map((item) => {
                  const Icon = achievementIcon(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-sm p-3',
                        !item.got && 'opacity-50',
                      )}
                    >
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: item.got ? item.color : 'rgba(0,0,0,0.08)',
                          color: item.got ? '#fff' : 'currentColor',
                        }}
                      >
                        {item.got ? <Icon className="h-5 w-5" strokeWidth={2} /> : <Lock className="h-4 w-4" strokeWidth={2} />}
                      </div>
                      <span className="text-[10px] font-semibold text-center leading-tight">
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ===== 历史搭子 —— t-violet 色块 + Heart 简笔 ===== */}
          {teammates.length > 0 && (
            <Card
              bento
              className="col-span-2 md:col-span-4 xl:col-span-6 t-violet border-transparent p-5 md:p-6 relative overflow-hidden"
            >
              <Heart
                aria-hidden
                className="absolute -right-6 -bottom-6 h-36 w-36 opacity-20"
                strokeWidth={1.25}
                fill="currentColor"
                fillOpacity={0.5}
              />
              <div className="relative flex items-center gap-2 mb-4">
                <Users className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
                  历史搭子 · {teammates.length}
                </span>
              </div>
              <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {teammates.map((m) => (
                  <div
                    key={m.user_id}
                    onClick={() => openTeammate(m)}
                    className="flex flex-col items-center gap-2 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-sm p-3 cursor-pointer hover:bg-white/70 dark:hover:bg-white/15 transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback
                        style={{ background: m.avatar_color }}
                        className="text-white font-bold"
                      >
                        {m.avatar_text}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-xs font-semibold text-center line-clamp-1 w-full">
                      {m.username}
                    </div>
                    <div className="text-[10px] opacity-70 tabular-nums">
                      共 {m.shared_rooms} 次
                    </div>
                    {m.friend_status === 'accepted' && (
                      <button
                        onClick={(e) => teammateAction(e, m)}
                        className="text-[10px] font-bold rounded-full bg-white/60 dark:bg-white/15 px-2.5 py-1 hover:bg-white/80 transition-colors"
                      >
                        发消息
                      </button>
                    )}
                    {m.friend_status === 'none' && (
                      <button
                        onClick={(e) => teammateAction(e, m)}
                        disabled={sendingTo === m.user_id}
                        className="text-[10px] font-bold rounded-full bg-foreground text-background px-2.5 py-1 hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {sendingTo === m.user_id ? '···' : '加好友'}
                      </button>
                    )}
                    {m.friend_status === 'pending_out' && (
                      <button
                        disabled
                        className="text-[10px] font-bold rounded-full bg-white/30 dark:bg-white/5 opacity-60 px-2.5 py-1"
                      >
                        已申请
                      </button>
                    )}
                    {m.friend_status === 'pending_in' && (
                      <button
                        disabled
                        className="text-[10px] font-bold rounded-full bg-white/30 dark:bg-white/5 opacity-60 px-2.5 py-1"
                      >
                        待回应
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ===== 最近评价 —— t-sky 色块 + MessageSquare 简笔 ===== */}
          {evaluations.length > 0 && (
            <Card
              bento
              className="col-span-2 md:col-span-4 xl:col-span-6 t-sky border-transparent p-5 md:p-6 relative overflow-hidden"
            >
              <MessageSquare
                aria-hidden
                className="absolute -right-6 -bottom-6 h-36 w-36 opacity-20"
                strokeWidth={1.25}
              />
              <div className="relative flex items-center gap-2 mb-4">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
                  最近评价
                </span>
              </div>
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-3">
                {evaluations.slice(0, 4).map((item, idx) => (
                  <div
                    key={item.evaluate_id || idx}
                    className="rounded-xl bg-white/55 dark:bg-white/10 backdrop-blur-sm p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          style={{ background: item.from_avatar_color }}
                          className="text-white text-xs font-bold"
                        >
                          {item.from_avatar_text}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">
                          {item.from_username}
                        </div>
                        <div className="text-[10px] opacity-60 truncate">
                          {item.activity}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-0.5">
                        {Array.from({ length: item.score || 5 }).map((_, i) => (
                          <Star key={i} className="h-2.5 w-2.5" fill="currentColor" />
                        ))}
                      </div>
                    </div>
                    {item.content && (
                      <p className="text-xs leading-relaxed line-clamp-2">
                        {item.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {friendReqOpen && (
        <FriendRequestsModal onClose={() => setFriendReqOpen(false)} />
      )}
      {editing && (
        <EditProfileModal
          initial={user}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// 设置项行：图标 + 文字 + 角标 + 箭头
function SettingRow({ icon: Icon, label, badge, muted, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors text-left',
        muted ? 'text-muted-foreground' : 'text-foreground',
        'hover:bg-muted',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span className="flex-1 font-medium truncate">{label}</span>
      {badge > 0 && (
        <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cta text-cta-foreground px-1 text-[10px] font-bold tabular-nums">
          {badge}
        </span>
      )}
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
    </button>
  );
}
