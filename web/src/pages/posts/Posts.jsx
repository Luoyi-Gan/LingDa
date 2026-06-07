// UI 重做 Phase 10：Posts 广场 Bento 重写
// 三个 tab：拼车 / 娱乐 / 学习，主色统一 t-sky / t-violet / t-teal
// · Hero 卡按当前 tab 切换主色 + 简笔
// · Tab pills（pill 按 tab 主色高亮）
// · 拼车 → 列表式时刻表（时间 / 路线 / 座位）
// · 娱乐 → 自适应卡片网格 + lucide 图标 + 类型过滤
// · 学习 → 课表列表（左色块 + 课程 + 标题 + 地点时间）
import { useEffect, useState, useCallback } from 'react';
import {
  Car,
  Sparkles,
  BookOpen,
  ArrowRight,
  Users,
  MapPin,
  Clock3,
  Inbox,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useWxNav } from '../../lib/nav';
import { entTypeIcon } from '../../lib/iconMap';
import { Card } from '../../components/ui/card';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/cn';

const TABS = [
  { key: 'carpool', label: '拼车', icon: Car, tint: 't-sky' },
  { key: 'entertainment', label: '娱乐', icon: Sparkles, tint: 't-violet' },
  { key: 'study', label: '学习', icon: BookOpen, tint: 't-teal' },
];

const ENT_CATEGORIES = ['全部', '演唱会', '剧本杀', 'KTV', '观影', '展览', '密室'];

const DETAIL_PATH = {
  carpool: '/pages/detail-carpool/detail-carpool',
  entertainment: '/pages/detail-entertainment/detail-entertainment',
  study: '/pages/detail-study/detail-study',
};

