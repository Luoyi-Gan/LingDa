import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  Eye,
  Heart,
  MessageCircle,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import authLib from '../../lib/auth';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import {
  AppPage,
  EmptyPanel,
  PageHeader,
  SectionSurface,
  SegmentedTabs,
  TypeBadge,
} from '../../components/layout/AppScaffold';
import { cn } from '../../lib/cn';

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'club', label: '社团动态' },
  { key: 'course', label: '课程交流' },
  { key: 'lost_found', label: '失物招领' },
  { key: 'campus_life', label: '校园生活' },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((item) => [item.key, item.label]));

export default function Community() {
  const [searchParams] = useSearchParams();
  const { showToast } = useUI();
  const { currentUser } = useAuth() || {};
  const [category, setCategory] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activePost, setActivePost] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.community
      .listPosts({
        ...(category !== 'all' ? { category } : {}),
        ...(query ? { keyword: query } : {}),
      })
      .then((res) => setPosts(res.list || []))
      .finally(() => setLoading(false));
  }, [category, query]);

  useEffect(() => {
    if (authLib.requireLogin()) return;
    load();
  }, [load]);

  useEffect(() => {
    const postId = Number(searchParams.get('postId'));
    if (postId > 0) api.community.postDetail(postId).then(setActivePost).catch(() => {});
  }, [searchParams]);

  const openPost = (postId) => {
    api.community.postDetail(postId).then(setActivePost);
  };

  const canPost = currentUser?.verification_status === 'verified' || currentUser?.account_role !== 'student';

  return (
    <>
      <AppPage aside={<CommunityAside posts={posts} />}>
        <PageHeader
          eyebrow="Community"
          title="校园贴吧"
          subtitle="课程、社团和校园生活，都可以在这里认真聊。"
          action={
            <button
              type="button"
              onClick={() => {
                if (!canPost) {
                  showToast({ title: '完成学生认证后即可发帖', icon: 'none' });
                  return;
                }
                setEditorOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              发布帖子
            </button>
          }
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SegmentedTabs items={CATEGORIES} value={category} onChange={setCategory} className="max-w-full overflow-x-auto" />
          <form
            className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 md:w-72"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(keyword.trim());
            }}
          >
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索帖子"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </form>
        </div>

        <SectionSurface>
          {!loading && posts.length === 0 && <EmptyPanel text="这个分类暂时还没有帖子。" />}
          {loading && <div className="p-10 text-center text-sm text-slate-400">正在加载...</div>}
          {!loading && posts.map((post) => <PostRow key={post.post_id} post={post} onOpen={() => openPost(post.post_id)} />)}
        </SectionSurface>
      </AppPage>

      {editorOpen && <PostEditor onClose={() => setEditorOpen(false)} onCreated={() => { setEditorOpen(false); load(); }} />}
      {activePost && <PostDetail post={activePost} onClose={() => setActivePost(null)} onRefresh={() => openPost(activePost.post_id)} />}
    </>
  );
}

