import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Bell,
  BookOpen,
  CalendarDays,
  Car,
  ChevronRight,
  CirclePlus,
  Film,
  Search,
  Star,
  Users,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useWxNav } from '../../lib/nav';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/cn';
import { inkOn } from '../../lib/avatar';

const CATEGORIES = [
  {
    key: 'carpool',
    name: '拼车',
    sub: '校内外拼车，安全同行',
    action: '去找队友',
    icon: Car,
    color: '#2563EB',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
  },
  {
    key: 'entertainment',
    name: '娱乐',
    sub: '周末出游，看展观影',
    action: '去找队友',
    icon: Film,
    color: '#C2410C',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
  },
  {
    key: 'study',
    name: '课程组队',
    sub: '课程项目，小组作业',
    action: '去找队友',
    icon: BookOpen,
    color: '#15803D',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
  },
];

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'carpool', label: '拼车' },
  { key: 'entertainment', label: '娱乐' },
  { key: 'study', label: '学习' },
];

const EVENING_CAMPUS_IMAGE = {
  src: '/images/campus/campus-evening.jpg',
  label: '夜色校园',
  position: 'center bottom',
  overlay: 'from-slate-950/90 via-slate-950/62 to-slate-950/28',
};

const CAMPUS_IMAGES = [
  {
    src: '/images/campus/resource-center-sun.jpg',
    label: '资源中心',
    position: 'center',
    overlay: 'from-slate-950/90 via-slate-950/55 to-slate-950/22',
  },
  {
    src: '/images/campus/sky-courtyard.jpg',
    label: '晴空中庭',
    position: 'center',
    overlay: 'from-slate-950/90 via-slate-950/58 to-slate-950/24',
  },
  {
    src: '/images/campus/study-window.jpg',
    label: '学习空间',
    position: 'center',
    overlay: 'from-slate-950/88 via-slate-950/52 to-slate-950/20',
  },
  {
    src: '/images/campus/resource-center-soft.jpg',
    label: '校园建筑',
    position: 'center',
    overlay: 'from-slate-950/88 via-slate-950/50 to-slate-950/20',
  },
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

function typeMeta(type) {
  const key = type === 'group' ? 'study' : type;
  return CATEGORIES.find((x) => x.key === key) || CATEGORIES[2];
}

export default function Hall() {
  const nav = useWxNav();
  const [user, setUser] = useState({});
  const [upcoming, setUpcoming] = useState(null);
  const [counts, setCounts] = useState({ carpool: 0, entertainment: 0, study: 0 });
  const [hot, setHot] = useState([]);
  const [hotFilter, setHotFilter] = useState('all');
  const [pendingEvals, setPendingEvals] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    api.hall
      .dashboard()
      .then((d) => {
        const c = d.counts || {};
        c.study = c.group || c.study || 0;
        setUser(d.user || {});
        const up = d.upcoming || null;
        setUpcoming(up && Number(up.current_num) < Number(up.total_num) ? up : null);
        setCounts(c);
        setHot((d.hot || []).filter((x) => Number(x.current_num) < Number(x.total_num)));
      })
      .finally(() => setLoaded(true));
  }, []);

  const refreshNotifs = useCallback(() => {
    api.notifications
      .list({ unreadOnly: '1' })
      .then((r) => {
        setPendingEvals((r.list || []).filter((n) => n.type === 'room_finished'));
      })
      .catch(() => {});
  }, []);

  const refreshUnread = useCallback(() => {
    api.chat
      .conversations()
      .then((r) => {
        const list = r.list || [];
        setUnreadCount(list.reduce((s, c) => s + (Number(c.unread) || 0), 0));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (authLib.requireLogin()) return;
    refresh();
    refreshNotifs();
    refreshUnread();
  }, [refresh, refreshNotifs, refreshUnread]);

  const visibleHot = useMemo(
    () =>
      hot.filter((x) => {
        if (hotFilter === 'all') return true;
        if (hotFilter === 'study') return x.room_type === 'study' || x.room_type === 'group';
        return x.room_type === hotFilter;
      }),
    [hot, hotFilter],
  );

  const todayRows = visibleHot.slice(0, 4);
  const scheduleRows = (upcoming ? [upcoming, ...hot] : hot).slice(0, 3);

  const goMatch = (type) => {
    nav.navigateTo({ url: `/pages/match-result/match-result?type=${type}` });
  };

  const goDetail = (id, type) => {
    nav.navigateTo({ url: `${DETAIL_PATH[type] || DETAIL_PATH.group}?id=${id}` });
  };

  const goPublish = () => {
    window.dispatchEvent(new CustomEvent('lingda:publish'));
  };

  const handleEvalClick = (n) => {
    const p = n.payload || {};
    if (!p.room_id || !p.room_type) return;
    api.notifications.markRead(n.id).catch(() => {});
    setPendingEvals((prev) => prev.filter((x) => x.id !== n.id));
    goDetail(p.room_id, p.room_type);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] pb-28 lg:pb-10">
      <div className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 pt-6 md:px-8 md:pt-8 xl:grid-cols-[minmax(0,1fr)_286px]">
        <main className="min-w-0 space-y-6">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                {greeting()}，{loaded ? user.username || '同学' : '同学'}
              </h1>
              <p className="mt-1 text-sm text-slate-600">找搭子 · 拼车、娱乐与课程组队</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => nav.navigateTo({ url: '/partners/explore' })}
                className="hidden h-10 w-[260px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-blue-600 md:flex"
              >
                <Search className="h-4 w-4" />
                <span>浏览全部搭子与组队</span>
              </button>
              <button
                type="button"
                onClick={() => nav.navigateTo({ url: '/pages/chat/chat' })}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
              >
                <Bell className="h-5 w-5" />
                {(unreadCount > 0 || pendingEvals.length > 0) && (
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                    {Math.min(99, unreadCount + pendingEvals.length)}
                  </span>
                )}
              </button>
            </div>
          </header>

          {pendingEvals.length > 0 && (
            <section className="space-y-2">
              {pendingEvals.map((n) => {
                const p = n.payload || {};
                return (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => handleEvalClick(n)}
                    className="flex w-full items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 transition hover:bg-amber-100"
                  >
                    <Star className="h-4 w-4 shrink-0 fill-current" />
                    <span className="flex-1">
                      「{p.room_title || '某队伍'}」已结束，点这里给队友打分
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                );
              })}
            </section>
          )}

          <CampusGalleryHero onPublish={goPublish} />

          <section className="grid gap-4 md:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => goMatch(cat.key)}
                  className="group flex items-center gap-5 rounded-lg border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <span
                    className={cn(
                      'inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg',
                      cat.bg,
                      cat.text,
                    )}
                  >
                    <Icon className="h-8 w-8" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold text-slate-950">{cat.name}</span>
                    <span className="mt-1 block text-sm text-slate-500">{cat.sub}</span>
                    <span className={cn('mt-2 block text-sm font-semibold', cat.text)}>
                      {cat.action}
                      <ChevronRight className="ml-1 inline h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </button>
              );
            })}
          </section>

          <section className="space-y-3">
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-3">
                <h2 className="font-heading text-xl font-bold tracking-tight text-slate-950">
                  今日推荐
                </h2>
                <p className="text-xs text-slate-500">为你筛选的优质组队</p>
              </div>
              <button
                type="button"
                onClick={() => nav.navigateTo({ url: '/partners/explore' })}
                className="text-sm font-semibold text-blue-600 transition hover:text-blue-500"
              >
                查看更多
                <ChevronRight className="ml-1 inline h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((f) => {
                const on = hotFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setHotFilter(f.key)}
                    className={cn(
                      'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition',
                      on
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600',
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              {!loaded &&
                [0, 1, 2, 3].map((i) => (
                  <div key={i} className="border-b border-slate-100 p-4 last:border-b-0">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="mt-3 h-4 w-2/3" />
                  </div>
                ))}

              {loaded && todayRows.length === 0 && (
                <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                  <Users className="h-9 w-9 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">
                    还没有在招队伍，去发起一个吧
                  </p>
                </div>
              )}

              {loaded &&
                todayRows.map((item) => (
                  <RecommendationRow
                    key={item.room_id}
                    item={item}
                    onClick={() => goDetail(item.room_id, item.room_type)}
                  />
                ))}
            </div>
          </section>
        </main>

        <aside className="hidden space-y-5 xl:block">
          <ProfilePanel user={user} counts={counts} loaded={loaded} />
          <SchedulePanel
            rows={scheduleRows}
            loaded={loaded}
            onDetail={goDetail}
            onAll={() => nav.navigateTo({ url: '/teams' })}
          />
        </aside>
      </div>
    </div>
  );
}

