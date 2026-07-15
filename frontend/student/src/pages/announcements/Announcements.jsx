import { useCallback, useEffect, useState } from 'react';
import {
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

  return (
    <>
      <AppPage aside={<AnnouncementAside items={items} />}>
        <PageHeader
          eyebrow="Campus"
          title="校园公告"
          subtitle="学期节点、重要通知与常用校园服务。"
          action={canPublish && (
            <button type="button" onClick={() => setEditorOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500">
              <Plus className="h-4 w-4" />
              发布公告
            </button>
          )}
        />

        <CampusMoment />

        <section className="space-y-3">
          <SectionHeader title="本学期关键节点" subtitle="由学校管理员实时维护" />
          <SectionSurface className="px-5 py-6 md:px-7">
            <Timeline items={items} />
          </SectionSurface>
        </section>

        <section className="space-y-3">
          <SectionHeader title="最新通知" subtitle={items.length ? `${items.length} 条已发布公告` : '暂无新通知'} />
          <SectionSurface>
            {loading && <div className="p-10 text-center text-sm text-slate-400">正在加载...</div>}
            {!loading && items.length === 0 && (
              <EmptyPanel icon={Megaphone} text="暂时没有新公告。" />
            )}
            {items.map((item) => <AnnouncementRow key={item.announcement_id} item={item} />)}
          </SectionSurface>
        </section>

        <section className="space-y-3">
          <SectionHeader title="校园服务" subtitle="常用入口" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.label}
                  type="button"
                  onClick={() => showToast({ title: `${service.label}服务接入中`, icon: 'none' })}
                  className="flex h-20 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', service.tone)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{service.label}</span>
                </button>
              );
            })}
          </div>
        </section>
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
    </>
  );
}

function CampusMoment() {
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
    <section className="relative h-[210px] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-sm md:h-[238px]">
        <img
          key={current.src}
          src={current.src}
          alt={current.alt}
          className="h-full w-full object-cover animate-in fade-in duration-500"
        />
        <div className="absolute inset-0 bg-slate-950/45" />
        <div className="absolute inset-0 flex max-w-md flex-col justify-end p-6 text-white md:p-8">
          <span className="text-xs font-semibold text-white/80">Campus Today</span>
          <h2 className="mt-1 text-2xl font-bold md:text-3xl">暑期校园服务正常开放</h2>
          <p className="mt-2 text-sm leading-6 text-white/82">资源中心、自习空间与校园服务入口集中在这里。</p>
        </div>
      <div className="absolute right-5 top-5 flex items-center gap-2">
        <button type="button" onClick={() => move(-1)} aria-label="上一张校园图片" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-slate-800 shadow-sm hover:bg-white">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex h-9 items-center gap-1.5 rounded-lg bg-white/90 px-3 shadow-sm">
          {CAMPUS_MOMENTS.map((item, index) => (
            <button key={item.src} type="button" onClick={() => setActive(index)} aria-label={`切换到第 ${index + 1} 张校园图片`} className={cn('h-1.5 rounded-full transition-all', index === active ? 'w-5 bg-blue-600' : 'w-1.5 bg-slate-300')} />
          ))}
        </div>
        <button type="button" onClick={() => move(1)} aria-label="下一张校园图片" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-slate-800 shadow-sm hover:bg-white">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function Timeline({ items }) {
  const milestones = items
    .filter((item) => item.is_pinned && item.published_at)
    .sort((a, b) => new Date(a.published_at) - new Date(b.published_at))
    .slice(0, 8);
  if (!milestones.length) {
    return <div className="py-5 text-center text-sm text-slate-400">暂无关键节点，管理员可在独立管理端添加。</div>;
  }
  const now = Date.now();
  const currentIndex = milestones.findIndex((item) => new Date(item.published_at).getTime() >= now);
  const activeIndex = currentIndex === -1 ? milestones.length - 1 : currentIndex;
  return (
    <>
      <div className="md:hidden">
        {milestones.map((item, index) => <TimelineNode key={item.announcement_id} item={item} state={timelineState(index, activeIndex)} />)}
      </div>
      <div className="relative hidden gap-0 md:grid" style={{ gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))` }}>
        <div className="absolute left-[10%] right-[10%] top-3 h-px bg-slate-200" />
        {milestones.map((item, index) => <TimelineNode key={item.announcement_id} item={item} state={timelineState(index, activeIndex)} desktop />)}
      </div>
    </>
  );
}

function TimelineNode({ item, state, desktop = false }) {
  return (
    <div className={cn('relative', desktop ? 'text-center' : 'grid grid-cols-[28px_64px_1fr] items-center gap-3 py-3')}>
      <span className={cn('relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border-4 border-white', desktop && 'mx-auto', state === 'done' && 'bg-slate-400', state === 'current' && 'bg-blue-600 ring-4 ring-blue-100', state === 'upcoming' && 'bg-slate-200')} />
      <div className={cn('font-heading text-sm font-bold tabular-nums text-slate-950', desktop && 'mt-4')}>{formatMilestoneDate(item.published_at)}</div>
      <div className={cn('line-clamp-2 text-sm', desktop && 'mt-1', state === 'current' ? 'font-semibold text-blue-600' : 'text-slate-500')}>{item.title}</div>
    </div>
  );
}

function timelineState(index, activeIndex) {
  return index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'upcoming';
}

function AnnouncementRow({ item }) {
  return (
    <article className="grid gap-4 border-b border-slate-100 px-5 py-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_160px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
        {item.is_pinned && <Pin className="h-4 w-4 fill-current text-blue-600" />}
        <TypeBadge tone={item.category === 'club' ? 'violet' : 'blue'}>
          {CATEGORY[item.category] || '公告'}
        </TypeBadge>
        <span className="text-xs text-slate-400">{formatDate(item.published_at)}</span>
        </div>
        <h3 className="mt-3 text-base font-bold text-slate-950">{item.title}</h3>
        {item.summary && <p className="mt-1 text-sm text-slate-500">{item.summary}</p>}
        <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.content}</p>
        <div className="mt-3 text-xs font-semibold text-slate-500">{item.author?.username}</div>
      </div>
      {item.cover_url && (
        <img src={mediaUrl(item.cover_url)} alt="公告封面" className="aspect-[16/9] w-full rounded-lg bg-slate-100 object-cover sm:aspect-[4/3]" />
      )}
    </article>
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

function AnnouncementAside({ items }) {
  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-950">公告概览</h3>
        <div className="mt-4 grid grid-cols-2 divide-x divide-slate-100 text-center">
          <div><div className="text-xl font-bold text-slate-950">{items.length}</div><div className="mt-1 text-xs text-slate-500">已发布</div></div>
          <div><div className="text-xl font-bold text-slate-950">{items.filter((item) => item.is_pinned).length}</div><div className="mt-1 text-xs text-slate-500">置顶</div></div>
        </div>
      </section>
    </>
  );
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';
}

function formatMilestoneDate(value) {
  return value ? new Date(value).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
}
