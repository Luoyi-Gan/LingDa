import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import TabLayout from './components/TabLayout';
import { openRoomDetail } from './lib/roomDetail';

// —— 全屏页 ——
import Login from './pages/login/Login';
import Register from './pages/register/Register';
import ChatDetail from './pages/chat-detail/ChatDetail';
import FormCarpool from './pages/form-carpool/FormCarpool';
import FormEntertainment from './pages/form-entertainment/FormEntertainment';
import FormStudy from './pages/form-study/FormStudy';
import MatchResult from './pages/match-result/MatchResult';

// —— Tab 页 ——
import Hall from './pages/hall/Hall';
import Posts from './pages/posts/Posts';
import Chat from './pages/chat/Chat';
import Me from './pages/me/Me';
import MyTeams from './pages/teams/MyTeams';
import SettingsPage from './pages/settings/Settings';
import Saved from './pages/saved/Saved';
import Community from './pages/community/Community';
import Announcements from './pages/announcements/Announcements';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/partners" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* 带 TabBar 的 Tab 页 */}
      <Route element={<TabLayout />}>
        <Route path="/hall" element={<Navigate to="/partners" replace />} />
        <Route path="/posts" element={<Community />} />
        <Route path="/partners" element={<Hall />} />
        <Route path="/partners/explore" element={<Posts />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/teams" element={<MyTeams />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/me" element={<Me />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* 全屏二级页 —— 组队详情改右侧抽屉，深链仍兼容 */}
      <Route path="/chat-detail" element={<ChatDetail />} />
      <Route path="/form-carpool" element={<FormCarpool />} />
      <Route path="/form-entertainment" element={<FormEntertainment />} />
      <Route path="/form-study" element={<FormStudy />} />
      <Route path="/match-result" element={<MatchResult />} />
      <Route path="/detail-carpool" element={<DetailDeepLink type="carpool" />} />
      <Route path="/detail-entertainment" element={<DetailDeepLink type="entertainment" />} />
      <Route path="/detail-study" element={<DetailDeepLink type="study" />} />

      <Route path="*" element={<Navigate to="/partners" replace />} />
    </Routes>
  );
}

/** 深链进入详情：回大厅并打开右侧抽屉 */
function DetailDeepLink({ type }) {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    const id = sp.get('id') || sp.get('roomId');
    if (id) openRoomDetail({ type, id });
    navigate('/partners', { replace: true });
  }, [type, sp, navigate]);
  return null;
}