function CampusGalleryHero({ onPublish }) {
  const prefersDark = usePrefersDarkMode();
  const slides = useMemo(
    () => (prefersDark ? [EVENING_CAMPUS_IMAGE, ...CAMPUS_IMAGES] : CAMPUS_IMAGES),
    [prefersDark],
  );
  const [active, setActive] = useState(0);
  const image = slides[active] || slides[0];

  useEffect(() => {
    setActive(0);
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative h-[286px] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-sm md:h-[348px] lg:h-[360px]">
      <img
        key={image.src}
        src={image.src}
        alt={image.label}
        className="absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-700"
        style={{ objectPosition: image.position }}
      />
      <div className={cn('absolute inset-0 z-[1] bg-gradient-to-r', image.overlay)} />
      <div className="absolute inset-x-0 bottom-0 z-[1] h-36 bg-gradient-to-t from-slate-950/70 to-transparent" />

      <div className="relative z-10 flex h-full max-w-[570px] flex-col justify-center px-7 py-8 text-white on-media md:px-10">
        <p className="text-sm font-semibold text-white/95">
          真实校园 · 拼车 · 娱乐 · 学习
        </p>
        <h2 className="mt-2 font-heading text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
          从灵搭开始
          <br />
          一起出发
        </h2>
        <p className="mt-4 max-w-[420px] text-sm leading-6 text-white/95">
          在熟悉的校园里，找到同频的出行、活动和学习伙伴。
        </p>
        <button
          type="button"
          onClick={onPublish}
          className="mt-6 inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-950/25 transition hover:bg-blue-500 active:scale-[0.99]"
        >
          发起组队
          <CirclePlus className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-full bg-slate-950/28 px-2.5 py-2 backdrop-blur">
        {slides.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`切换到${slide.label}`}
            onClick={() => setActive(index)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              index === active ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80',
            )}
          />
        ))}
      </div>
    </section>
  );
}

