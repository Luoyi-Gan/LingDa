import { Building2, Check, ExternalLink, UserCheck, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../api';
import { EmptyState, PageIntro, StatusBadge } from '../components/AdminShell';
import { ActionDialog } from '../components/Dialogs';

export default function VerificationsPage({ type }) {
  const isClub = type === 'club';
  const isOfficial = type === 'official';
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => adminApi.verifications({ type, status }).then((res) => setItems(res.list || [])), [type, status]);
  useEffect(() => { load(); }, [load]);
  const confirm = async (note) => { setBusy(true); try { await adminApi.reviewVerification(action.item.request_id, { action: action.kind, note }); setAction(null); await load(); } finally { setBusy(false); } };
  const pageTitle = isOfficial ? '官方机构认证' : isClub ? '社团负责人认证' : '学生身份审核';
  const description = isOfficial ? '核验校级部门或官方机构资质。' : isClub ? '核验社团名称、负责人和证明材料。' : '核验学生学号与在校材料。';
  const openMaterial = async (url) => {
    if (/^https?:\/\//.test(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const preview = window.open('', '_blank');
    try {
      const blob = await adminApi.privateMaterial(url);
      const objectUrl = URL.createObjectURL(blob);
      if (preview) preview.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      if (preview) preview.close();
    }
  };
  return <><PageIntro eyebrow="Identity verification" title={pageTitle} description={description} /><section className="panel table-panel"><div className="panel-heading"><div><h3>{isOfficial ? '官方机构申请' : isClub ? '社团负责人申请' : '学生申请'}</h3><p>处理结果会通过系统消息通知申请人</p></div><div className="segmented">{['pending', 'approved', 'rejected'].map((value) => <button key={value} className={status === value ? 'active' : ''} onClick={() => setStatus(value)}>{({ pending: '待审核', approved: '已通过', rejected: '已驳回' })[value]}</button>)}</div></div>{items.length ? <div className="verification-list">{items.map((item) => <article className="verification-row" key={item.request_id}><div className={`verification-mark ${isClub ? 'club' : ''}`}>{isClub || isOfficial ? <Building2 size={20} /> : <UserCheck size={20} />}</div><div className="verification-copy"><div><h4>{item.organization_name || item.applicant_name}</h4><StatusBadge value={item.status} /></div><p>{item.applicant?.username} · {item.applicant?.college}{item.student_id ? ` · 学号 ${item.student_id}` : ''}</p><span>{item.statement || '申请人未填写补充说明'}</span><div className="material-links">{(item.material_urls || []).map((url, index) => <button type="button" key={url} onClick={() => openMaterial(url)}>材料 {index + 1}<ExternalLink size={13} /></button>)}</div></div>{item.status === 'pending' && <div className="review-actions"><button className="button approve" onClick={() => setAction({ kind: 'approve', item })}><Check size={15} />通过</button><button className="button reject" onClick={() => setAction({ kind: 'reject', item })}><X size={15} />驳回</button></div>}</article>)}</div> : <EmptyState icon={isClub || isOfficial ? Building2 : UserCheck} title="当前队列为空" />}</section><ActionDialog open={!!action} action={action?.kind} title={action?.item.organization_name || action?.item.applicant_name || ''} busy={busy} onClose={() => setAction(null)} onConfirm={confirm} /></>;
}
