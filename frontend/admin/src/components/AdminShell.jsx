import {
  BadgeCheck,
  BookOpenCheck,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ConfirmDialog } from './Dialogs';

const NAV = [
  { path: '/overview', label: '工作台', desc: '运营总览', icon: LayoutDashboard },
  { path: '/announcements', label: '公告管理', desc: '公告与时间轴节点', icon: Megaphone },
  { path: '/verifications', label: '认证审核', desc: '学生 / 社团 / 官方', icon: BadgeCheck },
  { path: '/moderation', label: '内容风控', desc: '帖子与评论', icon: ShieldCheck },
];

const TITLES = Object.fromEntries(NAV.map((item) => [item.path, item.label]));

export default function AdminShell({ user, onLogout, children }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const devPreview = user?.user_id === 'ADMINPREVIEW';

  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${open ? 'is-open' : ''}`}>
        <div className="brand-row">
          <span className="brand-mark">灵</span>
          <div>
            <strong>灵搭管理中心</strong>
            <span>LINGDA ADMIN</span>
          </div>
          <button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="关闭菜单">
            <X size={18} />
          </button>
        </div>
        <nav className="admin-nav" aria-label="管理导航">
          {NAV.map(({ path, label, desc, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={({ isActive }) => {
                const onBranch =
                  (path === '/verifications' &&
                    location.pathname.startsWith('/verifications')) ||
                  (path === '/moderation' && location.pathname.startsWith('/moderation'));
                return `nav-item ${isActive || onBranch ? 'active' : ''}`;
              }}
            >
              <Icon size={18} />
              <span>
                <strong>{label}</strong>
                <small>{desc}</small>
              </span>
              <ChevronRight size={14} />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-policy">
          <BookOpenCheck size={17} />
          <div>
            <strong>审核策略说明</strong>
            <span>低风险可自动放行；高危、交易、联系方式等进入人工队列</span>
          </div>
        </div>
        <div className="account-row">
          <span className="account-avatar">{(user.username || '管').slice(0, 1)}</span>
          <span>
            <strong>{user.username}</strong>
            <small>{devPreview ? '开发预览账号' : '管理员账号'}</small>
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setLogoutOpen(true)}
            aria-label="退出登录"
            title="退出登录"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      {open && <button className="sidebar-scrim" aria-label="关闭菜单" onClick={() => setOpen(false)} />}
      <section className="admin-workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="打开菜单">
              <Menu size={19} />
            </button>
            <h1>{TITLES[location.pathname] || '管理中心'}</h1>
          </div>
          <div className="topbar-actions">
            {devPreview && <span className="preview-pill">开发预览</span>}
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </section>
      <ConfirmDialog
        open={logoutOpen}
        title="退出登录？"
        description="退出后需重新登录才能进入管理中心。"
        confirmLabel="退出登录"
        icon={LogOut}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          onLogout();
        }}
      />
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, action }) {
  return (
    <div className="page-intro">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ value }) {
  const label =
    ({
      pending: '待审核',
      published: '已发布',
      approved: '已通过',
      rejected: '已驳回',
      hidden: '已下架',
      draft: '草稿',
      high: '高风险',
      medium: '中风险',
      low: '低风险',
      student: '学生',
      club: '社团',
      official: '官方',
    })[value] || value;
  return <span className={`status-badge status-${value}`}>{label}</span>;
}

export function EmptyState({ icon: Icon = FileText, title = '暂无数据', description = '当前没有需要处理的项目。' }) {
  return (
    <div className="empty-state">
      <Icon size={24} />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

export function Toast({ message, onDone }) {
  if (!message) return null;
  return (
    <div className="admin-toast" role="status" onAnimationEnd={onDone}>
      {message}
    </div>
  );
}
