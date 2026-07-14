import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Bookmark, Car, FileText, Film, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { AppPage, EmptyPanel, PageHeader, SectionHeader, SectionSurface, SegmentedTabs, TypeBadge } from '../../components/layout/AppScaffold';

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'post', label: '帖子' },
  { key: 'room', label: '房间' },
];

const ROOM_PATH = {
  carpool: '/detail-carpool',
  entertainment: '/detail-entertainment',
  group: '/detail-study',
};

export default function Saved() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.community.favorites(tab === 'all' ? undefined : tab)
      .then((res) => setItems(res.list || []))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    if (authLib.requireLogin()) return;
    load();
  }, [load]);

  const open = (item) => {
    if (item.target_type === 'post') navigate(`/posts?postId=${item.target_id}`);
    else navigate(`${ROOM_PATH[item.target?.room_type] || '/detail-study'}?id=${item.target_id}`);
  };

  const remove = (item) => {
    api.community.unfavorite(item.target_type, item.target_id).then(load);
  };

  return (
    <AppPage aside={<SavedAside items={items} />}>
      <PageHeader eyebrow="Saved" title="我的收藏" subtitle="帖子和搭子房间会跟随账号同步保存。" />
      <SegmentedTabs items={TABS} value={tab} onChange={setTab} />
      <section className="space-y-3">
        <SectionHeader title="收藏列表" subtitle={loading ? '正在加载' : `${items.length} 项内容`} />
        <SectionSurface>
          {!loading && items.length === 0 && <EmptyPanel icon={Bookmark} text="还没有收藏内容。" />}
          {loading && <div className="p-10 text-center text-sm text-slate-400">正在加载...</div>}
          {items.map((item) => <SavedRow key={item.favorite_id} item={item} onOpen={() => open(item)} onRemove={() => remove(item)} />)}
        </SectionSurface>
      </section>
    </AppPage>
  );
}

function SavedRow({ item, onOpen, onRemove }) {
  const isPost = item.target_type === 'post';
  const target = item.target || {};
  const meta = isPost ? { icon: FileText, label: '帖子', tone: 'violet' } : roomMeta(target.room_type);
  const Icon = meta.icon;
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 p-4 last:border-b-0 hover:bg-slate-50">
      <button type="button" onClick={onOpen} className="flex min-w-0 items-start gap-3 text-left">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="h-5 w-5" /></span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm text-slate-950">{target.title || '未命名内容'}</strong><TypeBadge tone={meta.tone}>{meta.label}</TypeBadge></span>
          <span className="mt-1 line-clamp-2 text-sm text-slate-500">{isPost ? target.content : roomSubtitle(target)}</span>
        </span>
      </button>
      <button type="button" onClick={onRemove} aria-label="移除收藏" className="inline-flex h-9 w-9 items-center justify-center self-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

function SavedAside({ items }) {
  const posts = items.filter((item) => item.target_type === 'post').length;
  const rooms = items.filter((item) => item.target_type === 'room').length;
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-950">收藏概览</h3><div className="mt-4 grid grid-cols-2 divide-x divide-slate-100 text-center"><Mini label="帖子" value={posts} /><Mini label="房间" value={rooms} /></div></section>;
}

function Mini({ label, value }) { return <div><div className="text-xl font-bold text-slate-950">{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>; }
function roomMeta(type) { if (type === 'carpool') return { icon: Car, label: '拼车', tone: 'blue' }; if (type === 'entertainment') return { icon: Film, label: '娱乐', tone: 'orange' }; return { icon: BookOpen, label: '学习', tone: 'green' }; }
function roomSubtitle(room) { if (room.room_type === 'carpool') return `${room.carpool?.start_location || ''} → ${room.carpool?.end_location || ''}`; if (room.room_type === 'entertainment') return room.entertainment?.ent_type || room.content || ''; return room.group?.course_name || room.group?.group_target || room.content || ''; }
