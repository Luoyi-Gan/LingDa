import { AlertTriangle, ArrowUpRight, Bot, FileCheck2, Megaphone, ShieldAlert, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
import { EmptyState, PageIntro, StatusBadge } from '../components/AdminShell';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [queue, setQueue] = useState({ posts: [], comments: [], verifications: [] });
  useEffect(() => { Promise.all([adminApi.overview(), adminApi.reviewQueue()]).then(([overview, review]) => { setData(overview); setQueue(review); }); }, []);
  if (!data) return <div className="loading-panel">正在汇总运营数据...</div>;
  const cards = [
    { label: '待处理事项', value: data.pending_total, hint: '需要人工决策', icon: FileCheck2, tone: 'blue' },
    { label: '高风险内容', value: data.high_risk, hint: '优先检查', icon: ShieldAlert, tone: 'red' },
    { label: '已发布公告', value: data.published_announcements, hint: '当前公开', icon: Megaphone, tone: 'green' },
    { label: '社区用户', value: data.total_users, hint: '正常账号', icon: Users, tone: 'slate' },
  ];
  const urgent = [...queue.posts.map((item) => ({ kind: '帖子', title: item.title, author: item.author?.username, risk: item.risk_level, reason: item.review_reason })), ...queue.comments.map((item) => ({ kind: '评论', title: item.post?.title, author: item.author?.username, risk: item.risk_level, reason: item.review_reason }))].slice(0, 5);
  return <><PageIntro eyebrow="Operations overview" title="社区运营总览" description="集中查看内容安全、身份认证与校园公告状态。" action={<button className="button primary" onClick={() => navigate('/announcements')}><Megaphone size={16} />发布公告</button>} /><section className="metric-grid">{cards.map(({ label, value, hint, icon: Icon, tone }) => <article className={`metric-card tone-${tone}`} key={label}><div className="metric-head"><span>{label}</span><Icon size={18} /></div><strong>{value}</strong><small>{hint}</small></article>)}</section><section className="dashboard-grid"><div className="panel"><div className="panel-heading"><div><h3>风险审核队列</h3><p>自动识别后等待人工判断的内容</p></div><button className="text-button" onClick={() => navigate('/moderation')}>查看全部<ArrowUpRight size={15} /></button></div>{urgent.length ? <div className="queue-list">{urgent.map((item, index) => <button className="queue-row" key={`${item.kind}-${index}`} onClick={() => navigate('/moderation')}><span className="kind-icon"><AlertTriangle size={16} /></span><span className="queue-copy"><strong>{item.title || item.kind}</strong><small>{item.author} · {item.reason || '需人工复核'}</small></span><StatusBadge value={item.risk || 'medium'} /></button>)}</div> : <EmptyState title="风控队列已清空" />}</div><aside className="panel policy-panel"><div className="policy-icon"><Bot size={22} /></div><h3>自动识别策略</h3><p>低风险内容自动发布；命中高危、交易、联系方式等规则时，内容进入人工审核，处置结果自动通知发布者。</p><dl><div><dt>运行状态</dt><dd><span className="live-dot" />已开启</dd></div><div><dt>人工待审</dt><dd>{data.pending_posts + data.pending_comments}</dd></div><div><dt>已下架</dt><dd>{data.hidden_content}</dd></div></dl></aside></section></>;
}