function usePrefersDarkMode() {
  const [prefersDark, setPrefersDark] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setPrefersDark(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return prefersDark;
}

function RecommendationRow({ item, onClick }) {
  const meta = typeMeta(item.room_type);
  const Icon = meta.icon;
  const isStudy = item.room_type === 'group' || item.room_type === 'study';
  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid w-full grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50 md:grid-cols-[1fr_auto_auto]"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            'mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            meta.bg,
            meta.text,
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-950">{item.title}</span>
            <span className={cn('rounded px-1.5 py-0.5 text-xs font-semibold', meta.bg, meta.text)}>
              {meta.name.replace('小组', '')}
            </span>
          </span>
          <span className="mt-1 block text-sm text-slate-500">
            {isStudy ? item.subtitle || '课程组队' : item.subtitle || item.meet_location || '地点待定'}
          </span>
          <span className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded bg-slate-100 px-2 py-1">
              {isStudy ? '课程组队' : item.meet_label || '时间待定'}
            </span>
            <span className="rounded bg-slate-100 px-2 py-1">
              {item.current_num}/{item.total_num} 人
            </span>
          </span>
        </span>
      </div>

      <div className="hidden items-center -space-x-2 md:flex">
        {(item.seats || []).slice(0, 3).map((s, i) => {
          const bg = s.avatar_color || '#64748B';
          return (
          <span
            key={`${item.room_id}-${i}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold"
            style={{ background: bg, color: inkOn(bg) }}
          >
            {s.avatar_text || '+'}
          </span>
          );
        })}
      </div>

      <span className="self-center rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
        查看
      </span>
    </button>
  );
}

function ProfilePanel({ user, counts, loaded }) {
  const total = (counts.carpool || 0) + (counts.entertainment || 0) + (counts.study || 0);
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14 ring-2 ring-slate-100">
          <AvatarFallback
            style={{ background: user.avatar_color || '#2563EB' }}
            className="font-bold text-white"
          >
            {user.avatar_text || '灵'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-bold text-slate-950">
            {loaded ? user.username || '同学' : '同学'}
          </div>
          <div className="truncate text-sm text-slate-600">{user.college || '校园用户'}</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 text-center">
        <Stat value={total} label="在招" />
        <Stat value={counts.carpool || 0} label="拼车" />
        <Stat value={counts.study || 0} label="学习" />
      </div>
    </section>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <div className="font-heading text-xl font-bold tabular-nums text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function SchedulePanel({ rows, loaded, onDetail, onAll }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-slate-950">我的日程</h3>
        <button
          type="button"
          onClick={onAll}
          className="text-xs font-semibold text-blue-600 transition hover:text-blue-500"
        >
          查看全部
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {!loaded &&
          [0, 1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          ))}
        {loaded && rows.length === 0 && (
          <p className="py-4 text-sm text-slate-500">今天暂无日程</p>
        )}
        {loaded &&
          rows.map((row) => {
            const meta = typeMeta(row.room_type);
            return (
              <button
                key={`${row.room_type}-${row.room_id}`}
                type="button"
                onClick={() => onDetail(row.room_id, row.room_type)}
                className="flex w-full gap-3 text-left"
              >
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: meta.color }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {row.title}
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <CalendarDays className="h-3 w-3" />
                    {row.meet_label || '时间待定'}
                  </span>
                </span>
              </button>
            );
          })}
      </div>
    </section>
  );
}