export default function Posts() {
  const nav = useWxNav();
  const [tab, setTab] = useState('carpool');
  const [carpools, setCarpools] = useState([]);
  const [ents, setEnts] = useState([]);
  const [studies, setStudies] = useState([]);
  const [entCat, setEntCat] = useState('全部');
  const [loaded, setLoaded] = useState({ carpool: false, entertainment: false, study: false });

  const theme = TABS.find((t) => t.key === tab);

  const refreshAll = useCallback(() => {
    Promise.all([
      api.rooms.listCarpool({ sort: 'time' }),
      api.rooms.listEntertainment({ sort: 'time', cat: entCat }),
      api.rooms.listGroup({ sort: 'time' }),
    ])
      .then(([carpoolRes, entRes, groupRes]) => {
        setCarpools(carpoolRes.list || []);
        setEnts(entRes.list || []);
        setStudies(groupRes.list || []);
        setLoaded({ carpool: true, entertainment: true, study: true });
      })
      .catch(() => setLoaded({ carpool: true, entertainment: true, study: true }));
    // entCat 用于初次拉取，后续靠 filterEntCat 重拉
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authLib.requireLogin()) return;
    refreshAll();
  }, [refreshAll]);

  const filterEntCat = (c) => {
    setEntCat(c);
    setLoaded((s) => ({ ...s, entertainment: false }));
    api.rooms
      .listEntertainment({ sort: 'time', cat: c })
      .then((res) => setEnts(res.list || []))
      .finally(() => setLoaded((s) => ({ ...s, entertainment: true })));
  };

  const goDetail = (id, t) => {
    nav.navigateTo({ url: `${DETAIL_PATH[t || tab]}?id=${id}` });
  };

  return (
    <div className="relative min-h-screen pb-32 lg:pb-12">
      <div className="relative mx-auto w-full max-w-[1180px] px-4 pt-6 md:px-8 md:pt-10 space-y-4 md:space-y-5">
        {/* Hero —— 按 tab 切换主色 */}
        <Card
          bento
          className={cn(
            'border-transparent p-6 md:p-7 relative overflow-hidden',
            theme.tint,
          )}
        >
          <theme.icon
            aria-hidden
            className="absolute -right-8 -bottom-8 h-44 w-44 opacity-15"
            strokeWidth={1.25}
          />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
              Posts · 广场
            </p>
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight mt-0.5">
              发现 · {theme.label}
            </h1>
            <p className="text-sm opacity-75 mt-1">
              {tab === 'carpool'
                ? '看看附近谁要去哪'
                : tab === 'entertainment'
                  ? '今晚有没有想凑一桌的活动'
                  : '同学们都在学什么 · 加入一起学'}
            </p>
            {/* Tab pills */}
            <div className="mt-5 inline-flex rounded-full bg-white/55 dark:bg-white/10 p-1">
              {TABS.map((t) => {
                const on = tab === t.key;
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all',
                      on
                        ? 'bg-foreground text-background'
                        : 'opacity-70 hover:opacity-100',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* === 拼车 → 时刻表 === */}
        {tab === 'carpool' && (
          <Card bento className="p-3 md:p-4">
            {/* 表头（桌面显示） */}
            <div className="hidden md:grid grid-cols-[160px_1fr_auto] gap-4 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              <span>出发时间</span>
              <span>路线</span>
              <span>座位</span>
            </div>
            {!loaded.carpool && (
              <div className="space-y-2 mt-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            )}
            {loaded.carpool && carpools.length === 0 && (
              <EmptyState text="还没有拼车在招，去发起一个吧" />
            )}
            <div className="space-y-1.5 mt-2">
              {loaded.carpool &&
                carpools.map((item) => (
                  <button
                    key={item.room_id}
                    onClick={() => goDetail(item.room_id)}
                    className="w-full grid grid-cols-[auto_1fr] md:grid-cols-[160px_1fr_auto] gap-3 md:gap-4 items-center text-left rounded-xl px-3 py-3 hover:bg-muted/60 transition-colors group"
                  >
                    <div className="flex md:flex-col md:items-start items-center gap-2 md:gap-0.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground hidden md:inline">
                        出发
                      </span>
                      <span className="font-heading text-sm md:text-base font-bold tabular-nums text-foreground">
                        {item.meet_time_label || item.meet_time_short || '时间待定'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {item.start_location}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-semibold text-foreground truncate">
                        {item.end_location}
                      </span>
                    </div>
                    {/* 座位点阵 */}
                    <div className="md:col-auto col-span-2 flex items-center gap-1 md:justify-end">
                      <Users className="h-3.5 w-3.5 text-muted-foreground md:hidden" />
                      <div className="flex -space-x-2">
                        {(item.seats || []).map((s, idx) =>
                          s.empty ? (
                            <span
                              key={idx}
                              className="h-7 w-7 rounded-full border-2 border-dashed border-border bg-muted/40 inline-flex items-center justify-center text-[10px] text-muted-foreground"
                            >
                              +
                            </span>
                          ) : (
                            <span
                              key={idx}
                              className="h-7 w-7 rounded-full text-white text-[10px] font-bold inline-flex items-center justify-center ring-2 ring-card"
                              style={{ background: s.avatar_color }}
                            >
                              {s.avatar_text}
                            </span>
                          ),
                        )}
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground ml-2 tabular-nums">
                        {item.current_num}/{item.total_num}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </Card>
        )}

        {/* === 娱乐 → 网格 === */}
        {tab === 'entertainment' && (
          <>
            {/* 类型过滤 chips */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
              {ENT_CATEGORIES.map((c) => {
                const on = entCat === c;
                return (
                  <button
                    key={c}
                    onClick={() => filterEntCat(c)}
                    className={cn(
                      'shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                      on
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70',
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {!loaded.entertainment &&
                [0, 1, 2, 3].map((i) => (
                  <Card bento key={i} className="p-0 overflow-hidden">
                    <Skeleton className="aspect-square w-full rounded-none" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </Card>
                ))}
              {loaded.entertainment && ents.length === 0 && (
                <div className="col-span-2 md:col-span-3 lg:col-span-4">
                  <EmptyState text="还没有娱乐活动在招" />
                </div>
              )}
              {loaded.entertainment &&
                ents.map((item) => {
                  const Icon = entTypeIcon(item.ent_type);
                  const creator = item.creator || {};
                  return (
                    <Card
                      bento
                      interactive
                      key={item.room_id}
                      onClick={() => goDetail(item.room_id)}
                      className="p-0 overflow-hidden flex flex-col"
                    >
                      {/* Cover */}
                      <div
                        className="aspect-[4/3] relative flex items-center justify-center text-white"
                        style={{
                          background: `linear-gradient(135deg, ${item.cover_color}, ${item.cover_color}dd)`,
                        }}
                      >
                        <Icon
                          aria-hidden
                          className="absolute -right-3 -bottom-3 h-24 w-24 opacity-30"
                          strokeWidth={1.25}
                        />
                        <Icon className="h-10 w-10 relative" strokeWidth={2} />
                      </div>
                      {/* Body */}
                      <div className="flex-1 flex flex-col gap-1.5 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {item.ent_type}
                        </span>
                        <h3 className="font-heading text-sm font-semibold leading-tight line-clamp-2 text-foreground">
                          {item.title}
                        </h3>
                        <div className="mt-auto pt-2 flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback
                              style={{ background: creator.avatar_color }}
                              className="text-white text-[9px] font-bold"
                            >
                              {creator.avatar_text}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] font-medium text-muted-foreground truncate flex-1">
                            {creator.username}
                          </span>
                          <span className="text-[10px] font-bold tabular-nums text-muted-foreground shrink-0">
                            {item.current_num}/{item.total_num}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          </>
        )}

        {/* === 学习 → 课表列表 === */}
        {tab === 'study' && (
          <div className="space-y-3">
            {!loaded.study &&
              [0, 1, 2].map((i) => (
                <Card bento key={i} className="p-4">
                  <Skeleton className="h-5 w-1/3 mb-2" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/2 mt-2" />
                </Card>
              ))}
            {loaded.study && studies.length === 0 && (
              <EmptyState text="还没有学习小组在招" />
            )}
            {loaded.study &&
              studies.map((item) => (
                <Card
                  bento
                  interactive
                  key={item.room_id}
                  onClick={() => goDetail(item.room_id)}
                  className="p-0 overflow-hidden flex"
                >
                  {/* 左色块 + 课程缩写 + 满员进度 */}
                  <div
                    className="w-20 md:w-24 shrink-0 relative flex flex-col items-center justify-center text-white"
                    style={{
                      background: `linear-gradient(160deg, ${item.color}, ${item.color}cc)`,
                    }}
                  >
                    <BookOpen
                      aria-hidden
                      className="absolute -bottom-2 -right-2 h-12 w-12 opacity-25"
                      strokeWidth={1.25}
                    />
                    <span className="relative font-heading text-xl font-extrabold">
                      {item.badge}
                    </span>
                    <span className="relative text-[10px] font-bold tabular-nums mt-1 opacity-95">
                      {item.current_num}/{item.total_num}
                    </span>
                  </div>
                  {/* 右内容 */}
                  <div className="flex-1 min-w-0 p-4 flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {item.course_name}
                    </span>
                    <h3 className="font-heading text-base font-semibold leading-tight line-clamp-1 text-foreground">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      {item.meet_location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.meet_location}
                        </span>
                      )}
                      {(item.meet_time_label || item.meet_time) && (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {item.meet_time_label || item.meet_time}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <Card bento className="p-10 text-center">
      <Inbox className="h-9 w-9 text-muted-foreground/40 mx-auto mb-3" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground">{text}</p>
    </Card>
  );
}