function PostRow({ post, onOpen }) {
  return (
    <button type="button" onClick={onOpen} className="block w-full border-b border-slate-100 px-5 py-5 text-left transition last:border-b-0 hover:bg-slate-50">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback style={{ background: post.author?.avatar_color || '#2563EB' }} className="text-xs font-bold text-white">
            {post.author?.avatar_text || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-700">{post.author?.username}</span>
            {post.author?.verification_status === 'verified' && <TypeBadge tone="blue">已认证</TypeBadge>}
            <TypeBadge tone="slate">{CATEGORY_LABEL[post.category]}</TypeBadge>
            <span>{formatDate(post.published_at || post.create_time)}</span>
          </div>
          <h2 className="mt-2 text-lg font-bold text-slate-950">{post.title}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{post.content}</p>
          <div className="mt-3 flex gap-4 text-xs text-slate-400">
            <Stat icon={Eye} value={post.view_count} />
            <Stat icon={MessageCircle} value={post.comment_count} />
            <Stat icon={Heart} value={post.like_count} />
          </div>
        </div>
      </div>
    </button>
  );
}

function PostEditor({ onClose, onCreated }) {
  const { showToast } = useUI();
  const [form, setForm] = useState({ category: 'course', title: '', content: '', images: '' });
  const [saving, setSaving] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    setSaving(true);
    const images = form.images.split('\n').map((v) => v.trim()).filter(Boolean);
    api.community.createPost({ category: form.category, title: form.title, content: form.content, images })
      .then((res) => {
        showToast({ title: res.status === 'published' ? '帖子已发布' : '已提交，等待管理员复核', icon: 'success' });
        onCreated();
      })
      .finally(() => setSaving(false));
  };
  return (
    <ModalShell title="发布帖子" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold text-slate-700">分类
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal">
            {CATEGORIES.slice(1).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
        <Field label="标题" value={form.title} onChange={(title) => setForm({ ...form, title })} maxLength={150} />
        <label className="block text-sm font-semibold text-slate-700">正文
          <textarea required minLength={5} maxLength={10000} rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-2 w-full resize-y rounded-lg border border-slate-200 p-3 font-normal outline-none focus:border-blue-400" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">图片地址 <span className="font-normal text-slate-400">每行一个，最多 9 个</span>
          <textarea rows={3} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className="mt-2 w-full resize-none rounded-lg border border-slate-200 p-3 font-normal outline-none focus:border-blue-400" />
        </label>
        <button disabled={saving} className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white disabled:opacity-50">{saving ? '提交中...' : '提交发布'}</button>
      </form>
    </ModalShell>
  );
}

function PostDetail({ post, onClose, onRefresh }) {
  const { showToast } = useUI();
  const [comment, setComment] = useState('');
  const images = Array.isArray(post.images) ? post.images : [];
  return (
    <ModalShell title={CATEGORY_LABEL[post.category]} onClose={onClose} wide>
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Avatar className="h-9 w-9"><AvatarFallback style={{ background: post.author?.avatar_color }} className="text-xs font-bold text-white">{post.author?.avatar_text}</AvatarFallback></Avatar>
        <div><div className="font-semibold text-slate-800">{post.author?.username}</div><div className="text-xs">{formatDate(post.published_at || post.create_time)}</div></div>
      </div>
      <h2 className="mt-5 text-2xl font-bold text-slate-950">{post.title}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{post.content}</p>
      {images.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{images.map((src) => <img key={src} src={src} alt="帖子图片" className="aspect-[4/3] w-full rounded-lg object-cover" />)}</div>}
      <div className="mt-5 flex gap-2 border-y border-slate-100 py-3">
        <ActionButton active={post.liked} icon={Heart} label={`${post.like_count || 0}`} onClick={() => api.community.toggleLike(post.post_id).then(onRefresh)} />
        <ActionButton active={post.favorited} icon={Bookmark} label={post.favorited ? '已收藏' : '收藏'} onClick={() => (post.favorited ? api.community.unfavorite('post', post.post_id) : api.community.favorite('post', post.post_id)).then(onRefresh)} />
      </div>
      <div className="mt-5 space-y-4">
        <h3 className="font-bold text-slate-950">评论 {post.comment_count || 0}</h3>
        {(post.comments || []).map((item) => <div key={item.comment_id} className="flex gap-3"><Avatar className="h-8 w-8"><AvatarFallback style={{ background: item.author?.avatar_color }} className="text-[10px] font-bold text-white">{item.author?.avatar_text}</AvatarFallback></Avatar><div className="min-w-0"><div className="text-xs font-semibold text-slate-700">{item.author?.username}</div><p className="mt-1 text-sm text-slate-600">{item.content}</p></div></div>)}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!comment.trim()) return; api.community.comment(post.post_id, { content: comment.trim() }).then((res) => { showToast({ title: res.status === 'published' ? '评论成功' : '评论已进入审核', icon: 'success' }); setComment(''); onRefresh(); }); }}>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="写下你的评论" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" />
          <button aria-label="发送评论" className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white"><Send className="h-4 w-4" /></button>
        </form>
      </div>
    </ModalShell>
  );
}

function CommunityAside({ posts }) {
  const countByCategory = useMemo(() => posts.reduce((acc, post) => ({ ...acc, [post.category]: (acc[post.category] || 0) + 1 }), {}), [posts]);
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-950">当前板块</h3><div className="mt-4 space-y-3">{CATEGORIES.slice(1).map((item) => <div key={item.key} className="flex justify-between text-sm"><span className="text-slate-500">{item.label}</span><span className="font-semibold text-slate-800">{countByCategory[item.key] || 0}</span></div>)}</div></section>;
}

function ModalShell({ title, onClose, children, wide }) {
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" className={cn('max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-white p-5 shadow-2xl sm:rounded-lg sm:p-6', wide ? 'sm:max-w-3xl' : 'sm:max-w-xl')}><header className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold text-slate-950">{title}</h2><button type="button" onClick={onClose} aria-label="关闭" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></header>{children}</section></div>;
}

function Field({ label, value, onChange, maxLength }) { return <label className="block text-sm font-semibold text-slate-700">{label}<input required minLength={2} maxLength={maxLength} value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-blue-400" /></label>; }
function Stat({ icon: Icon, value }) { return <span className="inline-flex items-center gap-1"><Icon className="h-3.5 w-3.5" />{value || 0}</span>; }
function ActionButton({ icon: Icon, label, active, onClick }) { return <button type="button" onClick={onClick} className={cn('inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold', active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600')}><Icon className="h-4 w-4" fill={active ? 'currentColor' : 'none'} />{label}</button>; }
function formatDate(value) { if (!value) return ''; return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
