import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// 新底座 tokens（含 @tailwind base/components/utilities）—— 必须先于 global.scss 加载，
// 这样旧的 SCSS Module 仍可继续覆盖 token，逐页重写期间双轨共存。
import './styles/tokens.css';
import './styles/global.scss';
import App from './App';
import { UIProvider } from './context/UIContext';
import { AuthProvider } from './context/AuthContext';
import { FriendsProvider } from './context/FriendsContext';
import RouterBridge from './components/RouterBridge';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <RouterBridge />
      <UIProvider>
        <AuthProvider>
          <FriendsProvider>
            <App />
          </FriendsProvider>
        </AuthProvider>
      </UIProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
