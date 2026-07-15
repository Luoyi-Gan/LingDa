import { useEffect, useState, useCallback } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Car,
  Clock3,
  Film,
  MapPin,
  Users,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { getStudyMeta, getStudySubtitle } from '../../lib/study';
import { useWxNav } from '../../lib/nav';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Skeleton } from '../../components/ui/skeleton';
import HoverableUserAvatar from '../../components/HoverableUserAvatar';
import {
  AppPage,
  EmptyPanel,
  PageHeader,
  SectionHeader,
  SectionSurface,
  SegmentedTabs,
  TypeBadge,
} from '../../components/layout/AppScaffold';
import { cn } from '../../lib/cn';

const TABS = [
  { key: 'carpool', label: '拼车', icon: Car },
  { key: 'entertainment', label: '娱乐', icon: Film },
  { key: 'study', label: '学习', icon: BookOpen },
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

  const list =
    tab === 'carpool' ? carpools : tab === 'entertainment' ? ents : studies;
  const isLoaded = loaded[tab];

  return (
    <AppPage aside={<PostsAside carpools={carpools} ents={ents} studies={studies} />}>
      <PageHeader
        eyebrow="Explore"
        title="发现组队"
        subtitle="浏览正在招募的拼车、娱乐和课程组队。"
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SegmentedTabs items={TABS} value={tab} onChange={setTab} />
        {tab === 'entertainment' && (
          <div className="flex gap-2 overflow-x-auto">
            {ENT_CATEGORIES.map((c) => {
              const on = entCat === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => filterEntCat(c)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                    on
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900',
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <section className="space-y-3">
        <SectionHeader
          title={TABS.find((x) => x.key === tab)?.label}
          subtitle={
            tab === 'carpool'
              ? '按出发时间排序，先看路线和余位。'
              : tab === 'entertainment'
                ? '按活动时间排序，快速找到今晚和周末安排。'
                : '按课程编号、人数和组员要求筛选，适合课程项目组队。'
          }
        />
        <SectionSurface>
          {!isLoaded &&
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="border-b border-slate-100 p-4 last:border-b-0">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="mt-3 h-4 w-2/3" />
              </div>
            ))}
          {isLoaded && list.length === 0 && (
            <EmptyPanel text={`还没有${TABS.find((x) => x.key === tab)?.label}在招`} />
          )}
          {isLoaded &&
            list.map((item) => (
              <PostRow
                key={item.room_id}
                item={item}
                type={tab}
                onClick={() => goDetail(item.room_id, tab)}
              />
            ))}
        </SectionSurface>
      </section>
    </AppPage>
  );
}

function PostRow({ item, type, onClick }) {
  const creator = item.creator || {};
  const tone = type === 'carpool' ? 'blue' : type === 'entertainment' ? 'orange' : 'green';
  const iconTone =
    type === 'carpool'
      ? 'bg-blue-50 text-blue-700'
      : type === 'entertainment'
        ? 'bg-orange-50 text-orange-700'
        : 'bg-emerald-50 text-emerald-700';
  const Icon = type === 'carpool' ? Car : type === 'entertainment' ? Film : BookOpen;
  const studyMeta = type === 'study' ? getStudyMeta(item) : {};
  const title =
    type === 'carpool'
      ? `${item.start_location || '出发地'} → ${item.end_location || '目的地'}`
      : type === 'study'
        ? item.title || [studyMeta.courseCode, studyMeta.courseName || item.course_name].filter(Boolean).join(' · ')
      : item.title;
  const subtitle =
    type === 'study'
      ? getStudySubtitle(item)
      : type === 'entertainment'
        ? item.ent_type || item.meet_location || '娱乐活动'
        : item.title;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid w-full grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50 md:grid-cols-[1fr_auto_auto]"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className={cn('mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconTone)}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-950">{title}</span>
            <TypeBadge tone={tone}>
              {type === 'carpool' ? '拼车' : type === 'entertainment' ? item.ent_type || '娱乐' : '课程组队'}
            </TypeBadge>
          </span>
          <span className="mt-1 block text-sm text-slate-500">{subtitle}</span>
          <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {type !== 'study' && (item.meet_time_label || item.meet_time_short || item.meet_time) && (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {item.meet_time_label || item.meet_time_short || item.meet_time}
              </span>
            )}
            {type !== 'study' && item.meet_location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {item.meet_location}
              </span>
            )}
            {type === 'study' && (studyMeta.gpaRequirement || item.require_skill) && (
              <span className="inline-flex items-center gap-1">
                <Award className="h-3.5 w-3.5" />
                {studyMeta.gpaRequirement || item.require_skill}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {item.current_num}/{item.total_num} 人
            </span>
          </span>
        </span>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        {creator.username && (
          <>
            <HoverableUserAvatar
              userId={creator.user_id}
              fallbackName={creator.username}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  style={{ background: creator.avatar_color || '#2563EB' }}
                  className="text-[10px] font-bold text-white"
                >
                  {creator.avatar_text || creator.username?.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            </HoverableUserAvatar>
            <span className="max-w-[90px] truncate text-sm text-slate-500">{creator.username}</span>
          </>
        )}
      </div>

      <span className="inline-flex h-9 items-center justify-center gap-2 self-center rounded-lg border border-blue-200 px-4 text-sm font-semibold text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
        查看
        <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

function PostsAside({ carpools, ents, studies }) {
  const items = [
    { label: '拼车', value: carpools.length, tone: 'text-blue-700', icon: Car },
    { label: '娱乐', value: ents.length, tone: 'text-orange-700', icon: Film },
    { label: '学习', value: studies.length, tone: 'text-emerald-700', icon: BookOpen },
  ];
  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-heading text-base font-bold text-slate-950">今日广场</h3>
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Icon className={cn('h-4 w-4', item.tone)} />
                  {item.label}
                </span>
                <span className="font-heading text-xl font-bold tabular-nums text-slate-950">
                  {item.value}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="rounded-lg border border-blue-100 bg-blue-50 p-5 text-blue-900 shadow-sm">
        <CalendarDays className="h-5 w-5" />
        <h3 className="mt-3 font-heading text-base font-bold">发布小提示</h3>
        <p className="mt-1 text-sm leading-6 text-blue-800/80">
          标题写清时间和地点，加入率会更高。
        </p>
      </section>
    </>
  );
}
