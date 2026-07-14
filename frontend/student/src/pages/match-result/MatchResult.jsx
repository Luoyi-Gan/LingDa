// UI 重做 Phase 4：MatchResult 匹配结果页 Bento 重写
// · Hero 主色按 type 切换 (carpool=t-sky / entertainment=t-violet / study=t-teal)
// · 段切器 (推荐匹配 / 我的申请) 用 pill tabs
// · 匹配卡：score 进度环 + 理由 chips + 主操作"申请加入"
// · 申请卡：状态色徽
// · FilterModal / "调整筛选" 入口都接通
import { useEffect, useState, useRef } from 'react';
import {
  Car,
  Sparkles,
  BookOpen,
  SlidersHorizontal,
  Plus,
  ArrowUpRight,
  Inbox,
  Clock3,
  MapPin,
  Users,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { fromNow } from '../../lib/time';
import { getStudySubtitle } from '../../lib/study';
import { useUI } from '../../context/UIContext';
import { useWxNav, useQueryOptions } from '../../lib/nav';
import NavBar from '../../components/NavBar';
import MatchFilterModal from '../../components/MatchFilterModal';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/cn';

const STATUS_STYLE = {
  pending: { label: '待审核', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
  approved: { label: '已加入', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  passed: { label: '已加入', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
  rejected: { label: '已婉拒', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' },
  left: { label: '已退出', cls: 'bg-muted text-muted-foreground' },
};

const THEME = {
  carpool: {
    tint: 't-sky',
    icon: Car,
    label: '拼车',
    description: '帮你找到一起出行的同学',
  },
  entertainment: {
    tint: 't-violet',
    icon: Sparkles,
    label: '娱乐',
    description: '找搭子一起玩，比一个人有意思',
  },
  study: {
    tint: 't-teal',
    icon: BookOpen,
    label: '学习',
    description: '按课程编号寻找项目和作业队友',
  },
  group: {
    tint: 't-teal',
    icon: BookOpen,
    label: '学习',
    description: '按课程编号寻找项目和作业队友',
  },
};

const ROOM_TYPE_TAG = {
  carpool: '拼车',
  entertainment: '娱乐',
  study: '学习',
  group: '学习',
};

const DETAIL_PATH = {
  carpool: '/pages/detail-carpool/detail-carpool',
  entertainment: '/pages/detail-entertainment/detail-entertainment',
  study: '/pages/detail-study/detail-study',
  group: '/pages/detail-study/detail-study',
};

const FORM_PATH = {
  carpool: '/pages/form-carpool/form-carpool',
  entertainment: '/pages/form-entertainment/form-entertainment',
  study: '/pages/form-study/form-study',
  group: '/pages/form-study/form-study',
};

export default function MatchResult() {
  const options = useQueryOptions();
  const { showToast, showModal } = useUI();
  const nav = useWxNav();

  const type = options.type || 'carpool';
  const theme = THEME[type] || THEME.carpool;
  const TypeIcon = theme.icon;

  const [seg, setSeg] = useState('matches');
  const [matches, setMatches] = useState([]);
  const [applications, setApplications] = useState([]);
  const [filterOpen, setFilterOpen] = useState(true);
  const [lastFilters, setLastFilters] = useState(null);
  const [hasQueried, setHasQueried] = useState(false);
  const [mineLoaded, setMineLoaded] = useState(false);
  const matchesRef = useRef([]);
  matchesRef.current = matches;

  const loadAll = () => {
    let p;
    if (type === 'carpool') p = api.rooms.listCarpool({ sort: 'hot' });
    else if (type === 'entertainment') p = api.rooms.listEntertainment({ sort: 'hot' });
    else p = api.rooms.listGroup({ sort: 'hot' });
    p.then((res) => {
      const list = (res.list || []).slice(0, 12).map((r, i) => ({
        ...r,
        score: 92 - i * 4,
      }));
      setMatches(list);
      setHasQueried(true);
    }).catch(() => {});
  };

  const loadFiltered = (filters) => {
    let p;
    if (type === 'carpool') p = api.rooms.matchCarpool(filters);
    else if (type === 'entertainment') p = api.rooms.matchEntertainment(filters);
    else p = api.rooms.matchGroup(filters);
    p.then((res) => {
      setMatches(res.list || []);
      setHasQueried(true);
    }).catch(() => {});
  };

  const loadMine = () => {
    api.users
      .myApplications({ page: 1, pageSize: 20 })
      .then((res) => {
        const list = (res.list || []).map((a) => ({
          ...a,
          app_id: a.member_id,
          applied_at: a.join_time,
          applied_label: fromNow(a.join_time),
        }));
        setApplications(list);
      })
      .catch(() => {})
      .finally(() => setMineLoaded(true));
  };

  useEffect(() => {
    if (authLib.requireLogin()) return;
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFilterSubmit = (payload) => {
    setLastFilters(payload);
    setFilterOpen(false);
    loadFiltered(payload);
  };

  const onShowAll = () => {
    setLastFilters(null);
    setFilterOpen(false);
    loadAll();
  };

  const goDetail = (id, t) => {
    const tt = t || type;
    nav.navigateTo({ url: `${DETAIL_PATH[tt] || DETAIL_PATH.group}?id=${id}` });
  };

  const join = (id) => {
    showModal({ title: '申请加入', content: '确认申请该房间?' }).then((res) => {
      if (res.confirm) {
        api.members.apply(id, {}).then(() => {
          showToast({ title: '申请已提交', icon: 'success' });
          setMatches(matchesRef.current.filter((m) => m.room_id !== id));
          setSeg('mine');
          loadMine();
        });
      }
    });
  };

  const createNew = () => {
    nav.redirectTo({ url: FORM_PATH[type] || FORM_PATH.carpool });
  };

  const cancelApp = () => showToast({ title: 'pending 申请暂不支持撤回', icon: 'none' });

  return (
    <div className="relative min-h-screen pb-32 md:pb-12">
      <NavBar title="匹配结果" />
      <div className="relative mx-auto w-full max-w-[1180px] px-4 pt-4 md:px-8 md:pt-6">
        <div className="bento-grid">
          {/* === Hero —— type 主色 + 角落简笔 === */}
          <Card
            bento
            className={cn(
              'col-span-2 md:col-span-4 xl:col-span-6 border-transparent p-6 md:p-7 relative overflow-hidden',
              theme.tint,
            )}
          >
            <TypeIcon
              aria-hidden
              className="absolute -right-8 -bottom-8 h-48 w-48 opacity-15"
              strokeWidth={1.25}
            />
            <div className="relative flex items-start gap-4 md:gap-6">
              <div className="inline-flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-white/55 dark:bg-white/10 shrink-0">
                <TypeIcon className="h-7 w-7 md:h-8 md:w-8" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
                  Match
                </p>
                <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight mt-0.5">
                  {theme.label} · {seg === 'matches' ? `${matches.length} 个候选` : '我的申请'}
                </h1>
                <p className="text-sm opacity-75 mt-1">{theme.description}</p>
              </div>
            </div>

            {/* Segment pills 嵌进 Hero */}
            <div className="relative mt-5 inline-flex rounded-full bg-white/55 dark:bg-white/10 p-1">
              <SegPill
                active={seg === 'matches'}
                count={matches.length}
                onClick={() => setSeg('matches')}
              >
                推荐匹配
              </SegPill>
              <SegPill
                active={seg === 'mine'}
                count={applications.length}
                onClick={() => setSeg('mine')}
              >
                我的申请
              </SegPill>
            </div>
          </Card>

          {/* === matches segment === */}
          {seg === 'matches' && (
            <>
              {/* 筛选状态条（满宽） */}
              {hasQueried && (
                <Card
                  bento
                  className="col-span-2 md:col-span-4 xl:col-span-6 p-3 md:p-4 flex items-center gap-3"
                >
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {lastFilters ? '已按筛选匹配' : '显示全部热门'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => setFilterOpen(true)}
                  >
                    调整筛选
                  </Button>
                  <Button size="sm" variant="cta" onClick={createNew}>
                    <Plus className="h-3.5 w-3.5" />
                    创建新队伍
                  </Button>
                </Card>
              )}

              {!hasQueried && (
                <Card
                  bento
                  className="col-span-2 md:col-span-4 xl:col-span-6 p-10 text-center"
                >
                  <SlidersHorizontal className="h-9 w-9 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    请先在弹出的筛选框里确定条件
                  </p>
                  <Button
                    className="mt-4"
                    variant="default"
                    onClick={() => setFilterOpen(true)}
                  >
                    打开筛选
                  </Button>
                </Card>
              )}

              {hasQueried && matches.length === 0 && (
                <Card
                  bento
                  className="col-span-2 md:col-span-4 xl:col-span-6 p-10 text-center"
                >
                  <Inbox className="h-9 w-9 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground">
                    没有匹配到现成队伍
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    放宽筛选试试，或直接创建一个
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button variant="ghost" onClick={() => setFilterOpen(true)}>
                      调整筛选
                    </Button>
                    <Button variant="cta" onClick={createNew}>
                      <Plus className="h-3.5 w-3.5" />
                      创建新队伍
                    </Button>
                  </div>
                </Card>
              )}

              {matches.map((item) => (
                <MatchCard
                  key={item.room_id}
                  item={item}
                  type={type}
                  onJoin={() => join(item.room_id)}
                  onDetail={() => goDetail(item.room_id)}
                />
              ))}
            </>
          )}

          {/* === mine segment === */}
          {seg === 'mine' && (
            <>
              {!mineLoaded &&
                [0, 1, 2].map((i) => (
                  <Card
                    bento
                    key={`s${i}`}
                    className="col-span-2 md:col-span-2 xl:col-span-3 p-5 space-y-3"
                  >
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </Card>
                ))}
              {mineLoaded && applications.length === 0 && (
                <Card bento className="col-span-2 md:col-span-4 xl:col-span-6 p-10 text-center">
                  <Inbox className="h-9 w-9 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground">
                    还没有申请记录
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    先去推荐匹配里挑一个吧
                  </p>
                  <Button
                    className="mt-4"
                    variant="default"
                    onClick={() => setSeg('matches')}
                  >
                    去看推荐
                  </Button>
                </Card>
              )}
              {mineLoaded &&
                applications.map((item) => {
                  const st = STATUS_STYLE[item.status] || STATUS_STYLE.pending;
                  return (
                    <Card
                      bento
                      interactive
                      key={item.app_id}
                      onClick={() => goDetail(item.room_id, item.room_type)}
                      className="col-span-2 md:col-span-2 xl:col-span-3 p-5 flex flex-col gap-3 relative"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{
                            background: `${item.accent}14`,
                            color: item.accent,
                          }}
                        >
                          {ROOM_TYPE_TAG[item.room_type] || item.room_type}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold',
                            st.cls,
                          )}
                        >
                          {st.label}
                        </span>
                        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                          {item.applied_label}
                        </span>
                      </div>
                      <h3 className="font-heading text-base font-semibold leading-tight text-foreground line-clamp-1">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback
                            style={{ background: item.creator_color }}
                            className="text-white text-[10px] font-bold"
                          >
                            {item.creator_text}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{item.creator_name}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            goDetail(item.room_id, item.room_type);
                          }}
                          className="flex-1"
                        >
                          查看
                        </Button>
                        {item.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelApp();
                            }}
                            className="flex-1"
                          >
                            撤回
                          </Button>
                        )}
                        {(item.status === 'passed' || item.status === 'approved') && (
                          <Button
                            size="sm"
                            variant="cta"
                            onClick={(e) => {
                              e.stopPropagation();
                              goDetail(item.room_id, item.room_type);
                            }}
                            className="flex-1"
                          >
                            进入聊天
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
            </>
          )}
        </div>
      </div>

      <MatchFilterModal
        open={filterOpen}
        type={type}
        initial={lastFilters}
        onSubmit={onFilterSubmit}
        onShowAll={onShowAll}
        onClose={() => {
          if (!hasQueried) onShowAll();
          else setFilterOpen(false);
        }}
      />
    </div>
  );
}

function SegPill({ active, count, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
        active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
      {count > 0 && (
        <span
          className={cn(
            'inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums',
            active ? 'bg-background/25 text-background' : 'bg-muted-foreground/15',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function MatchCard({ item, type, onJoin, onDetail }) {
  // 进度
  const pct = item.total_num
    ? Math.min(100, Math.round((item.current_num / item.total_num) * 100))
    : 0;
  const accent = item.accent || (type === 'carpool' ? '#0284C7' : type === 'entertainment' ? '#7C3AED' : '#0D9488');
  const isStudy = type === 'group' || type === 'study';

  return (
    <Card
      bento
      className="col-span-2 md:col-span-2 xl:col-span-3 p-5 md:p-6 flex flex-col gap-3 relative overflow-hidden group"
    >
      {/* 顶部 score + 标题 */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-base md:text-lg font-bold leading-tight text-foreground line-clamp-2 flex-1">
          {item.title}
        </h3>
        <ScoreBadge score={item.score} accent={accent} />
      </div>

      {/* 核心信息 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {isStudy ? (
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {getStudySubtitle(item)}
          </span>
        ) : item.meet_time_label || item.meet_time ? (
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            {item.meet_time_label || item.meet_time}
          </span>
        ) : null}
        {!isStudy && item.meet_location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {item.meet_location}
          </span>
        )}
      </div>

      {/* 推荐理由 chips */}
      {Array.isArray(item.matched_reasons) && item.matched_reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.matched_reasons.slice(0, 4).map((rs) => (
            <span
              key={rs}
              className="inline-flex items-center rounded-full bg-amber-100/70 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 px-2 py-0.5 text-[10px] font-semibold"
            >
              {rs}
            </span>
          ))}
          {item.matched_reasons.length > 4 && (
            <span className="text-[10px] text-muted-foreground self-center">
              +{item.matched_reasons.length - 4}
            </span>
          )}
        </div>
      )}

      {/* 进度 + 人数 */}
      <div className="mt-auto pt-2">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">
            <span className="font-bold tabular-nums text-foreground">
              {item.current_num}
            </span>
            /<span className="tabular-nums">{item.total_num}</span> 已加入
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ background: accent, width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 操作 */}
      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="ghost" onClick={onDetail} className="flex-1">
          详情
        </Button>
        <Button
          size="sm"
          variant="cta"
          onClick={onJoin}
          className="flex-[1.4]"
        >
          申请加入
        </Button>
      </div>
    </Card>
  );
}

// 圆形进度 badge
function ScoreBadge({ score, accent }) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (s / 100) * c;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="absolute inset-0" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="3"
        />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-heading text-xs font-bold tabular-nums" style={{ color: accent }}>
          {s}
        </span>
      </div>
    </div>
  );
}
