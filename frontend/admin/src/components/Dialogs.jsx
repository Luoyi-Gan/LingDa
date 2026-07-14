import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ActionDialog({ open, action, title, onClose, onConfirm, busy }) {
  const [note, setNote] = useState('');
  useEffect(() => { if (open) setNote(action === 'approve' || action === 'restore' ? '审核通过' : '违反平台社区规范'); }, [open, action]);
  if (!open) return null;
  const positive = action === 'approve' || action === 'restore';
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="action-title"><div className="dialog-heading"><div className={`dialog-icon ${positive ? 'positive' : 'negative'}`}>{positive ? <Check size={20} /> : <X size={20} />}</div><div><h3 id="action-title">{positive ? '确认通过' : action === 'hide' ? '确认下架' : '确认驳回'}</h3><p>{title}</p></div><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><label className="field"><span>处理说明</span><textarea rows="4" value={note} onChange={(e) => setNote(e.target.value)} placeholder="该说明会通过系统通知发送给用户" /></label><div className="dialog-actions"><button className="button secondary" onClick={onClose}>取消</button><button className={`button ${positive ? 'primary' : 'danger'}`} disabled={busy || !note.trim()} onClick={() => onConfirm(note.trim())}>{busy ? '处理中...' : '确认处理'}</button></div></section></div>;
}

const EMPTY = { category: 'platform', title: '', summary: '', content: '', coverUrl: '', isPinned: false };

export function AnnouncementDialog({ open, item, milestones, onClose, onSubmit, busy }) {
  const [form, setForm] = useState(EMPTY);
  useEffect(() => {
    if (!open) return;
    setForm(item ? {
      category: item.category || 'platform', title: item.title || '', summary: item.summary || '',
      content: item.content || '', coverUrl: item.cover_url || '', isPinned: item.is_pinned || false,
    } : { ...EMPTY, category: milestones ? 'academic' : 'platform', isPinned: !!milestones });
  }, [open, item, milestones]);
  if (!open) return null;
  const update = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const valid = form.title.trim().length >= 2 && form.content.trim().length >= 5;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="dialog-panel dialog-wide" role="dialog" aria-modal="true"><div className="dialog-heading"><div><h3>{item ? '编辑公告' : milestones ? '新建关键节点' : '发布公告'}</h3><p>发布后会展示在学生端校园公告时间轴。</p></div><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><div className="form-grid"><label className="field"><span>分类</span><select value={form.category} onChange={update('category')}><option value="platform">平台通知</option><option value="academic">教务安排</option><option value="service">校园服务</option><option value="club">社团活动</option></select></label><label className="field check-field"><input type="checkbox" checked={form.isPinned} onChange={update('isPinned')} /><span>设为关键节点并置顶</span></label><label className="field full"><span>标题</span><input value={form.title} onChange={update('title')} maxLength="150" placeholder="请输入明确、可扫描的公告标题" /></label><label className="field full"><span>摘要</span><input value={form.summary} onChange={update('summary')} maxLength="300" placeholder="用于公告列表的简短说明" /></label><label className="field full"><span>正文</span><textarea rows="8" value={form.content} onChange={update('content')} maxLength="20000" placeholder="填写完整通知内容、对象和相关安排" /></label><label className="field full"><span>封面图片 URL（选填）</span><input value={form.coverUrl} onChange={update('coverUrl')} placeholder="https://..." /></label></div><div className="dialog-actions"><button className="button secondary" onClick={onClose}>取消</button><button className="button primary" disabled={!valid || busy} onClick={() => onSubmit({ ...form, coverUrl: form.coverUrl || undefined })}>{busy ? '保存中...' : item ? '保存修改' : '立即发布'}</button></div></section></div>;
}
