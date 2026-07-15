import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Bus,
  CreditCard,
  Cross,
  Dumbbell,
  GraduationCap,
  Library,
  Map,
  Megaphone,
  Layers3,
  Pin,
  Plus,
  Utensils,
  X,
} from 'lucide-react';
import { api, mediaUrl } from '../../lib/api';
import authLib from '../../lib/auth';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import ImageUploader from '../../components/ImageUploader';
import {
  AppPage,
  EmptyPanel,
  PageHeader,
  SectionHeader,
  SectionSurface,
  TypeBadge,
} from '../../components/layout/AppScaffold';
import { cn } from '../../lib/cn';

const CATEGORY = {
  platform: '平台公告',
  academic: '教务通知',
  service: '校园服务',
  club: '社团公告',
};

const CATEGORY_TONE = {
  platform: 'blue',
  academic: 'orange',
  service: 'green',
  club: 'violet',
};

const FILTERS = [
  ['all', '全部'],
  ['platform', '平台'],
  ['academic', '教务'],
  ['service', '服务'],
  ['club', '社团'],
];

const CAMPUS_MOMENTS = [
  { src: '/images/campus/resource-center-sun.jpg', alt: '阳光下的校园资源中心' },
  { src: '/images/campus/sky-courtyard.jpg', alt: '晴空下的校园中庭' },
  { src: '/images/campus/study-window.jpg', alt: '校园学习空间' },
  { src: '/images/campus/resource-center-soft.jpg', alt: '校园资源中心' },
];

const SERVICES = [
  { label: '图书馆', icon: Library, tone: 'bg-sky-50 text-sky-700' },
  { label: '校车', icon: Bus, tone: 'bg-amber-50 text-amber-700' },
  { label: '食堂', icon: Utensils, tone: 'bg-emerald-50 text-emerald-700' },
  { label: '校医院', icon: Cross, tone: 'bg-rose-50 text-rose-700' },
  { label: '场馆预约', icon: Dumbbell, tone: 'bg-violet-50 text-violet-700' },
  { label: '教务', icon: GraduationCap, tone: 'bg-blue-50 text-blue-700' },
  { label: '一卡通', icon: CreditCard, tone: 'bg-pink-50 text-pink-700' },
  { label: '校园地图', icon: Map, tone: 'bg-lime-50 text-lime-700' },
];

export default function Announcements() {
  const { currentUser } = useAuth() || {};
  const { showToast } = useUI();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [category, setCategory] = useState('all');
  const load = useCallback(
    () => api.community.announcements().then((res) => setItems(res.list || [])).finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    if (authLib.requireLogin()) return;
    load();
  }, [load]);

  const role = currentUser?.account_role;
  const canPublish = role === 'official' ||
    (role === 'club' && currentUser?.verification_status === 'verified');
  const filteredItems = useMemo(
    () => category === 'all' ? items : items.filter((item) => item.category === category),
    [category, items],
  );

  return (
    <>
      <AppPage className="announcement-page">
        <PageHeader
          eyebrow="Campus"
          title="校园公告"
          subtitle="学期节点、重要通知与校园服务"
          action={canPublish && (
            <button type="button" onClick={() => setEditorOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500">
              <Plus className="h-4 w-4" />
              发布公告
            </button>
          )}
        />

        <CampusMoment items={items} />

        <AnnouncementOverview items={items} />

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6">
          <section className="min-w-0 space-y-2.5 md:space-y-3">
            <SectionHeader title="最新通知" subtitle={items.length ? `${items.length} 条已发布公告` : '暂无新通知'} />
            <AnnouncementFilters items={items} value={category} onChange={setCategory} />
            <SectionSurface>
              {loading && <div className="p-10 text-center text-sm text-slate-400">正在加载...</div>}
              {!loading && filteredItems.length === 0 && (
                <EmptyPanel icon={Megaphone} text="当前分类暂无公告。" />
              )}
              {filteredItems.map((item) => <AnnouncementRow key={item.announcement_id} item={item} onOpen={() => setActiveItem(item)} />)}
            </SectionSurface>
          </section>

          <CampusServices onSelect={(label) => showToast({ title: `${label}服务接入中`, icon: 'none' })} />
        </div>
      </AppPage>
      {editorOpen && (
        <AnnouncementEditor
          role={role}
          onClose={() => setEditorOpen(false)}
          onCreated={() => {
            setEditorOpen(false);
            load();
          }}
        />
      )}
      {activeItem && <AnnouncementDetail item={activeItem} onClose={() => setActiveItem(null)} />}
    </>
  );
}

