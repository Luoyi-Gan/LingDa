import { Edit3, EyeOff, Flag, Megaphone, Plus, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../api';
import { EmptyState, PageIntro, StatusBadge } from '../components/AdminShell';
import { AnnouncementDialog } from '../components/Dialogs';

export default function AnnouncementsPage({ milestones = false }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => adminApi.announcements({ status: 'all' }).then((res) => setItems(res.list || [])), []);
  useEffect(() => { load(); }, [load]);
  const visible = useMemo(() => milestones ? items.filter((item) => item.is_pinned) : items, [items, milestones]);
  const openEditor = (item = null) => { setEditing(item); setDialogOpen(true); };
  const submit = async (form) => {
    setBusy(true);
    try { if (editing) await adminApi.updateAnnouncement(editing.announcement_id, form); else await adminApi.createAnnouncement(form); setDialogOpen(false); await load(); }
    finally { setBusy(false); }
  };
  const changeStatus = async (item, status) => { await adminApi.updateAnnouncement(item.announcement_id, { status }); await load(); };
  return <><PageIntro eyebrow={milestones ? 'Timeline nodes' : 'Campus announcements'} title={milestones ? '关键节点' : '公告管理'} description={milestones ? '维护学生端公告时间轴中的重要日期和节点。' : '发布、编辑、置顶或下架面向学生的校园通知。'} action={<button className="button primary" onClick={() => openEditor()}><Plus size={16} />{milestones ? '新建节点' : '发布公告'}</button>} /><section className="panel table-panel"><div className="panel-heading"><div><h3>{milestones ? '时间轴节点' : '全部公告'}</h3><p>共 {visible.length} 条记录</p></div></div>{visible.length ? <div className="data-table"><div className="table-row table-head"><span>公告信息</span><span>分类</span><span>状态</span><span>发布时间</span><span>操作</span></div>{visible.map((item) => <div className="table-row" key={item.announcement_id}><div className="primary-cell"><span className={`announcement-icon ${item.is_pinned ? 'pinned' : ''}`}>{item.is_pinned ? <Flag size={17} /> : <Megaphone size={17} />}</span><span><strong>{item.title}</strong><small>{item.summary || item.content}</small></span></div><span>{categoryLabel(item.category)}</span><span><StatusBadge value={item.status} /></span><span>{formatDate(item.published_at || item.create_time)}</span><div className="row-actions"><button className="icon-button" title="编辑" onClick={() => openEditor(item)}><Edit3 size={16} /></button>{item.status === 'published' ? <button className="icon-button danger-ink" title="下架" onClick={() => changeStatus(item, 'hidden')}><EyeOff size={16} /></button> : <button className="icon-button success-ink" title="重新发布" onClick={() => changeStatus(item, 'published')}><RotateCcw size={16} /></button>}</div></div>)}</div> : <EmptyState icon={milestones ? Flag : Megaphone} title={milestones ? '暂无关键节点' : '暂无公告'} />}</section><AnnouncementDialog open={dialogOpen} item={editing} milestones={milestones} busy={busy} onClose={() => setDialogOpen(false)} onSubmit={submit} /></>;
}

function categoryLabel(value) { return ({ platform: '平台通知', academic: '教务安排', service: '校园服务', club: '社团活动' })[value] || value; }
function formatDate(value) { return value ? new Date(value).toLocaleDateString('zh-CN') : '-'; }
