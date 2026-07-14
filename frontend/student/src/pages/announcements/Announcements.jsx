import { useCallback, useEffect, useState } from 'react';
import {
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
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
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

const TIMELINE = [
  { date: '07.06', label: '暑期开始', state: 'done' },
  { date: '07.15', label: '暑期课程', state: 'current' },
  { date: '08.10', label: '第二阶段选课', state: 'upcoming' },
  { date: '09.06', label: '学生返校', state: 'upcoming' },
  { date: '09.07', label: '秋季开学', state: 'upcoming' },
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
  const [open, setOpen] = useState(false);
  const load = useCallback(
    () => api.community.announcements().then((res) => setItems(res.list || [])).finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    if (authLib.requireLogin()) return;
    load();
  }, [load]);

  const role = currentUser?.account_role;
  const canPublish = role === 'admin' || role === 'official' ||
    (role === 'club' && currentUser?.verification_status === 'verified');

  return (
    <>
      <AppPage aside={<AnnouncementAside items={items} />}>
        <PageHeader
          eyebrow="Campus"
          title="校园公告"
          subtitle="学期节点、重要通知与常用校园服务。"
          action={canPublish && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              发布公告
            </button>
          )}
        />

        <CampusMoment />

        <section className="space-y-3">
          <SectionHeader title="本学期关键节点" subtitle="2026 暑期至秋季学期" />
          <SectionSurface className="px-5 py-6 md:px-7">
            <Timeline />
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

      {open && (
        <AnnouncementEditor
          canPin={role === 'admin'}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            load();
          }}
        />
      )}
    </>
  );
}

function CampusMoment() {
  return (
    <section className="grid h-[210px] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-sm sm:grid-cols-[1.55fr_0.85fr] md:h-[238px]">
      <div className="relative min-w-0 overflow-hidden">
        <img
          src="/images/campus/resource-center-sun.jpg"
          alt="阳光下的校园资源中心"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/72 via-slate-950/22 to-transparent" />
        <div className="absolute inset-0 flex max-w-md flex-col justify-end p-6 text-white md:p-8">
          <span className="text-xs font-semibold text-white/80">Campus Today</span>
          <h2 className="mt-1 text-2xl font-bold md:text-3xl">暑期校园服务正常开放</h2>
          <p className="mt-2 text-sm leading-6 text-white/82">资源中心、自习空间与校园服务入口集中在这里。</p>
        </div>
      </div>
      <div className="hidden overflow-hidden border-l border-white/15 sm:block">
        <img
          src="/images/campus/sky-courtyard.jpg"
          alt="晴空下的校园中庭"
          className="h-full w-full object-cover"
        />
      </div>
    </section>
  );
}

function Timeline() {
  return (
    <div className="relative grid gap-0 md:grid-cols-5">
      <div className="absolute left-[10%] right-[10%] top-3 hidden h-px bg-slate-200 md:block" />
      {TIMELINE.map((item) => (
        <div key={item.date} className="relative grid grid-cols-[28px_64px_1fr] items-center gap-3 py-3 md:block md:py-0 md:text-center">
          <span
            className={cn(
              'relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border-4 border-white md:mx-auto',
              item.state === 'done' && 'bg-slate-400',
              item.state === 'current' && 'bg-blue-600 ring-4 ring-blue-100',
              item.state === 'upcoming' && 'bg-slate-200',
            )}
          />
          <div className="font-heading text-sm font-bold tabular-nums text-slate-950 md:mt-4">{item.date}</div>
          <div className={cn('text-sm md:mt-1', item.state === 'current' ? 'font-semibold text-blue-600' : 'text-slate-500')}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnnouncementRow({ item }) {
  return (
    <article className="border-b border-slate-100 px-5 py-5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        {item.is_pinned && <Pin className="h-4 w-4 fill-current text-blue-600" />}
        <TypeBadge tone={item.category === 'club' ? 'violet' : 'blue'}>
          {CATEGORY[item.category] || '公告'}
        </TypeBadge>
        <span className="text-xs text-slate-400">{formatDate(item.published_at)}</span>
      </div>
      <h3 className="mt-3 text-base font-bold text-slate-950">{item.title}</h3>
      {item.summary && <p className="mt-1 text-sm text-slate-500">{item.summary}</p>}
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.content}</p>
      <div className="mt-3 text-xs font-semibold text-slate-500">{item.author?.username}</div>
    </article>
  );
}

function AnnouncementEditor({ canPin, onClose, onCreated }) {
  const { showToast } = useUI();
  const [form, setForm] = useState({
    category: 'platform',
    title: '',
    summary: '',
    content: '',
    coverUrl: '',
    isPinned: false,
  });
  const [saving, setSaving] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    setSaving(true);
    api.community
      .createAnnouncement({
        ...form,
        summary: form.summary || undefined,
        coverUrl: form.coverUrl || undefined,
      })
      .then(() => {
        showToast({ title: '公告已发布', icon: 'success' });
        onCreated();
      })
      .finally(() => setSaving(false));
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/35 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-lg sm:p-6">
        <header className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">发布公告</h2>
          <button type="button" onClick={onClose} aria-label="关闭" className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold">分类
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal">
              {Object.entries(CATEGORY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <AnnouncementInput label="标题" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
          <AnnouncementInput label="摘要" value={form.summary} onChange={(value) => setForm({ ...form, summary: value })} />
          <label className="block text-sm font-semibold">正文
            <textarea required minLength={5} rows={8} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 p-3 font-normal outline-none focus:border-blue-400" />
          </label>
          <AnnouncementInput label="封面地址" value={form.coverUrl} onChange={(value) => setForm({ ...form, coverUrl: value })} />
          {canPin && (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={form.isPinned} onChange={(event) => setForm({ ...form, isPinned: event.target.checked })} />
              置顶公告
            </label>
          )}
          <button disabled={saving} className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? '发布中...' : '发布公告'}
          </button>
        </form>
      </section>
    </div>
  );
}

function AnnouncementInput({ label, value, onChange, required }) {
  return (
    <label className="block text-sm font-semibold">{label}
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
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <img src="/images/campus/study-window.jpg" alt="校园学习空间" className="aspect-[4/3] w-full object-cover" />
        <div className="p-4"><div className="font-semibold text-slate-950">暑期学习空间</div><p className="mt-1 text-sm leading-6 text-slate-500">资源中心开放区域以现场通知为准。</p></div>
      </section>
    </>
  );
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';
}
