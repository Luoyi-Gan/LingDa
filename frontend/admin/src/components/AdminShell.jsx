import {
  BellRing, BookOpenCheck, Building2, ChevronRight, FileText, Flag,
  LayoutDashboard, LogOut, Megaphone, Menu, ShieldCheck, Users, X,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';

const NAV = [
  { path: '/overview', label: '工作台', desc: '运营总览', icon: LayoutDashboard },
  { path: '/announcements', label: '公告管理', desc: '发布与维护', icon: Megaphone },
  { path: '/students', label: '学生身份', desc: '在校身份审核', icon: Users },
  { path: '/clubs', label: '社团认证', desc: '组织资质审核', icon: Building2 },
  { path: '/moderation', label: '内容风控', desc: '帖子与评论', icon: ShieldCheck },
  { path: '/milestones', label: '关键节点', desc: '时间轴事项', icon: Flag },
];

const TITLES = Object.fromEntries(NAV.map((item) => [item.path, item.label]));

export default function AdminShell({ user, onLogout, children }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${open ? 'is-open' : ''}`}>
        <div className="brand-row">
          <span className="brand-mark">灵</span>
          <div><strong>灵搭管理中心</strong><span>LINGDA ADMIN</span></div>
          <button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="关闭菜单"><X size={18} /></button>
        </div>
        <nav className="admin-nav" aria-label="管理导航">
          {NAV.map(({ path, label, desc, icon: Icon }) => (
            <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} /><span><strong>{label}</strong><small>{desc}</small></span><ChevronRight size={14} />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-policy">
          <BookOpenCheck size={17} />
          <div><strong>自动风控已开启</strong><span>低风险自动放行，高风险进入人工队列</span></div>
        </div>
        <button className="account-row" onClick={onLogout} type="button">
          <span className="account-avatar">{(user.username || '管').slice(0, 1)}</span>
          <span><strong>{user.username}</strong><small>管理员账号</small></span>
          <LogOut size={16} />
        </button>
      </aside>
      {open && <button className="sidebar-scrim" aria-label="关闭菜单" onClick={() => setOpen(false)} />}
      <section className="admin-workspace">
        <header className="topbar">
          <div className="topbar-title"><button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="打开菜单"><Menu size={19} /></button><h1>{TITLES[location.pathname] || '管理中心'}</h1></div>
          <div className="topbar-actions"><span className="system-state"><span />系统运行正常</span><button className="icon-button" aria-label="系统通知"><BellRing size={18} /></button></div>
        </header>
        <main className="admin-content">{children}</main>
      </section>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, action }) {
  return <div className="page-intro"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

export function StatusBadge({ value }) {
  const label = ({ pending: '待审核', published: '已发布', approved: '已通过', rejected: '已驳回', hidden: '已下架', draft: '草稿', high: '高风险', medium: '中风险', low: '低风险' })[value] || value;
  return <span className={`status-badge status-${value}`}>{label}</span>;
}

export function EmptyState({ icon: Icon = FileText, title = '暂无数据', description = '当前没有需要处理的项目。' }) {
  return <div className="empty-state"><Icon size={24} /><strong>{title}</strong><span>{description}</span></div>;
}
