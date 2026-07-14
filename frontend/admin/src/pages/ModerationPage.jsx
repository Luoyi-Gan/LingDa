import { Check, EyeOff, MessageSquareText, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../api';
import { EmptyState, PageIntro, StatusBadge } from '../components/AdminShell';
import { ActionDialog } from '../components/Dialogs';

export default function ModerationPage() {
  const [kind, setKind] = useState('posts');
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => (kind === 'posts' ? adminApi.posts({ status }) : adminApi.comments({ status })).then((res) => setItems(res.list || [])), [kind, status]);
  useEffect(() => { load(); }, [load]);
  const confirm = async (note) => { setBusy(true); try { const fn = kind === 'posts' ? adminApi.moderatePost : adminApi.moderateComment; await fn(action.id, { action: action.kind, note }); setAction(null); await load(); } finally { setBusy(false); } };
  const openAction = (item, actionKind) => setAction({ kind: actionKind, id: kind === 'posts' ? item.post_id : item.comment_id, title: kind === 'posts' ? item.title : item.post?.title });
  return <><PageIntro eyebrow="Content safety" title="内容风控" description="自动识别命中后由管理员复核，可通过、驳回、下架或恢复内容。" /><section className="panel table-panel"><div className="panel-heading moderation-tools"><div className="segmented prominent"><button className={kind === 'posts' ? 'active' : ''} onClick={() => setKind('posts')}>帖子</button><button className={kind === 'comments' ? 'active' : ''} onClick={() => setKind('comments')}>评论</button></div><select className="compact-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="pending">待审核</option><option value="published">已发布</option><option value="hidden">已下架</option><option value="rejected">已驳回</option><option value="all">全部状态</option></select></div>{items.length ? <div className="moderation-list">{items.map((item) => { const pending = item.status === 'pending'; const published = item.status === 'published'; const hidden = item.status === 'hidden'; return <article className="moderation-row" key={kind === 'posts' ? item.post_id : item.comment_id}><div className={`risk-mark risk-${item.risk_level || 'medium'}`}>{kind === 'posts' ? <ShieldAlert size={19} /> : <MessageSquareText size={19} />}</div><div className="moderation-copy"><div className="moderation-title"><h4>{kind === 'posts' ? item.title : item.post?.title || '帖子评论'}</h4><StatusBadge value={item.risk_level || 'medium'} /><StatusBadge value={item.status} /></div><p>{item.author?.username} · {item.author?.college}</p><blockquote>{item.content}</blockquote>{item.review_reason && <span className="risk-reason">识别原因：{item.review_reason}</span>}</div><div className="review-actions vertical">{pending && <><button className="button approve" onClick={() => openAction(item, 'approve')}><Check size={15} />通过</button><button className="button reject" onClick={() => openAction(item, 'reject')}><X size={15} />驳回</button></>}{published && <button className="button reject" onClick={() => openAction(item, 'hide')}><EyeOff size={15} />下架</button>}{hidden && <button className="button approve" onClick={() => openAction(item, 'restore')}><RotateCcw size={15} />恢复</button>}</div></article>; })}</div> : <EmptyState icon={ShieldAlert} title="当前筛选下没有内容" />}</section><ActionDialog open={!!action} action={action?.kind} title={action?.title || ''} busy={busy} onClose={() => setAction(null)} onConfirm={confirm} /></>;
}
