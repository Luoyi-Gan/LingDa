import { BadgeCheck, Building2, Check, ChevronRight, ExternalLink, UserCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminApi } from '../api';
import AdminDrawer from '../components/AdminDrawer';
import { EmptyState, PageIntro, StatusBadge, Toast } from '../components/AdminShell';

const TYPE_TABS = [
  { value: 'all', label: '全部类型' },
  { value: 'student', label: '学生' },
  { value: 'club', label: '社团' },
  { value: 'official', label: '官方' },
];

const TYPE_META = {
  student: { label: '学生认证', icon: UserCheck, mark: '' },
  club: { label: '社团认证', icon: Building2, mark: 'club' },
  official: { label: '官方认证', icon: BadgeCheck, mark: 'official' },
};

const STATUS_OPTIONS = ['pending', 'approved', 'rejected'];
const NOTE_DEFAULT = {
  approve: '审核通过',
  reject: '未通过审核：材料不完整或信息不符',
};

function normalizeType(value) {
  return TYPE_TABS.some((tab) => tab.value === value) ? value : 'all';
}

function normalizeStatus(value) {
  return STATUS_OPTIONS.includes(value) ? value : 'pending';
}

async function openMaterial(url, setToast) {
  if (!url) {
    setToast('没有可打开的材料');
    return;
  }
  if (/^https?:\/\//.test(url)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    const blob = await adminApi.privateMaterial(url);
    const objectUrl = URL.createObjectURL(blob);
    const preview = window.open(objectUrl, '_blank', 'noopener,noreferrer');
    if (!preview) setToast('浏览器拦截了弹窗，请允许后重试');
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (err) {
    setToast(err.message || '材料打开失败，请检查权限或网络');
  }
}

export default function VerificationsPage() {
  const [params, setParams] = useSearchParams();
  const type = normalizeType(params.get('type'));
  const status = normalizeStatus(params.get('status'));
  const detailId = params.get('id') || '';

  const [items, setItems] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailMissing, setDetailMissing] = useState(false);
  const [note, setNote] = useState(NOTE_DEFAULT.approve);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const setType = (next) => {
    const sp = new URLSearchParams(params);
    if (next === 'all') sp.delete('type');
    else sp.set('type', next);
    sp.delete('id');
    setParams(sp, { replace: true, preventScrollReset: true });
    setDetail(null);
    setDetailMissing(false);
  };

  const setStatus = (next) => {
    const sp = new URLSearchParams(params);
    if (next === 'pending') sp.delete('status');
    else sp.set('status', next);
    sp.delete('id');
    setParams(sp, { replace: true, preventScrollReset: true });
    setDetail(null);
    setDetailMissing(false);
  };

  const openDetail = (item) => {
    setDetail(item);
    setDetailMissing(false);
    setNote(item.status === 'rejected' ? NOTE_DEFAULT.reject : NOTE_DEFAULT.approve);
    const sp = new URLSearchParams(params);
    sp.set('id', String(item.request_id));
    setParams(sp, { replace: true, preventScrollReset: true });
  };

  const closeDetail = useCallback(() => {
    const sp = new URLSearchParams(params);
    sp.delete('id');
    setParams(sp, { replace: true, preventScrollReset: true });
    setDetail(null);
    setDetailMissing(false);
  }, [params, setParams]);

  const loadList = useCallback(
    () =>
      adminApi
        .verifications({ type, status })
        .then((res) => setItems(res.list || []))
        .catch((err) => setToast(err.message || '加载失败')),
    [type, status],
  );

  const loadDetail = useCallback(() => {
    if (!detailId) return Promise.resolve();
    setDetailMissing(false);
    return adminApi
      .verifications({ type: 'all', status: 'all' })
      .then((res) => {
        const found = (res.list || []).find((row) => String(row.request_id) === String(detailId));
        if (!found) {
          setDetailMissing(true);
          return;
        }
        setDetail(found);
        setNote(found.status === 'rejected' ? NOTE_DEFAULT.reject : NOTE_DEFAULT.approve);
      })
      .catch((err) => setToast(err.message || '加载失败'));
  }, [detailId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      setDetailMissing(false);
      return;
    }
    // 列表点击已写入 detail 时，仅静默刷新；深链进入时再拉取
    setDetail((current) => {
      if (current && String(current.request_id) === String(detailId)) return current;
      return current;
    });
    loadDetail();
  }, [detailId, loadDetail]);

  const review = async (action) => {
    if (!detail || !note.trim()) return;
    setBusy(true);
    try {
      await adminApi.reviewVerification(detail.request_id, {
        action,
        note: note.trim(),
      });
      await Promise.all([loadDetail(), loadList()]);
    } catch (err) {
      setToast(err.message || '处理失败');
    } finally {
      setBusy(false);
    }
  };

  const meta = detail ? TYPE_META[detail.type] || TYPE_META.student : null;
  const DetailIcon = meta?.icon;
  const pending = detail?.status === 'pending';

  return (
    <>
      <PageIntro
        eyebrow="Identity verification"
        title="认证审核"
        description="点击申请从右侧打开详情；通过与驳回在抽屉内操作。"
      />
      <section className="panel table-panel">
        <div className="panel-heading verification-tools">
          <div>
            <h3>认证申请</h3>
            <p>
              {type === 'all' ? '全部类型' : TYPE_META[type]?.label}
              {' · '}
              当前 {items.length} 条
            </p>
          </div>
          <div className="verification-filters">
            <div className="segmented prominent">
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={type === tab.value ? 'active' : ''}
                  onClick={() => setType(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="segmented">
              {STATUS_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={status === value ? 'active' : ''}
                  onClick={() => setStatus(value)}
                >
                  {({ pending: '待审核', approved: '已通过', rejected: '已驳回' })[value]}
                </button>
              ))}
            </div>
          </div>
        </div>
        {items.length ? (
          <div className="verification-list">
            {items.map((item) => {
              const itemMeta = TYPE_META[item.type] || TYPE_META.student;
              const Icon = itemMeta.icon;
              const active = String(item.request_id) === String(detailId);
              return (
                <button
                  type="button"
                  className={`verification-row is-clickable ${active ? 'is-active' : ''}`}
                  key={item.request_id}
                  onClick={() => openDetail(item)}
                >
                  <div className={`verification-mark ${itemMeta.mark}`}>
                    <Icon size={20} />
                  </div>
                  <div className="verification-copy">
                    <div>
                      <h4>{item.organization_name || item.applicant_name}</h4>
                      <StatusBadge value={item.type} />
                      <StatusBadge value={item.status} />
                    </div>
                    <p>
                      {item.applicant?.username} · {item.applicant?.college}
                      {item.student_id ? ` · 学号 ${item.student_id}` : ''}
                    </p>
                    <span className="verification-preview">
                      {item.statement || '申请人未填写补充说明'}
                    </span>
                  </div>
                  <span className="row-chevron" aria-hidden>
                    <ChevronRight size={18} />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={BadgeCheck} title="当前筛选下没有申请" />
        )}
      </section>

      <AdminDrawer
        open={!!detailId || !!detail}
        title={
          detail
            ? detail.organization_name || detail.applicant_name
            : detailMissing
              ? '未找到申请'
              : '认证详情'
        }
        onClose={closeDetail}
      >
        {detailMissing && (
          <EmptyState icon={BadgeCheck} title="未找到该申请" description="可能已被处理或不存在。" />
        )}
        {!detailMissing && !detail && <div className="drawer-loading">正在加载...</div>}
        {detail && meta && DetailIcon && (
          <div className="drawer-detail">
            <div className="verification-detail-head drawer-head">
              <div className={`verification-mark large ${meta.mark}`}>
                <DetailIcon size={22} />
              </div>
              <div>
                <div className="verification-detail-title">
                  <h3>{detail.organization_name || detail.applicant_name}</h3>
                  <StatusBadge value={detail.type} />
                  <StatusBadge value={detail.status} />
                </div>
                <p>
                  {detail.applicant?.username} · {detail.applicant?.college}
                  {detail.student_id ? ` · 学号 ${detail.student_id}` : ''}
                </p>
              </div>
            </div>

            <dl className="detail-fields drawer-fields">
              <div>
                <dt>申请人</dt>
                <dd>{detail.applicant_name || detail.applicant?.username || '-'}</dd>
              </div>
              {detail.organization_name && (
                <div>
                  <dt>组织名称</dt>
                  <dd>{detail.organization_name}</dd>
                </div>
              )}
              {detail.student_id && (
                <div>
                  <dt>学号</dt>
                  <dd>{detail.student_id}</dd>
                </div>
              )}
              <div>
                <dt>学院</dt>
                <dd>{detail.applicant?.college || '-'}</dd>
              </div>
            </dl>

            <div className="detail-block">
              <h4>申请说明</h4>
              <p>{detail.statement || '申请人未填写补充说明'}</p>
            </div>

            <div className="detail-block">
              <h4>证明材料</h4>
              <div className="material-links">
                {(detail.material_urls || []).length === 0 ? (
                  <small className="muted-hint">未上传材料</small>
                ) : (
                  (detail.material_urls || []).map((url, index) => (
                    <button
                      type="button"
                      key={`${url}-${index}`}
                      onClick={() => openMaterial(url, setToast)}
                    >
                      材料 {index + 1}
                      <ExternalLink size={13} />
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="drawer-review">
              <h3>审核处理</h3>
              {pending ? (
                <>
                  <p className="dialog-hint">
                    处理说明会通过系统消息通知申请人，请写清通过或驳回的理由。
                  </p>
                  <label className="field">
                    <span>处理说明</span>
                    <textarea
                      rows="5"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="填写审核理由"
                    />
                  </label>
                  <div className="review-actions detail-actions">
                    <button
                      type="button"
                      className="button approve"
                      disabled={busy || !note.trim()}
                      onClick={() => review('approve')}
                    >
                      <Check size={15} />
                      通过
                    </button>
                    <button
                      type="button"
                      className="button reject"
                      disabled={busy || !note.trim()}
                      onClick={() => review('reject')}
                    >
                      驳回
                    </button>
                  </div>
                  <div className="note-presets">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setNote(NOTE_DEFAULT.approve)}
                    >
                      填入通过模板
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setNote(NOTE_DEFAULT.reject)}
                    >
                      填入驳回模板
                    </button>
                  </div>
                </>
              ) : (
                <div className="detail-block settled">
                  <p>该申请已{detail.status === 'approved' ? '通过' : '驳回'}，无需再次处理。</p>
                  {detail.review_note && (
                    <>
                      <h4>处理说明</h4>
                      <p>{detail.review_note}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminDrawer>

      <Toast message={toast} onDone={() => setToast('')} />
    </>
  );
}

/** 旧详情路由 → 带 id 的列表页 */
export function VerificationDetailRedirect() {
  const [params] = useSearchParams();
  const id = window.location.pathname.split('/').pop();
  const qs = new URLSearchParams(params);
  if (id) qs.set('id', id);
  return <NavigateCompat to={`/verifications?${qs.toString()}`} />;
}

function NavigateCompat({ to }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);
  return <div className="loading-panel">正在打开详情...</div>;
}
