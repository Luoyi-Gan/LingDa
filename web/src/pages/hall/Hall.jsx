// UI 重做 Phase 1.7：Hall 再迭代
// · Hello 卡：时间问候（早/午/晚）+ 待办 chips（待审核 / 未读消息）
// · 实时社区卡：tech-dots 底，更紧凑
// · 进行中倒计时大卡：保留
// · 三类入口胶囊：tint 大色块 + 角落简笔（保留）
// · 今日热门：上方加类型过滤 pills；热门小卡更紧凑
// · 全站 emoji 已由 lucide 取代
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Car,
  Sparkles,
  BookOpen,
  Star,
  ChevronRight,
  Flame,
  Users,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Clock3,
  Bell,
  MessageCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useWxNav } from '../../lib/nav';
import { Card } from '../../components/ui/card';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/cn';

const CATEGORIES = [
  {
    key: 'carpool',
    name: '拼车',
    sub: '出门别一个人',
    icon: Car,
    tint: 't-sky',
  },
  {
    key: 'entertainment',
    name: '娱乐',
    sub: '电影 / KTV / 剧本杀',
    icon: Sparkles,
    tint: 't-violet',
  },
  {
    key: 'study',
    name: '学习',
    sub: '图书馆 / 自习 / 作业',
    icon: BookOpen,
    tint: 't-teal',
  },
];

const HOT_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'carpool', label: '拼车' },
  { key: 'entertainment', label: '娱乐' },
  { key: 'study', label: '学习' },
];

const DETAIL_PATH = {
  carpool: '/pages/detail-carpool/detail-carpool',
  entertainment: '/pages/detail-entertainment/detail-entertainment',
  study: '/pages/detail-study/detail-study',
  group: '/pages/detail-study/detail-study',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '深夜好';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  if (h < 22) return '晚上好';
  return '夜里好';
}

