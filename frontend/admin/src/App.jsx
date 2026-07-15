import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from './api';
import { adminAuth } from './auth';
import AdminShell from './components/AdminShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import VerificationsPage from './pages/VerificationsPage';
import ModerationPage from './pages/ModerationPage';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(adminAuth.user());
  const [ready, setReady] = useState(!adminAuth.token());

  const logout = useCallback(() => {
    adminAuth.clear();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!adminAuth.token()) return;
    adminApi.me().then((current) => {
      if (current.account_role !== 'admin') throw new Error('该账号不是管理员');
      setUser(current);
      adminAuth.save(adminAuth.token(), current);
    }).catch(logout).finally(() => setReady(true));
  }, [logout]);

  if (!ready) return <div className="boot-screen">正在进入管理中心...</div>;

  if (location.pathname === '/login') {
    return user ? <Navigate to="/overview" replace /> : <LoginPage onLogin={setUser} />;
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AdminShell user={user} onLogout={logout}>
      <Routes>
        <Route path="/overview" element={<DashboardPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/students" element={<VerificationsPage type="student" />} />
        <Route path="/clubs" element={<VerificationsPage type="club" />} />
        <Route path="/officials" element={<VerificationsPage type="official" />} />
        <Route path="/moderation" element={<ModerationPage />} />
        <Route path="/milestones" element={<AnnouncementsPage milestones />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </AdminShell>
  );
}
