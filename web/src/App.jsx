import { Routes, Route, Navigate } from 'react-router-dom';
import TabLayout from './components/TabLayout';

// —— 全屏页 ——
import Login from './pages/login/Login';
import Register from './pages/register/Register';
import ChatDetail from './pages/chat-detail/ChatDetail';
import FormCarpool from './pages/form-carpool/FormCarpool';
import FormEntertainment from './pages/form-entertainment/FormEntertainment';
import FormStudy from './pages/form-study/FormStudy';
import MatchResult from './pages/match-result/MatchResult';
import DetailCarpool from './pages/detail-carpool/DetailCarpool';
import DetailEntertainment from './pages/detail-entertainment/DetailEntertainment';
import DetailStudy from './pages/detail-study/DetailStudy';

// —— Tab 页 ——
import Hall from './pages/hall/Hall';
import Posts from './pages/posts/Posts';
import Chat from './pages/chat/Chat';
import Me from './pages/me/Me';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/hall" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* 带 TabBar 的 4 个 Tab 页 */}
      <Route element={<TabLayout />}>
        <Route path="/hall" element={<Hall />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/me" element={<Me />} />
      </Route>

      {/* 全屏二级页 */}
      <Route path="/chat-detail" element={<ChatDetail />} />
      <Route path="/form-carpool" element={<FormCarpool />} />
      <Route path="/form-entertainment" element={<FormEntertainment />} />
      <Route path="/form-study" element={<FormStudy />} />
      <Route path="/match-result" element={<MatchResult />} />
      <Route path="/detail-carpool" element={<DetailCarpool />} />
      <Route path="/detail-entertainment" element={<DetailEntertainment />} />
      <Route path="/detail-study" element={<DetailStudy />} />

      <Route path="*" element={<Navigate to="/hall" replace />} />
    </Routes>
  );
}