export default function Hall() {
  const nav = useWxNav();
  const [user, setUser] = useState({});
  const [upcoming, setUpcoming] = useState(null);
  const [counts, setCounts] = useState({ carpool: 0, entertainment: 0, study: 0 });
  const [hot, setHot] = useState([]);
  const [hotFilter, setHotFilter] = useState('all');
  const [onlineCount, setOnlineCount] = useState('0');
  const [matchToday, setMatchToday] = useState(0);
  const [pendingEvals, setPendingEvals] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const formatOnlineCount = (n) => {
    if (!n) return '0';
    if (n < 1000) return String(n);
    return (n / 1000).toFixed(1) + 'k';
  };

  const refresh = useCallback(() => {
    api.hall
      .dashboard()
      .then((d) => {
        const c = d.counts || {};
        c.study = c.group;
        setUser(d.user || {});
        const up = d.upcoming || null;
        const upOpen =
          up && Number(up.current_num) < Number(up.total_num) ? up : null;
        setUpcoming(upOpen);
        setCounts(c);
        setHot((d.hot || []).filter((x) => Number(x.current_num) < Number(x.total_num)));
        setOnlineCount(formatOnlineCount(d.online_count));
        setMatchToday(d.match_today || 0);
      })
      .finally(() => setLoaded(true));
  }, []);

  const refreshNotifs = useCallback(() => {
    api.notifications
      .list({ unreadOnly: '1' })
      .then((r) => {
        const list = (r.list || []).filter((n) => n.type === 'room_finished');
        setPendingEvals(list);
      })
      .catch(() => {});
  }, []);

  // 未读消息总数（用于 Hello 卡的待办 chips）
  const refreshUnread = useCallback(() => {
    api.chat
      .conversations()
      .then((r) => {
        const list = r.list || [];
        const n = list.reduce((s, c) => s + (Number(c.unread) || 0), 0);
        setUnreadCount(n);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (authLib.requireLogin()) return;
    refresh();
    refreshNotifs();
    refreshUnread();
  }, [refresh, refreshNotifs, refreshUnread]);

  const handleEvalClick = (n) => {
    const p = n.payload || {};
    const id = p.room_id;
    const rt = p.room_type;
    if (!id || !rt) return;
    api.notifications.markRead(n.id).catch(() => {});
    setPendingEvals((prev) => prev.filter((x) => x.id !== n.id));
    nav.navigateTo({ url: `${DETAIL_PATH[rt] || DETAIL_PATH.group}?id=${id}` });
  };

  const goMatch = (type) => {
    nav.navigateTo({ url: `/pages/match-result/match-result?type=${type}` });
  };

  const goDetail = (id, type) => {
    nav.navigateTo({ url: `${DETAIL_PATH[type] || DETAIL_PATH.group}?id=${id}` });
  };

  // 过滤后的热门列表
  const visibleHot = useMemo(
    () =>
      hot.filter((x) => {
        if (hotFilter === 'all') return true;
        if (hotFilter === 'study') return x.room_type === 'study' || x.room_type === 'group';
        return x.room_type === hotFilter;
      }),
    [hot, hotFilter],
  );

  return (
    <div className="relative min-h-screen pb-32 lg:pb-12">
      <div className="relative mx-auto w-full max-w-[1180px] px-4 pt-6 md:px-8 md:pt-10">
        {/* 待评价 banner */}
        {pendingEvals.length > 0 && (
          <div className="mb-5 space-y-2">
            {pendingEvals.map((n) => {
              const p = n.payload || {};
              return (
                <button
                  key={n.id}
                  onClick={() => handleEvalClick(n)}
                  className="group flex w-full items-center gap-3 rounded-bento border border-border bg-card p-4 text-left transition-all hover:border-cta/40 hover:bg-cta/[0.03] hover:-translate-y-0.5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cta/10">
                    <Star className="h-4 w-4 text-cta" fill="currentColor" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      你在「{p.room_title || '某队伍'}」中的组队已结束
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      点这里给队友打分
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>
        )}

        {/* === Bento Grid === */}
        <div className="bento-grid">
          {/* Hello 卡：问候 + 待办 chips */}
          <Card
            bento
            className="col-span-2 md:col-span-2 xl:col-span-3 p-5 md:p-6 relative overflow-hidden"
          >
            <svg
              aria-hidden
              className="absolute -right-6 -top-6 w-40 h-40 opacity-[0.07] text-primary"
              viewBox="0 0 200 200"
              fill="none"
            >
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="55" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="1.5" />
              <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="1.5" />
              <line x1="100" y1="20" x2="100" y2="180" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="relative flex items-start gap-4">
              <Avatar className="h-14 w-14 md:h-16 md:w-16 ring-2 ring-border shrink-0">
                <AvatarFallback
                  style={{ background: user.avatar_color }}
                  className="text-white font-bold text-xl md:text-2xl"
                >
                  {user.avatar_text || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {greeting()}
                </p>
                {loaded ? (
                  <h1 className="font-heading text-2xl md:text-3xl font-bold leading-tight tracking-tight truncate text-foreground">
                    {user.username || '同学'}
                  </h1>
                ) : (
                  <Skeleton className="mt-1 h-8 w-32" />
                )}
                {/* 待办 chips */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pendingEvals.length > 0 && (
                    <ToDoChip
                      icon={Bell}
                      label={`${pendingEvals.length} 个待评价`}
                      tone="amber"
                    />
                  )}
                  {unreadCount > 0 && (
                    <ToDoChip
                      icon={MessageCircle}
                      label={`${unreadCount} 条未读`}
                      tone="indigo"
                      onClick={() => nav.navigateTo({ url: '/pages/chat/chat' })}
                    />
                  )}
                  {!pendingEvals.length && !unreadCount && (
                    <span className="text-xs text-muted-foreground">
                      今天没有待办，去发起一场组队吧
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Live 指标卡 */}
          <Card
            bento
            className="col-span-2 md:col-span-2 xl:col-span-3 p-5 md:p-6 relative overflow-hidden"
          >
            <div aria-hidden className="absolute inset-0 tech-dots-bg opacity-50" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  实时社区
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-800/50">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-cyan-500 animate-ping opacity-60" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  </span>
                  Live
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-heading text-3xl md:text-4xl font-bold tracking-tight tabular-nums text-foreground">
                    {loaded ? onlineCount : <Skeleton className="h-9 w-16" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">在线同学</div>
                </div>
                <div>
                  <div className="font-heading text-3xl md:text-4xl font-bold tracking-tight tabular-nums text-foreground flex items-baseline gap-1">
                    {loaded ? matchToday : <Skeleton className="h-9 w-16" />}
                    {loaded && matchToday > 0 && (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500 self-center" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">今日匹配成功</div>
                </div>
              </div>
            </div>
          </Card>

          {/* 进行中倒计时大卡（仅当有未满员的房间时显示） */}
          {upcoming && (
            <Card
              bento
              interactive
              onClick={() => goDetail(upcoming.room_id, upcoming.room_type)}
              className="col-span-2 md:col-span-4 xl:col-span-4 row-span-2 relative overflow-hidden p-0 group"
            >
              <div
                aria-hidden
                className="absolute left-0 right-0 top-0 h-[3px]"
                style={{ background: upcoming.accent }}
              />
              <div aria-hidden className="absolute inset-0 tech-grid-bg opacity-60" />
              <Clock3
                aria-hidden
                className="absolute -right-10 -bottom-10 h-56 w-56 text-foreground/[0.05] group-hover:text-foreground/[0.08] transition-colors"
                strokeWidth={1}
              />
              <div className="relative p-6 md:p-7 flex flex-col h-full min-h-[280px]">
                <div className="flex items-start justify-between mb-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                    style={{
                      background: `${upcoming.accent}14`,
                      color: upcoming.accent,
                      borderColor: `${upcoming.accent}33`,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: upcoming.accent }}
                    />
                    {upcoming.accent_label} · 进行中
                  </span>
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                    {upcoming.current_num}/{upcoming.total_num}
                  </span>
                </div>
                <h2 className="font-heading text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-2 text-foreground">
                  {upcoming.title}
                </h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  {upcoming.meet_label}
                  {upcoming.meet_location && <> · {upcoming.meet_location}</>}
                </p>
                <div className="mt-auto pt-8 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full t-amber px-3.5 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    <span className="font-heading text-sm font-bold tabular-nums">
                      {upcoming.countdown}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    去看看
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* 三类入口 —— 软冷色 tint 底 + 角落巨型简笔图标 */}
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const n = counts[cat.key] || 0;
            return (
              <Card
                bento
                interactive
                key={cat.key}
                onClick={() => goMatch(cat.key)}
                className={cn(
                  'col-span-1 md:col-span-2 xl:col-span-2 border-transparent p-5 group relative overflow-hidden',
                  cat.tint,
                )}
              >
                <Icon
                  aria-hidden
                  className="absolute -right-6 -bottom-6 h-32 w-32 opacity-25 group-hover:opacity-35 group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-300"
                  strokeWidth={1.25}
                />
                <div className="relative">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 dark:bg-white/10 mb-3 backdrop-blur-sm">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="font-heading text-lg font-bold tracking-tight">
                    {cat.name}
                  </div>
                  <div className="text-xs opacity-75 mt-0.5">{cat.sub}</div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold">
                    <span className="tabular-nums">{loaded ? n : '·'}</span>
                    <span className="opacity-75">个在招</span>
                  </div>
                </div>
                <ChevronRight className="absolute right-3 top-3 h-4 w-4 opacity-50 group-hover:opacity-90 group-hover:translate-x-0.5 transition-all" />
              </Card>
            );
          })}

          {/* 热门标题 + 类型过滤 pills */}
          <div className="col-span-2 md:col-span-4 xl:col-span-6 mt-2">
            <div className="flex items-end justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-cta" />
                <h2 className="font-heading text-lg md:text-xl font-bold tracking-tight text-foreground">
                  今日热门
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">最快可能凑齐</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 scrollbar-hide">
              {HOT_FILTERS.map((f) => {
                const on = hotFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setHotFilter(f.key)}
                    className={cn(
                      'shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                      on
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70',
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 热门卡 */}
          {!loaded &&
            [0, 1, 2, 3].map((i) => (
              <Card
                bento
                key={`s${i}`}
                className="col-span-2 md:col-span-2 xl:col-span-3 p-5"
              >
                <Skeleton className="h-5 w-16 mb-3" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-2 w-full mt-4" />
              </Card>
            ))}
          {loaded && visibleHot.length === 0 && (
            <Card
              bento
              className="col-span-2 md:col-span-4 xl:col-span-6 p-10 text-center"
            >
              <Users className="h-9 w-9 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {hotFilter === 'all'
                  ? '还没有在招队伍，点上方三类入口创建一个吧'
                  : `当前没有「${HOT_FILTERS.find((f) => f.key === hotFilter)?.label}」在招`}
              </p>
            </Card>
          )}
          {loaded &&
            visibleHot.map((item) => {
              const pct = Math.min(
                100,
                Math.round((item.current_num / item.total_num) * 100),
              );
              return (
                <Card
                  bento
                  interactive
                  key={item.room_id}
                  onClick={() => goDetail(item.room_id, item.room_type)}
                  className="col-span-2 md:col-span-2 xl:col-span-3 relative overflow-hidden p-5 pl-6 flex flex-col gap-2 group"
                >
                  <div
                    aria-hidden
                    className="absolute left-0 top-3 bottom-3 w-1 rounded-r"
                    style={{ background: item.accent }}
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{
                        background: `${item.accent}14`,
                        color: item.accent,
                      }}
                    >
                      {item.accent_label}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                      {item.meet_label}
                    </span>
                  </div>
                  <h3 className="font-heading text-base font-semibold leading-tight line-clamp-1 text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {item.subtitle}
                  </p>
                  <div className="mt-auto pt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ background: item.accent, width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground shrink-0">
                      {item.current_num}/{item.total_num}
                    </span>
                  </div>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// 待办小 chip
function ToDoChip({ icon: Icon, label, tone = 'indigo', onClick }) {
  const toneCls =
    tone === 'amber'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60'
      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/60';
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-transform hover:scale-[1.02]',
        toneCls,
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.4} />
      {label}
    </button>
  );
}
