import { Check, ImagePlus, LoaderCircle, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { adminApi, mediaUrl } from '../api';

export function ActionDialog({ open, action, title, onClose, onConfirm, busy }) {
  const [note, setNote] = useState('');
  useEffect(() => { if (open) setNote(action === 'approve' || action === 'restore' ? '审核通过' : '违反平台社区规范'); }, [open, action]);
  if (!open) return null;
  const positive = action === 'approve' || action === 'restore';
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="action-title"><div className="dialog-heading"><div className={`dialog-icon ${positive ? 'positive' : 'negative'}`}>{positive ? <Check size={20} /> : <X size={20} />}</div><div><h3 id="action-title">{positive ? '确认通过' : action === 'hide' ? '确认下架' : '确认驳回'}</h3><p>{title}</p></div><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button></div><label className="field"><span>处理说明</span><textarea rows="4" value={note} onChange={(e) => setNote(e.target.value)} placeholder="该说明会通过系统通知发送给用户" /></label><div className="dialog-actions"><button className="button secondary" onClick={onClose}>取消</button><button className={`button ${positive ? 'primary' : 'danger'}`} disabled={busy || !note.trim()} onClick={() => onConfirm(note.trim())}>{busy ? '处理中...' : '确认处理'}</button></div></section></div>;
}

const EMPTY = { category: 'platform', title: '', summary: '', content: '', coverUrl: '', isPinned: false, timelineAt: '' };

function toDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function AnnouncementDialog({ open, item, milestones, onClose, onSubmit, busy }) {
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    setForm(item ? {
      category: item.category || 'platform', title: item.title || '', summary: item.summary || '',
      content: item.content || '', coverUrl: item.cover_url || '', isPinned: item.is_pinned || false,
      timelineAt: toDateTimeInput(item.published_at || item.create_time),
    } : { ...EMPTY, category: milestones ? 'academic' : 'platform', isPinned: !!milestones,
      timelineAt: milestones ? toDateTimeInput(new Date()) : '' });
  }, [open, item, milestones]);
  if (!open) return null;
  const update = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setUploadError('仅支持 JPG、PNG、WebP 或 GIF 图片');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('单张图片不能超过 8MB');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const result = await adminApi.uploadImages([file]);
      setForm((old) => ({ ...old, coverUrl: result.files?.[0]?.path || '' }));
    } catch (error) {
      setUploadError(error.message || '图片上传失败');
    } finally {
      setUploading(false);
    }
  };
  const valid = form.title.trim().length >= 2 && form.content.trim().length >= 5 && (!milestones || form.timelineAt);
  const coverValue = form.coverUrl;
  const coverPayload = coverValue || (item?.cover_url ? null : undefined);
  const submitPayload = () => onSubmit({
    ...form,
    coverUrl: coverPayload,
    timelineAt: form.timelineAt ? new Date(form.timelineAt).toISOString() : undefined,
  });
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="dialog-panel dialog-wide" role="dialog" aria-modal="true">
        <div className="dialog-heading">
          <div>
            <h3>{item ? '编辑公告' : milestones ? '新建关键节点' : '发布公告'}</h3>
            <p>{milestones ? '节点时间和内容会同步到学生端时间轴。' : '发布后会展示在学生端校园公告。'}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭"><X size={18} /></button>
        </div>
        <div className="form-grid">
          <label className="field"><span>分类</span><select value={form.category} onChange={update('category')}><option value="platform">平台通知</option><option value="academic">教务安排</option><option value="service">校园服务</option><option value="club">社团活动</option></select></label>
          <label className="field"><span>{milestones ? '节点时间' : '发布时间'}</span><input type="datetime-local" value={form.timelineAt} onChange={update('timelineAt')} /></label>
          <label className="field full check-field"><input type="checkbox" checked={form.isPinned} onChange={update('isPinned')} /><span>设为关键节点并置顶</span></label>
          <label className="field full"><span>标题</span><input value={form.title} onChange={update('title')} maxLength="150" placeholder="请输入明确、可扫描的公告标题" /></label>
          <label className="field full"><span>摘要</span><input value={form.summary} onChange={update('summary')} maxLength="300" placeholder="用于公告列表的简短说明" /></label>
          <label className="field full"><span>正文</span><textarea rows="8" value={form.content} onChange={update('content')} maxLength="20000" placeholder="填写完整通知内容、对象和相关安排" /></label>
          <div className="field full">
            <span>公告封面（选填）</span>
            {coverValue ? (
              <div className="admin-cover-preview"><img src={mediaUrl(coverValue)} alt="公告封面预览" /><button type="button" className="icon-button danger-ink" onClick={() => setForm((old) => ({ ...old, coverUrl: '' }))} title="移除封面" aria-label="移除封面"><Trash2 size={16} /></button></div>
            ) : (
              <button type="button" className="upload-dropzone" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? <LoaderCircle size={20} className="spin" /> : <ImagePlus size={20} />}<strong>{uploading ? '正在上传' : '选择本地图片'}</strong><small>JPG、PNG、WebP、GIF，最大 8MB</small></button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="visually-hidden" onChange={uploadCover} />
            {uploadError && <small className="upload-error">{uploadError}</small>}
          </div>
        </div>
        <div className="dialog-actions"><button className="button secondary" onClick={onClose}>取消</button><button className="button primary" disabled={!valid || busy || uploading} onClick={submitPayload}>{busy ? '保存中...' : uploading ? '图片上传中...' : item ? '保存修改' : '立即发布'}</button></div>
      </section>
    </div>
  );
}