function CampusMoment({ items }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % CAMPUS_MOMENTS.length),
      7000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const current = CAMPUS_MOMENTS[active];
  const move = (delta) => setActive((index) => (index + delta + CAMPUS_MOMENTS.length) % CAMPUS_MOMENTS.length);
  return (
    <section className="relative h-[280px] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-sm sm:h-[320px] md:h-[380px]">
        <img
          key={current.src}
          src={current.src}
          alt={current.alt}
          className="h-full w-full object-cover animate-in fade-in duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/35 to-slate-950/10" />
        <div className="absolute inset-x-0 top-0 bottom-[104px] flex max-w-xl flex-col justify-center p-5 text-white sm:bottom-[112px] md:p-8">
          <span className="text-[10px] font-semibold uppercase text-white/75 md:text-xs">Campus Today</span>
          <h2 className="mt-1 text-2xl font-bold md:text-4xl">暑期校园服务正常开放</h2>
          <p className="mt-1.5 line-clamp-1 text-xs leading-5 text-white/85 sm:text-sm md:mt-2 md:line-clamp-none md:leading-6">资源中心、自习空间与校园服务入口集中在这里。</p>
        </div>
      <div className="absolute right-3 top-3 flex items-center gap-1.5 md:right-5 md:top-5 md:gap-2">
        <button type="button" onClick={() => move(-1)} aria-label="上一张校园图片" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-slate-800 shadow-sm hover:bg-white md:h-9 md:w-9">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex h-8 items-center gap-1.5 rounded-lg bg-white/95 px-2.5 shadow-sm md:h-9 md:px-3">
          {CAMPUS_MOMENTS.map((item, index) => (
            <button key={item.src} type="button" onClick={() => setActive(index)} aria-label={`切换到第 ${index + 1} 张校园图片`} className={cn('h-1.5 rounded-full transition-all', index === active ? 'w-5 bg-blue-600' : 'w-1.5 bg-slate-300')} />
          ))}
        </div>
        <button type="button" onClick={() => move(1)} aria-label="下一张校园图片" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-slate-800 shadow-sm hover:bg-white md:h-9 md:w-9">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <HeroTimeline items={items} />
    </section>
  );
}

