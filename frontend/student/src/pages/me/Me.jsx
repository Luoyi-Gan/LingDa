import { useEffect, useState, useCallback } from 'react';
import {
  ChevronRight,
  Edit3,
  Flag,
  Heart,
  Lock,
  MessageSquare,
  ShieldCheck,
  Star,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { api } from '../../lib/api';
import { achievementIcon } from '../../lib/iconMap';
import authLib from '../../lib/auth';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useWxNav } from '../../lib/nav';
import EditProfileModal from '../../components/EditProfileModal';
import FriendRequestsModal from '../../components/FriendRequestsModal';
import UserCard from '../../components/UserCard';
import { formatCohort } from '../../lib/cohort';
import { useFriends } from '../../context/FriendsContext';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import {
  AppPage,
  EmptyPanel,
  LineButton,
  PageHeader,
  SectionHeader,
  SectionSurface,
} from '../../components/layout/AppScaffold';
import { cn } from '../../lib/cn';

export default function Me() {
  const { setUser } = useAuth();
  const { showToast } = useUI();
  const nav = useWxNav();
  const [user, setUserState] = useState({});
  const [editing, setEditing] = useState(false);
  const [friendReqOpen, setFriendReqOpen] = useState(false);
  const { incoming = [] } = useFriends() || {};
  const [ratingDist, setRatingDist] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [teammates, setTeammates] = useState([]);
  const [sendingTo, setSendingTo] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [profileUser, setProfileUser] = useState(null);

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
          setUserState({
            ...profile.user,
            phone: me.phone,
            post_count: profile.stats?.post_count || 0,
            community_post_count: profile.stats?.community_post_count || 0,
            match_count: profile.stats?.matched_user_count || 0,
            rating_count: profile.stats?.evaluation_count || 0,
            rating: profile.rating?.average || 0,
          });
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

  const openChat = (m) => {
    nav.navigateTo({
      url: `/pages/chat-detail/chat-detail?convId=private_${m.user_id}&type=private&userId=${m.user_id}&name=${encodeURIComponent(m.username || '')}`,
    });
  };

  const teammateAction = (e, m) => {
    e.stopPropagation();
    if (m.friend_status === 'accepted') {
      openChat(m);
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

  return (
    <>
      <AppPage
        aside={
          <MeAside
            user={user}
            loaded={loaded}
            teams={myTeams}
            teammates={teammates}
            achievements={achievements}
            incoming={incoming}
            onEdit={() => setEditing(true)}
            onRequests={() => setFriendReqOpen(true)}
            onTeams={() => nav.navigateTo({ url: '/teams' })}
            onSettings={() => nav.navigateTo({ url: '/settings' })}
          />
        }
      >
        <PageHeader
          eyebrow="Profile"
          title="个人资料"
          subtitle="整理你的身份、评分、搭子和收到的反馈。"
          action={
            <LineButton onClick={() => setEditing(true)}>
              <Edit3 className="h-4 w-4" />
              编辑资料
            </LineButton>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <div className="space-y-6">
            <ProfilePanel user={user} loaded={loaded} />
            <RatingPanel user={user} ratingDist={ratingDist} loaded={loaded} />
            <ReviewsPanel evaluations={evaluations} />
          </div>

          <div className="space-y-6">
            <TeammatesPanel
              teammates={teammates}
              sendingTo={sendingTo}
              onOpen={setProfileUser}
              onAction={teammateAction}
            />
            <AchievementsPanel achievements={achievements} />
          </div>
        </div>
      </AppPage>

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
      {profileUser && (
        <UserCard
          userId={profileUser.user_id}
          fallbackName={profileUser.username}
          onClose={() => setProfileUser(null)}
        />
      )}
    </>
  );
}

function ProfilePanel({ user, loaded }) {
  return (
    <SectionSurface className="p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <Avatar className="h-20 w-20 ring-4 ring-blue-50 md:h-24 md:w-24">
          <AvatarFallback
            style={{ background: user.avatar_color || '#2563EB' }}
            className="text-3xl font-bold text-white"
          >
            {user.avatar_text || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {loaded ? (
              <h2 className="truncate font-heading text-3xl font-bold tracking-tight text-slate-950">
                {user.username || '同学'}
              </h2>
            ) : (
              <Skeleton className="h-9 w-36" />
            )}
            {user.rating && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-sm font-bold text-amber-700">
                <Star className="h-3.5 w-3.5" fill="currentColor" />
                {user.rating}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {user.college || '学校信息待完善'}
            {user.major && <> · {user.major}</>}
            {user.grade && <> · {formatCohort(user.grade)}</>}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
              {profileRole(user.account_role)}
            </span>
            {user.verification_status === 'verified' && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> 已认证
              </span>
            )}
          </div>
          {user.bio && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{user.bio}</p>}
          {Array.isArray(user.tags) && user.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {user.tags.slice(0, 8).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-4 divide-x divide-slate-100 rounded-lg bg-slate-50 py-4">
        <ProfileStat value={user.community_post_count ?? 0} label="帖子" />
        <ProfileStat value={user.post_count ?? 0} label="组队" />
        <ProfileStat value={user.match_count ?? 0} label="搭子" />
        <ProfileStat value={user.rating_count ?? 0} label="评价" />
      </div>
    </SectionSurface>
  );
}

function profileRole(role) {
  return ({ student: '在校学生', club: '认证社团', official: '官方机构', admin: '管理员' })[role] || '在校学生';
}

function ProfileStat({ value, label }) {
  return (
    <div className="px-3 text-center">
      <div className="font-heading text-2xl font-bold tabular-nums text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function RatingPanel({ user, ratingDist, loaded }) {
  const items = loaded ? ratingDist : Array(5).fill({ stars: 0, pct: 0, count: 0 });
  return (
    <SectionSurface className="p-5 md:p-6">
      <SectionHeader
        title="评分分布"
        subtitle="来自历史搭子对协作体验的反馈"
        action={
          user.rating != null && (
            <span className="inline-flex items-baseline gap-1">
              <span className="font-heading text-2xl font-bold text-slate-950">
                {user.rating}
              </span>
              <span className="text-xs text-slate-400">/5.0</span>
            </span>
          )
        }
      />
      <div className="mt-5 space-y-2.5">
        {items.map((item, i) => (
          <div key={item.stars || i} className="flex items-center gap-3 text-xs">
            <span className="flex w-8 items-center gap-1 font-semibold text-slate-500">
              {item.stars || 5 - i}
              <Star className="h-3 w-3" fill="currentColor" />
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                style={{ width: `${item.pct || 0}%` }}
              />
            </div>
            <span className="w-8 text-right tabular-nums text-slate-400">
              {item.count || 0}
            </span>
          </div>
        ))}
      </div>
    </SectionSurface>
  );
}

function ReviewsPanel({ evaluations }) {
  return (
    <section className="space-y-3">
      <SectionHeader title="最近评价" subtitle="最近收到的协作反馈" />
      <SectionSurface>
        {evaluations.length === 0 && <EmptyPanel icon={MessageSquare} text="还没有收到评价" />}
        {evaluations.slice(0, 4).map((item, idx) => (
          <div
            key={item.evaluate_id || idx}
            className="flex gap-3 border-b border-slate-100 p-4 last:border-b-0"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback
                style={{ background: item.from_avatar_color || '#2563EB' }}
                className="text-sm font-bold text-white"
              >
                {item.from_avatar_text || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {item.from_username || '同学'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {item.activity || '组队活动'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 text-amber-500">
                  {Array.from({ length: item.score || 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3" fill="currentColor" />
                  ))}
                </div>
              </div>
              {item.content && (
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.content}</p>
              )}
            </div>
          </div>
        ))}
      </SectionSurface>
    </section>
  );
}

function TeammatesPanel({ teammates, sendingTo, onOpen, onAction }) {
  return (
    <section className="space-y-3">
      <SectionHeader title="历史搭子" subtitle={`${teammates.length} 位一起组过队的同学`} />
      <SectionSurface>
        {teammates.length === 0 && <EmptyPanel icon={Heart} text="完成组队后会沉淀你的历史搭子" />}
        <div className="grid grid-cols-2 gap-px bg-slate-100 md:grid-cols-3">
          {teammates.map((mate) => (
            <div
              key={mate.user_id}
              className="min-w-0 bg-white p-4 text-center transition hover:bg-slate-50"
            >
              <button
                type="button"
                onClick={() => onOpen(mate)}
                className="block w-full rounded-lg px-2 py-1 text-center transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <Avatar className="mx-auto h-12 w-12">
                  <AvatarFallback
                    style={{ background: mate.avatar_color || '#2563EB' }}
                    className="font-bold text-white"
                  >
                    {mate.avatar_text || '?'}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-2 truncate text-sm font-semibold text-slate-950">
                  {mate.username}
                </p>
                <p className="mt-1 text-xs text-slate-400">共 {mate.shared_rooms} 次</p>
              </button>
              <MateAction
                mate={mate}
                sending={sendingTo === mate.user_id}
                onAction={onAction}
              />
            </div>
          ))}
        </div>
      </SectionSurface>
    </section>
  );
}

function MateAction({ mate, sending, onAction }) {
  const base =
    'mt-3 inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-xs font-semibold';
  if (mate.friend_status === 'accepted') {
    return (
      <button
        type="button"
        onClick={(e) => onAction(e, mate)}
        onKeyDown={(e) => e.key === 'Enter' && onAction(e, mate)}
        className={cn(base, 'bg-blue-50 text-blue-700')}
      >
        发消息
      </button>
    );
  }
  if (mate.friend_status === 'none') {
    return (
      <button
        type="button"
        onClick={(e) => onAction(e, mate)}
        onKeyDown={(e) => e.key === 'Enter' && onAction(e, mate)}
        className={cn(base, 'bg-slate-950 text-white')}
      >
        {sending ? '···' : '加好友'}
      </button>
    );
  }
  return (
    <span className={cn(base, 'bg-slate-100 text-slate-400')}>
      {mate.friend_status === 'pending_in' ? '待回应' : '已申请'}
    </span>
  );
}

function AchievementsPanel({ achievements }) {
  const got = achievements.filter((item) => item.got).length;
  return (
    <section className="space-y-3">
      <SectionHeader title="成就" subtitle={`${got}/${achievements.length} 已点亮`} />
      <SectionSurface className="p-4">
        {achievements.length === 0 && <EmptyPanel icon={Trophy} text="还没有成就数据" />}
        {achievements.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {achievements.map((item) => {
              const Icon = achievementIcon(item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-lg border border-slate-100 bg-slate-50 p-3 text-center',
                    !item.got && 'opacity-45',
                  )}
                >
                  <span
                    className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-white"
                    style={{ background: item.got ? item.color || '#2563EB' : '#CBD5E1' }}
                  >
                    {item.got ? (
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    ) : (
                      <Lock className="h-4 w-4" strokeWidth={2} />
                    )}
                  </span>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold leading-4 text-slate-600">
                    {item.name}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </SectionSurface>
    </section>
  );
}

function MeAside({
  user,
  loaded,
  teams,
  teammates,
  achievements,
  incoming,
  onEdit,
  onRequests,
  onTeams,
  onSettings,
}) {
  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14">
            <AvatarFallback
              style={{ background: user.avatar_color || '#2563EB' }}
              className="font-bold text-white"
            >
              {user.avatar_text || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {loaded ? (
              <h3 className="truncate font-heading text-lg font-bold text-slate-950">
                {user.username || '同学'}
              </h3>
            ) : (
              <Skeleton className="h-5 w-24" />
            )}
            <p className="mt-1 truncate text-sm text-slate-500">{user.college || '灵搭用户'}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 text-center">
          <MiniMetric label="队伍" value={teams.length} />
          <MiniMetric label="搭子" value={teammates.length} />
          <MiniMetric label="成就" value={achievements.filter((a) => a.got).length} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <SettingRow icon={Edit3} label="编辑资料" onClick={onEdit} />
        <SettingRow icon={Flag} label="我的组队" badge={teams.length} onClick={onTeams} />
        <SettingRow
          icon={UserPlus}
          label="好友申请"
          badge={incoming.length}
          onClick={onRequests}
        />
        <SettingRow icon={ShieldCheck} label="设置与隐私" onClick={onSettings} />
      </section>
    </>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div>
      <div className="font-heading text-xl font-bold tabular-nums text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, badge, muted, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition',
        muted ? 'text-slate-400' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span className="min-w-0 flex-1 truncate font-semibold">{label}</span>
      {badge > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold tabular-nums text-white">
          {badge}
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </button>
  );
}
