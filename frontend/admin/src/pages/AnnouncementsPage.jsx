import { Edit3, EyeOff, Flag, Megaphone, Plus, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi, mediaUrl } from '../api';
import { EmptyState, PageIntro, StatusBadge, Toast } from '../components/AdminShell';
import { AnnouncementDialog } from '../components/Dialogs';

export default function AnnouncementsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'milestones' ? 'milestones' : 'all';
  const statusFilter = params.get('status') || 'all';
  const milestones = tab === 'milestones';

  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(
    () =>
      adminApi
        .announcements({ status: statusFilter })
        .then((res) => setItems(res.list || []))
        .catch((err) => setToast(err.message || '加载失败')),
    [statusFilter],
  );
  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (milestones ? items.filter((item) => item.is_pinned) : items),
    [items, milestones],
  );

  const setTab = (next) => {
    const sp = new URLSearchParams(params);
    if (next === 'milestones') sp.set('tab', 'milestones');
    else sp.delete('tab');
    setParams(sp, { replace: true });
  };

  const setStatusFilter = (next) => {
    const sp = new URLSearchParams(params);
    if (next === 'all') sp.delete('status');
    else sp.set('status', next);
    setParams(sp, { replace: true });
  };

  const openEditor = (item = null) => {
    setEditing(item);
    setDialogOpen(true);
  };

  const submit = async (form) => {
    setBusy(true);
    try {
      const payload = milestones ? { ...form, isPinned: true } : form;
      if (editing) await adminApi.updateAnnouncement(editing.announcement_id, payload);
      else await adminApi.createAnnouncement(payload);
      setDialogOpen(false);
      await load();
    } catch (err) {
      setToast(err.message || '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (item, status) => {
    if (status === 'hidden' && item.is_pinned) {
      const ok = window.confirm('下架后将移出学生端时间轴（取消置顶）。确定继续？');
      if (!ok) return;
    }
    if (status === 'published' && milestones && !item.is_pinned) {
      const restorePin = window.confirm('重新发布时是否同时恢复为关键节点（置顶）？');
      try {
        await adminApi.updateAnnouncement(item.announcement_id, {
          status,
          isPinned: restorePin,
        });
        await load();
      } catch (err) {
        setToast(err.message || '操作失败');
      }
      return;
    }
    try {
      await adminApi.updateAnnouncement(item.announcement_id, { status });
      await load();
    } catch (err) {
      setToast(err.message || '操作失败');
    }
  };

  return (
    <>
      <PageIntro
        eyebrow="Campus announcements"
        title="公告管理"
        description="统一管理学生端校园公告；勾选置顶即出现在时间轴关键节点。"
        action={
          <button className="button primary" onClick={() => openEditor()}>
            <Plus size={16} />
            {milestones ? '新建关键节点' : '发布公告'}
          </button>
        }
      />
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h3>{milestones ? '时间轴关键节点' : '全部公告'}</h3>
            <p>
              {milestones
                ? '仅显示已置顶的公告；与「全部公告」是同一批数据'
                : statusFilter === 'published'
                  ? `已发布 ${visible.length} 条 · 与学生端可见数量一致`
                  : `共 ${visible.length} 条 · 置顶条目会同步到时间轴`}
            </p>
          </div>
          <div className="announcement-filters">
            {!milestones && (
              <div className="segmented">
                {[
                  { value: 'all', label: '全部' },
                  { value: 'published', label: '已发布' },
                  { value: 'draft', label: '草稿' },
                  { value: 'hidden', label: '已下架' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={statusFilter === opt.value ? 'active' : ''}
                    onClick={() => setStatusFilter(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <div className="segmented prominent">
            <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
              全部公告
            </button>
            <button
              className={tab === 'milestones' ? 'active' : ''}
              onClick={() => setTab('milestones')}
            >
              关键节点
            </button>
          </div>
          </div>
        </div>
        {visible.length ? (
          <div className="data-table">
            <div className="table-row table-head">
              <span>{milestones ? '节点信息' : '公告信息'}</span>
              <span>分类</span>
              <span>状态</span>
              <span>{milestones ? '节点时间' : '发布时间'}</span>
              <span>操作</span>
            </div>
            {visible.map((item) => (
              <div className="table-row" key={item.announcement_id}>
                <div className="primary-cell">
                  {item.cover_url ? (
                    <img className="announcement-thumb" src={mediaUrl(item.cover_url)} alt="" />
                  ) : (
                    <span className={`announcement-icon ${item.is_pinned ? 'pinned' : ''}`}>
                      {item.is_pinned ? <Flag size={17} /> : <Megaphone size={17} />}
                    </span>
                  )}
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.summary || item.content}</small>
                  </span>
                </div>
                <span>{categoryLabel(item.category)}</span>
                <span>
                  <StatusBadge value={item.status} />
                  {item.is_pinned && !milestones && (
                    <span className="inline-pin">置顶</span>
                  )}
                </span>
                <span>{formatDate(item.published_at || item.create_time)}</span>
                <div className="row-actions">
                  <button className="icon-button" title="编辑" onClick={() => openEditor(item)}>
                    <Edit3 size={16} />
                  </button>
                  {item.status === 'published' ? (
                    <button
                      className="icon-button danger-ink"
                      title="下架"
                      onClick={() => changeStatus(item, 'hidden')}
                    >
                      <EyeOff size={16} />
                    </button>
                  ) : (
                    <button
                      className="icon-button success-ink"
                      title="重新发布"
                      onClick={() => changeStatus(item, 'published')}
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={milestones ? Flag : Megaphone}
            title={milestones ? '暂无关键节点' : '暂无公告'}
            description={
              milestones
                ? '在编辑公告时勾选「设为关键节点并置顶」，或点右上角新建。'
                : '点击右上角发布第一条校园公告。'
            }
          />
        )}
      </section>
      <AnnouncementDialog
        open={dialogOpen}
        item={editing}
        milestones={milestones}
        busy={busy}
        onClose={() => setDialogOpen(false)}
        onSubmit={submit}
      />
      <Toast message={toast} onDone={() => setToast('')} />
    </>
  );
}

function categoryLabel(value) {
  return (
    ({ platform: '平台通知', academic: '教务安排', service: '校园服务', club: '社团活动' })[value] ||
    value
  );
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '-';
}
