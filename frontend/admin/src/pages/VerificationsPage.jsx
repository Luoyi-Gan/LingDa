import { Building2, Check, ExternalLink, UserCheck, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../api';
import { EmptyState, PageIntro, StatusBadge } from '../components/AdminShell';
import { ActionDialog } from '../components/Dialogs';

export default function VerificationsPage({ type }) {
  const isClub = type === 'club';
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => adminApi.verifications({ type, status }).then((res) => setItems(res.list || [])), [type, status]);
  useEffect(() => { load(); }, [load]);
  const confirm = async (note) => { setBusy(true); try { await adminApi.reviewVerification(action.item.request_id, { action: action.kind, note }); setAction(null); await load(); } finally { setBusy(false); } };
  return <><PageIntro eyebrow="Identity verification" title={isClub ? '社团认证' : '学生身份审核'} description={isClub ? '核验社团名称、负责人和证明材料，通过后可发布社团公告。' : '核验学生学号与在校材料，通过后开放社区发布权限。'} /><section className="panel table-panel"><div className="panel-heading"><div><h3>{isClub ? '社团申请' : '学生申请'}</h3><p>处理结果会通过系统消息通知申请人</p></div><div className="segmented">{['pending', 'approved', 'rejected'].map((value) => <button key={value} className={status === value ? 'active' : ''} onClick={() => setStatus(value)}>{({ pending: '待审核', approved: '已通过', rejected: '已驳回' })[value]}</button>)}</div></div>{items.length ? <div className="verification-list">{items.map((item) => <article className="verification-row" key={item.request_id}><div className={`verification-mark ${isClub ? 'club' : ''}`}>{isClub ? <Building2 size={20} /> : <UserCheck size={20} />}</div><div className="verification-copy"><div><h4>{item.organization_name || item.applicant_name}</h4><StatusBadge value={item.status} /></div><p>{item.applicant?.username} · {item.applicant?.college}{item.student_id ? ` · 学号 ${item.student_id}` : ''}</p><span>{item.statement || '申请人未填写补充说明'}</span><div className="material-links">{(item.material_urls || []).map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">材料 {index + 1}<ExternalLink size={13} /></a>)}</div></div>{item.status === 'pending' && <div className="review-actions"><button className="button approve" onClick={() => setAction({ kind: 'approve', item })}><Check size={15} />通过</button><button className="button reject" onClick={() => setAction({ kind: 'reject', item })}><X size={15} />驳回</button></div>}</article>)}</div> : <EmptyState icon={isClub ? Building2 : UserCheck} title="当前队列为空" />}</section><ActionDialog open={!!action} action={action?.kind} title={action?.item.organization_name || action?.item.applicant_name || ''} busy={busy} onClose={() => setAction(null)} onConfirm={confirm} /></>;
}