function AnnouncementOverview({ items }) {
  const pinned = items.filter((item) => item.is_pinned).length;
  const categories = new Set(items.map((item) => item.category)).size;
  const latest = items.reduce((result, item) => {
    const value = new Date(item.create_time || item.published_at || 0).getTime();
    return value > result ? value : result;
  }, 0);
  const stats = [
    { icon: Megaphone, value: items.length, label: '已发布' },
    { icon: Pin, value: pinned, label: '关键公告' },
    { icon: Layers3, value: categories, label: '通知分类' },
    { icon: CalendarDays, value: latest ? formatShortDate(latest) : '-', label: '最近更新' },
  ];
  return (
    <section aria-label="公告概览" className="grid grid-cols-4 divide-x divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {stats.map(({ icon: Icon, value, label }) => (
        <div key={label} className="flex min-w-0 items-center justify-center gap-2 px-2 py-3 md:gap-3 md:px-4">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 sm:inline-flex">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 text-center sm:text-left">
            <div className="truncate text-sm font-bold tabular-nums text-slate-950 md:text-base">{value}</div>
            <div className="mt-0.5 truncate text-[10px] font-medium text-slate-400 md:text-xs">{label}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

function HeroTimeline({ items }) {
  const milestones = items
    .filter((item) => item.is_pinned && item.published_at)
    .sort((a, b) => new Date(a.published_at) - new Date(b.published_at))
    .slice(0, 6);
  if (!milestones.length) {
    return (
      <div className="absolute inset-x-3 bottom-3 rounded-lg border border-white/20 bg-slate-950/55 px-4 py-3 text-xs text-white/75 backdrop-blur-md md:inset-x-5 md:bottom-5">
        暂无关键节点，管理员可在独立管理端添加。
      </div>
    );
  }
  const now = Date.now();
  const currentIndex = milestones.findIndex((item) => new Date(item.published_at).getTime() >= now);
  const activeIndex = currentIndex === -1 ? milestones.length - 1 : currentIndex;
  return (
    <div className="absolute inset-x-3 bottom-3 rounded-lg border border-white/20 bg-slate-950/55 px-3 py-2.5 text-white shadow-lg backdrop-blur-md sm:px-4 md:inset-x-5 md:bottom-5 md:py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold">
          <CalendarDays className="h-3.5 w-3.5" />
          本学期关键节点
        </div>
        <span className="hidden text-[10px] text-white/60 sm:inline">由学校管理员实时维护</span>
      </div>
      <div className="flex snap-x gap-5 overflow-x-auto pb-0.5 md:hidden">
        {milestones.map((item, index) => <HeroTimelineNode key={item.announcement_id} item={item} state={timelineState(index, activeIndex)} />)}
      </div>
      <div className="relative hidden gap-0 md:grid" style={{ gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))` }}>
        <div className="absolute left-[8%] right-[8%] top-2 h-px bg-white/30" />
        {milestones.map((item, index) => <HeroTimelineNode key={item.announcement_id} item={item} state={timelineState(index, activeIndex)} desktop />)}
      </div>
    </div>
  );
}

function HeroTimelineNode({ item, state, desktop = false }) {
  if (!desktop) {
    return (
      <div className="min-w-[150px] snap-start">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', state === 'done' && 'bg-white/65', state === 'current' && 'bg-sky-300 ring-4 ring-sky-300/20', state === 'upcoming' && 'border border-white/60 bg-transparent')} />
          <span className="text-[11px] font-bold tabular-nums text-white/80">{formatMilestoneDate(item.published_at)}</span>
        </div>
        <div className={cn('mt-1 line-clamp-1 text-xs font-semibold', state === 'current' ? 'text-white' : 'text-white/75')}>{item.title}</div>
      </div>
    );
  }
  return (
    <div className="relative text-center">
      <span className={cn('relative z-10 mx-auto block h-4 w-4 rounded-full border-2 border-slate-900/60', state === 'done' && 'bg-white/70', state === 'current' && 'bg-sky-300 ring-4 ring-sky-300/20', state === 'upcoming' && 'bg-slate-700')} />
      <div className="mt-2 text-[11px] font-bold tabular-nums text-white/80">{formatMilestoneDate(item.published_at)}</div>
      <div className={cn('mt-0.5 line-clamp-1 text-xs', state === 'current' ? 'font-semibold text-white' : 'text-white/70')}>{item.title}</div>
    </div>
  );
}

function timelineState(index, activeIndex) {
  return index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'upcoming';
}

function AnnouncementFilters({ items, value, onChange }) {
  return (
    <div role="tablist" aria-label="公告分类" className="flex max-w-full gap-1.5 overflow-x-auto pb-0.5">
      {FILTERS.map(([key, label]) => {
        const count = key === 'all' ? items.length : items.filter((item) => item.category === key).length;
        return (
          <button key={key} type="button" role="tab" aria-selected={value === key} onClick={() => onChange(key)} className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition', value === key ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-600')}>
            {label}<span className={cn('tabular-nums', value === key ? 'text-blue-100' : 'text-slate-400')}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function AnnouncementRow({ item, onOpen }) {
  const preview = item.summary || item.content;
  return (
    <button type="button" onClick={onOpen} className="group grid w-full grid-cols-[minmax(0,1fr)_88px] gap-3 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-100 sm:grid-cols-[minmax(0,1fr)_128px] sm:gap-4 sm:px-5">
      <div className="min-w-0 self-center">
        <div className="flex min-w-0 items-center gap-2">
          {item.is_pinned && <Pin className="h-3.5 w-3.5 shrink-0 fill-current text-blue-600" />}
          <TypeBadge tone={CATEGORY_TONE[item.category] || 'blue'}>{CATEGORY[item.category] || '公告'}</TypeBadge>
          <span className="truncate text-[11px] tabular-nums text-slate-400">{formatDate(item.published_at)}</span>
        </div>
        <h3 className="mt-2 line-clamp-1 text-[15px] font-bold text-slate-950 group-hover:text-blue-700 sm:text-base">{item.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 sm:text-sm">{preview}</p>
        <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-400">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{item.author?.username || '灵搭官方'}</span>
          <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:text-blue-500" />
        </div>
      </div>
      {item.cover_url && (
        <img src={mediaUrl(item.cover_url)} alt="公告封面" className="aspect-square w-full self-center rounded-md bg-slate-100 object-cover sm:aspect-[4/3]" />
      )}
      {!item.cover_url && (
        <span className={cn('flex aspect-square w-full self-center items-center justify-center rounded-md sm:aspect-[4/3]', item.category === 'academic' ? 'bg-amber-50 text-amber-600' : item.category === 'club' ? 'bg-violet-50 text-violet-600' : item.category === 'service' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')}>
          <Megaphone className="h-5 w-5" />
        </span>
      )}
    </button>
  );
}

function CampusServices({ onSelect }) {
  return (
    <section className="space-y-2.5 md:space-y-3">
      <SectionHeader title="校园服务" subtitle="常用入口" />
      <SectionSurface className="p-2">
        <div className="grid grid-cols-4 gap-1 lg:grid-cols-2">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <button key={service.label} type="button" onClick={() => onSelect(service.label)} className="group flex h-[72px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-md text-center transition hover:bg-slate-50 lg:h-[78px]">
                <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg', service.tone)}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="max-w-full truncate px-1 text-[11px] font-semibold text-slate-600 group-hover:text-slate-950 sm:text-xs">{service.label}</span>
              </button>
            );
          })}
        </div>
      </SectionSurface>
    </section>
  );
}

function AnnouncementDetail({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <article role="dialog" aria-modal="true" aria-labelledby="announcement-detail-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        {item.cover_url && <img src={mediaUrl(item.cover_url)} alt="公告封面" className="aspect-[16/7] w-full bg-slate-100 object-cover" />}
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {item.is_pinned && <Pin className="h-4 w-4 fill-current text-blue-600" />}
              <TypeBadge tone={CATEGORY_TONE[item.category] || 'blue'}>{CATEGORY[item.category] || '公告'}</TypeBadge>
              <span className="text-xs tabular-nums text-slate-400">{formatDate(item.published_at)}</span>
            </div>
            <button type="button" onClick={onClose} aria-label="关闭" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          <h2 id="announcement-detail-title" className="mt-4 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">{item.title}</h2>
          {item.summary && <p className="mt-3 border-l-2 border-blue-500 pl-3 text-sm leading-6 text-slate-500">{item.summary}</p>}
          <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700 sm:text-[15px]">{item.content}</div>
          <footer className="mt-7 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <Building2 className="h-4 w-4" />
            <span className="font-semibold text-slate-700">{item.author?.username || '灵搭官方'}</span>
            <span>发布</span>
          </footer>
        </div>
      </article>
    </div>
  );
}

function AnnouncementEditor({ role, onClose, onCreated }) {
  const { showToast } = useUI();
  const clubOnly = role === 'club';
  const [form, setForm] = useState({
    category: clubOnly ? 'club' : 'platform',
    title: '',
    summary: '',
    content: '',
    coverUrls: [],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.community.createAnnouncement({
        category: form.category,
        title: form.title.trim(),
        summary: form.summary.trim() || undefined,
        content: form.content.trim(),
        coverUrl: form.coverUrls[0] || undefined,
      });
      showToast({ title: '公告已发布', icon: 'success' });
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="announcement-editor-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl sm:p-6">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 id="announcement-editor-title" className="text-xl font-bold text-slate-950">发布公告</h2>
            <p className="mt-1 text-sm text-slate-500">公告将以当前认证身份发布。</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">分类
            <select disabled={clubOnly} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal disabled:bg-slate-50">
              {(clubOnly ? [['club', CATEGORY.club]] : Object.entries(CATEGORY)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <AnnouncementInput label="标题" value={form.title} onChange={(title) => setForm({ ...form, title })} required />
          <AnnouncementInput label="摘要" value={form.summary} onChange={(summary) => setForm({ ...form, summary })} />
          <label className="block text-sm font-semibold text-slate-700">正文
            <textarea required minLength={5} rows={7} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 p-3 font-normal outline-none focus:border-blue-400" />
          </label>
          <div className="text-sm font-semibold text-slate-700">公告封面（选填）
            <div className="mt-2">
              <ImageUploader value={form.coverUrls} onChange={(coverUrls) => setForm({ ...form, coverUrls })} max={1} disabled={saving} onUploadingChange={setUploading} />
            </div>
          </div>
          <button disabled={saving || uploading} className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
            {saving ? '发布中...' : '发布公告'}
          </button>
        </form>
      </section>
    </div>
  );
}

function AnnouncementInput({ label, value, onChange, required = false }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">{label}
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-blue-400" />
    </label>
  );
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';
}

function formatShortDate(value) {
  return value ? new Date(value).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '-';
}

function formatMilestoneDate(value) {
  return value ? new Date(value).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
}
