import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Bot,
  FileCheck2,
  Megaphone,
  MessageSquareText,
  ShieldAlert,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
import { EmptyState, PageIntro, StatusBadge, Toast } from '../components/AdminShell';

const RISK_ORDER = { high: 0, medium: 1, low: 2 };

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [queue, setQueue] = useState({ posts: [], comments: [], verifications: [] });
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    Promise.all([adminApi.overview(), adminApi.reviewQueue()])
      .then(([overview, review]) => {
        setData(overview);
        setQueue({
          posts: review.posts || [],
          comments: review.comments || [],
          verifications: review.verifications || [],
        });
      })
      .catch((err) => setToast(err.message || '加载失败'));
  }, []);

  useEffect(() => {
    if (location.pathname === '/overview') load();
  }, [location.pathname, load]);

  if (!data) {
    return (
      <>
        <div className="loading-panel">正在汇总运营数据...</div>
        <Toast message={toast} onDone={() => setToast('')} />
      </>
    );
  }

  const contentPending = (data.pending_posts || 0) + (data.pending_comments || 0);
  const verifyPending = data.pending_verifications ?? 0;
  const cards = [
    {
      label: '内容待审',
      value: contentPending,
      hint: `帖子 ${data.pending_posts || 0} · 评论 ${data.pending_comments || 0}`,
      icon: FileCheck2,
      tone: 'blue',
      go: '/moderation?status=pending',
    },
    {
      label: '认证待审',
      value: verifyPending,
      hint: '学生 / 社团 / 官方',
      icon: BadgeCheck,
      tone: 'slate',
      go: '/verifications?status=pending',
    },
    {
      label: '高风险待审帖',
      value: data.high_risk,
      hint:
        data.high_risk_comments > 0
          ? `帖子 ${data.high_risk} · 评论 ${data.high_risk_comments}`
          : '优先检查帖子',
      icon: ShieldAlert,
      tone: 'red',
      go: '/moderation?kind=posts&status=pending&risk=high',
    },
    {
      label: '已发布公告',
      value: data.published_announcements,
      hint: '学生端可见',
      icon: Megaphone,
      tone: 'green',
      go: '/announcements?status=published',
    },
  ];

  const contentAll = [
    ...queue.posts.map((item) => ({
      kind: '帖子',
      title: item.title,
      author: item.author?.username,
      risk: item.risk_level,
      reason: item.review_reason,
      go: `/moderation?kind=posts&id=${item.post_id}`,
    })),
    ...queue.comments.map((item) => ({
      kind: '评论',
      title: item.post?.title || '评论',
      author: item.author?.username,
      risk: item.risk_level,
      reason: item.review_reason,
      go: `/moderation?kind=comments&id=${item.comment_id}`,
    })),
  ].sort((a, b) => (RISK_ORDER[a.risk] ?? 9) - (RISK_ORDER[b.risk] ?? 9));
  const contentQueue = contentAll.slice(0, 3);
  const contentMore = Math.max(0, contentAll.length - 3);

  const verifyAll = queue.verifications.map((item) => ({
    kind: verifyKind(item.type),
    title: item.organization_name || item.applicant_name || '认证申请',
    author: item.applicant?.username,
    reason: item.statement || '身份材料待核验',
    go: `/verifications?id=${item.request_id}`,
    type: item.type,
  }));
  const verifyQueue = verifyAll.slice(0, 3);
  const verifyMore = Math.max(0, verifyAll.length - 3);

  return (
    <>
      <PageIntro
        eyebrow="Operations overview"
        title="社区运营总览"
        description="内容风控、身份认证与校园公告分栏查看，避免口径混淆。"
        action={
          <button className="button primary" onClick={() => navigate('/announcements')}>
            <Megaphone size={16} />
            发布公告
          </button>
        }
      />
      <section className="metric-grid">
        {cards.map(({ label, value, hint, icon: Icon, tone, go }) => (
          <button
            type="button"
            className={`metric-card tone-${tone} metric-click`}
            key={label}
            onClick={() => navigate(go)}
          >
            <div className="metric-head">
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>{value}</strong>
            <small>{hint}</small>
          </button>
        ))}
      </section>
      <section className="dashboard-grid">
        <div className="dashboard-queues">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h3>内容风控待办</h3>
                <p>
                  帖子 {data.pending_posts || 0} · 评论 {data.pending_comments || 0}
                </p>
              </div>
              <PanelMoreLink
                total={contentAll.length}
                more={contentMore}
                onClick={() => navigate('/moderation?status=pending')}
              />
            </div>
            {contentQueue.length ? (
              <div className="queue-list">
                {contentQueue.map((item, index) => (
                  <button
                    className="queue-row"
                    key={`content-${item.kind}-${index}`}
                    onClick={() => navigate(item.go)}
                  >
                    <span className={`kind-icon ${item.kind === '评论' ? 'comment' : 'post'}`}>
                      {item.kind === '评论' ? (
                        <MessageSquareText size={16} />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                    </span>
                    <span className="queue-copy">
                      <strong>
                        [{item.kind}] {item.title}
                      </strong>
                      <small>
                        {item.author || '未知'} · {item.reason || '需人工复核'}
                      </small>
                    </span>
                    <StatusBadge value={item.risk || 'medium'} />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ShieldAlert}
                title="内容队列为空"
                description="当前没有待审帖子或评论。"
              />
            )}
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <h3>认证审核待办</h3>
                <p>学生、社团与官方身份材料核验</p>
              </div>
              <PanelMoreLink
                total={verifyAll.length}
                more={verifyMore}
                onClick={() => navigate('/verifications?status=pending')}
              />
            </div>
            {verifyQueue.length ? (
              <div className="queue-list">
                {verifyQueue.map((item, index) => (
                  <button
                    className="queue-row"
                    key={`verify-${item.type}-${index}`}
                    onClick={() => navigate(item.go)}
                  >
                    <span className={`kind-icon verify ${item.type || ''}`}>
                      <BadgeCheck size={16} />
                    </span>
                    <span className="queue-copy">
                      <strong>
                        [{item.kind}] {item.title}
                      </strong>
                      <small>
                        {item.author || '未知'} · {item.reason}
                      </small>
                    </span>
                    <StatusBadge value={item.type || 'pending'} />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BadgeCheck}
                title="认证队列为空"
                description="当前没有待审身份认证申请。"
              />
            )}
          </div>
        </div>

        <aside className="panel policy-panel">
          <div className="policy-icon">
            <Bot size={22} />
          </div>
          <h3>审核策略说明</h3>
          <p>
            低风险内容可自动发布；命中高危、交易、联系方式等规则时进入人工审核。审核类处置会通过系统消息通知申请人/发布者；公告上下架仅影响学生端列表展示，不会群发推送。
          </p>
          <dl>
            <div>
              <dt>社区用户</dt>
              <dd>{data.total_users}</dd>
            </div>
            <div>
              <dt>内容待审</dt>
              <dd>{contentPending}</dd>
            </div>
            <div>
              <dt>认证待审</dt>
              <dd>{verifyPending}</dd>
            </div>
            <div>
              <dt>已下架帖</dt>
              <dd>{data.hidden_content}</dd>
            </div>
          </dl>
        </aside>
      </section>
      <Toast message={toast} onDone={() => setToast('')} />
    </>
  );
}

function verifyKind(type) {
  return ({ student: '学生认证', club: '社团认证', official: '官方认证' })[type] || '认证';
}

function verifyPath(type) {
  const tab = ({ student: 'student', club: 'club', official: 'official' })[type];
  return tab ? `/verifications?type=${tab}&status=pending` : '/verifications?status=pending';
}

function PanelMoreLink({ total, more, onClick }) {
  if (!total) return null;
  const label = more > 0 ? `还有 ${more} 条` : `共 ${total} 条`;

  return (
    <button type="button" className="panel-more-link" onClick={onClick} aria-label={`查看全部，${label}`}>
      <span className="more-count">{label}</span>
      <ArrowUpRight size={15} />
    </button>
  );
}
