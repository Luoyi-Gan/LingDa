import {
  Check,
  ChevronRight,
  EyeOff,
  MessageSquareText,
  RotateCcw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminApi } from '../api';
import AdminDrawer from '../components/AdminDrawer';
import { EmptyState, PageIntro, StatusBadge, Toast } from '../components/AdminShell';

const STATUS_OPTIONS = ['pending', 'published', 'hidden', 'rejected', 'all'];

const NOTE_DEFAULT = {
  approve: '审核通过',
  restore: '已恢复发布',
  reject: '未通过审核：违反平台社区规范',
  hide: '内容已被平台下架',
};

const ACTION_HINT = {
  approve: '通过后内容将对学生可见，处理说明会通知发布者。',
  restore: '恢复后内容将重新对学生可见，处理说明会通知发布者。',
  reject: '驳回后不会出现在学生端，处理说明会通知发布者。',
  hide: '下架后将从学生端移除，处理说明会通知发布者。',
};

function normalizeKind(value) {
  return value === 'comments' ? 'comments' : 'posts';
}

function normalizeStatus(value) {
  return STATUS_OPTIONS.includes(value) ? value : 'pending';
}

export default function ModerationPage() {
  const [params, setParams] = useSearchParams();
  const kind = normalizeKind(params.get('kind'));
  const status = normalizeStatus(params.get('status'));
  const risk = params.get('risk') || '';
  const detailId = params.get('id') || '';

  const [items, setItems] = useState([]);
  const [pendingCounts, setPendingCounts] = useState({ posts: 0, comments: 0 });
  const [detail, setDetail] = useState(null);
  const [detailMissing, setDetailMissing] = useState(false);
  const [note, setNote] = useState(NOTE_DEFAULT.approve);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const syncParams = (next) => {
    const sp = new URLSearchParams(params);
    if (next.kind === 'posts') sp.delete('kind');
    else sp.set('kind', next.kind);
    if (next.status === 'pending') sp.delete('status');
    else sp.set('status', next.status);
    if (next.risk) sp.set('risk', next.risk);
    else sp.delete('risk');
    if (next.id) sp.set('id', String(next.id));
    else if (next.id === null) sp.delete('id');
    setParams(sp, { replace: true, preventScrollReset: true });
  };

  const setKind = (next) => {
    syncParams({ kind: next, status, risk, id: null });
    setDetail(null);
    setDetailMissing(false);
  };
  const setStatus = (next) => {
    syncParams({ kind, status: next, risk: '', id: null });
    setDetail(null);
    setDetailMissing(false);
  };
  const clearRisk = () => syncParams({ kind, status, risk: '', id: detailId || null });

  const openDetail = (item) => {
    const id = kind === 'posts' ? item.post_id : item.comment_id;
    setDetail(item);
    setDetailMissing(false);
    if (item.status === 'pending') setNote(NOTE_DEFAULT.approve);
    else if (item.status === 'published') setNote(NOTE_DEFAULT.hide);
    else setNote(NOTE_DEFAULT.restore);
    syncParams({ kind, status, risk, id });
  };

  const closeDetail = useCallback(() => {
    const sp = new URLSearchParams(params);
    sp.delete('id');
    setParams(sp, { replace: true, preventScrollReset: true });
    setDetail(null);
    setDetailMissing(false);
  }, [params, setParams]);

  const loadList = useCallback(() => {
    const query = { status };
    if (risk) query.risk = risk;
    const req = kind === 'posts' ? adminApi.posts(query) : adminApi.comments(query);
    return Promise.all([req, adminApi.reviewQueue()])
      .then(([res, review]) => {
        setItems(res.list || []);
        setPendingCounts({
          posts: review.posts?.length ?? 0,
          comments: review.comments?.length ?? 0,
        });
      })
      .catch((err) => setToast(err.message || '加载失败'));
  }, [kind, status, risk]);

  const loadDetail = useCallback(() => {
    if (!detailId) return Promise.resolve();
    setDetailMissing(false);
    const req =
      kind === 'posts' ? adminApi.posts({ status: 'all' }) : adminApi.comments({ status: 'all' });
    return req
      .then((res) => {
        const found = (res.list || []).find((row) =>
          kind === 'posts'
            ? String(row.post_id) === String(detailId)
            : String(row.comment_id) === String(detailId),
        );
        if (!found) {
          setDetailMissing(true);
          return;
        }
        setDetail(found);
        if (found.status === 'pending') setNote(NOTE_DEFAULT.approve);
        else if (found.status === 'published') setNote(NOTE_DEFAULT.hide);
        else setNote(NOTE_DEFAULT.restore);
      })
      .catch((err) => setToast(err.message || '加载失败'));
  }, [kind, detailId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      setDetailMissing(false);
      return;
    }
    loadDetail();
  }, [detailId, loadDetail]);

  const review = async (action) => {
    if (!detail || !note.trim()) return;
    setBusy(true);
    try {
      const id = kind === 'posts' ? detail.post_id : detail.comment_id;
      const fn = kind === 'posts' ? adminApi.moderatePost : adminApi.moderateComment;
      await fn(id, { action, note: note.trim() });
      await Promise.all([loadDetail(), loadList()]);
    } catch (err) {
      setToast(err.message || '处理失败');
    } finally {
      setBusy(false);
    }
  };

  const listHint =
    risk === 'high'
      ? `高风险${kind === 'posts' ? '帖子' : '评论'} · ${items.length} 条`
      : status === 'pending'
        ? `待审${kind === 'posts' ? '帖子' : '评论'} · ${items.length} 条`
        : `当前筛选 · ${items.length} 条`;

  const pending = detail?.status === 'pending';
  const published = detail?.status === 'published';
  const settled = detail?.status === 'hidden' || detail?.status === 'rejected';
  const detailTitle = detail
    ? kind === 'posts'
      ? detail.title
      : detail.post?.title || '帖子评论'
    : detailMissing
      ? '未找到内容'
      : '内容详情';

  return (
    <>
      <PageIntro
        eyebrow="Content safety"
        title="内容风控"
        description="点击条目从右侧打开详情；通过、驳回、下架与恢复均在抽屉内操作。"
      />
      <section className="panel table-panel">
        <div className="panel-heading moderation-tools">
          <div>
            <div className="segmented prominent">
              <button className={kind === 'posts' ? 'active' : ''} onClick={() => setKind('posts')}>
                帖子
                {pendingCounts.posts > 0 && (
                  <span className="tab-count">{pendingCounts.posts}</span>
                )}
              </button>
              <button
                className={kind === 'comments' ? 'active' : ''}
                onClick={() => setKind('comments')}
              >
                评论
                {pendingCounts.comments > 0 && (
                  <span className="tab-count">{pendingCounts.comments}</span>
                )}
              </button>
            </div>
            <p className="moderation-hint">{listHint}</p>
          </div>
          <div className="moderation-filters">
            {risk === 'high' && (
              <button type="button" className="filter-chip active" onClick={clearRisk}>
                高风险
                <X size={12} />
              </button>
            )}
            <select
              className="compact-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pending">待审核</option>
              <option value="published">已发布</option>
              <option value="hidden">已下架</option>
              <option value="rejected">已驳回</option>
              <option value="all">全部状态</option>
            </select>
          </div>
        </div>
        {items.length ? (
          <div className="moderation-list">
            {items.map((item) => {
              const id = kind === 'posts' ? item.post_id : item.comment_id;
              const active = String(id) === String(detailId);
              return (
                <button
                  type="button"
                  className={`moderation-row is-clickable ${active ? 'is-active' : ''}`}
                  key={id}
                  onClick={() => openDetail(item)}
                >
                  <div className={`risk-mark risk-${item.risk_level || 'medium'}`}>
                    {kind === 'posts' ? <ShieldAlert size={19} /> : <MessageSquareText size={19} />}
                  </div>
                  <div className="moderation-copy">
                    <div className="moderation-title">
                      <h4>{kind === 'posts' ? item.title : item.post?.title || '帖子评论'}</h4>
                      <StatusBadge value={item.risk_level || 'medium'} />
                      <StatusBadge value={item.status} />
                    </div>
                    <p>
                      {item.author?.username} · {item.author?.college}
                    </p>
                    <span className="moderation-preview">{item.content}</span>
                    {item.review_reason && (
                      <span className="risk-reason">识别原因：{item.review_reason}</span>
                    )}
                  </div>
                  <span className="row-chevron" aria-hidden>
                    <ChevronRight size={18} />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={ShieldAlert} title="当前筛选下没有内容" />
        )}
      </section>

      <AdminDrawer open={!!detailId || !!detail} title={detailTitle} onClose={closeDetail} wide>
        {detailMissing && (
          <EmptyState icon={ShieldAlert} title="未找到该内容" description="可能已被处理或不存在。" />
        )}
        {!detailMissing && !detail && <div className="drawer-loading">正在加载...</div>}
        {detail && (
          <div className="drawer-detail">
            <div className="verification-detail-head drawer-head">
              <div className={`risk-mark large risk-${detail.risk_level || 'medium'}`}>
                {kind === 'posts' ? <ShieldAlert size={22} /> : <MessageSquareText size={22} />}
              </div>
              <div>
                <div className="verification-detail-title">
                  <h3>{detailTitle}</h3>
                  <StatusBadge value={detail.risk_level || 'medium'} />
                  <StatusBadge value={detail.status} />
                </div>
                <p>
                  {detail.author?.username} · {detail.author?.college}
                </p>
              </div>
            </div>

            <dl className="detail-fields drawer-fields">
              <div>
                <dt>类型</dt>
                <dd>{kind === 'posts' ? '帖子' : '评论'}</dd>
              </div>
              <div>
                <dt>风险等级</dt>
                <dd>
                  {({ high: '高风险', medium: '中风险', low: '低风险' })[detail.risk_level] ||
                    detail.risk_level ||
                    '-'}
                </dd>
              </div>
              <div>
                <dt>发布者</dt>
                <dd>{detail.author?.username || '-'}</dd>
              </div>
              <div>
                <dt>学院</dt>
                <dd>{detail.author?.college || '-'}</dd>
              </div>
            </dl>

            {detail.review_reason && (
              <div className="detail-block">
                <h4>风控识别原因</h4>
                <p>{detail.review_reason}</p>
              </div>
            )}

            <div className="detail-block">
              <h4>{kind === 'posts' ? '帖子正文' : '评论内容'}</h4>
              <blockquote className="detail-content">{detail.content}</blockquote>
            </div>

            {kind === 'comments' && detail.post?.title && (
              <div className="detail-block">
                <h4>所属帖子</h4>
                <p>{detail.post.title}</p>
              </div>
            )}

            <div className="drawer-review">
              <h3>审核处理</h3>
              {pending || published || settled ? (
                <>
                  <p className="dialog-hint">
                    {pending
                      ? ACTION_HINT.approve
                      : published
                        ? ACTION_HINT.hide
                        : ACTION_HINT.restore}
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
                    {pending && (
                      <>
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
                          <X size={15} />
                          驳回
                        </button>
                      </>
                    )}
                    {published && (
                      <button
                        type="button"
                        className="button reject"
                        disabled={busy || !note.trim()}
                        onClick={() => review('hide')}
                      >
                        <EyeOff size={15} />
                        下架
                      </button>
                    )}
                    {settled && (
                      <button
                        type="button"
                        className="button approve"
                        disabled={busy || !note.trim()}
                        onClick={() => review('restore')}
                      >
                        <RotateCcw size={15} />
                        恢复发布
                      </button>
                    )}
                  </div>
                  <div className="note-presets">
                    {pending && (
                      <>
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
                      </>
                    )}
                    {published && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setNote(NOTE_DEFAULT.hide)}
                      >
                        填入下架模板
                      </button>
                    )}
                    {settled && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setNote(NOTE_DEFAULT.restore)}
                      >
                        填入恢复模板
                      </button>
                    )}
                  </div>
                  {detail.review_note && (
                    <div className="detail-block settled" style={{ marginTop: 16 }}>
                      <h4>上次处理说明</h4>
                      <p>{detail.review_note}</p>
                    </div>
                  )}
                  {!detail.review_note && detail.review_reason && detail.status !== 'pending' && (
                    <div className="detail-block settled" style={{ marginTop: 16 }}>
                      <h4>上次处理说明</h4>
                      <p>{detail.review_reason}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="detail-block settled">
                  <p>当前状态暂无可执行操作。</p>
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

export function ModerationDetailRedirect() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const parts = window.location.pathname.split('/').filter(Boolean);
  // /moderation/:kind/:contentId
  const kind = parts[1];
  const id = parts[2];

  useEffect(() => {
    const sp = new URLSearchParams(params);
    if (kind === 'comments') sp.set('kind', 'comments');
    else sp.delete('kind');
    if (id) sp.set('id', id);
    navigate(`/moderation?${sp.toString()}`, { replace: true });
  }, [navigate, params, kind, id]);

  return <div className="loading-panel">正在打开详情...</div>;
}
