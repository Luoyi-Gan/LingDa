// 4 Tab 页共用外壳
// · 移动 < lg：display: contents（不产生盒子），底部 TabBar
// · 桌面 ≥ lg：左侧 DesktopNav + 右侧 main，TabBar 隐藏
import { Outlet } from 'react-router-dom';
import TabBar from './TabBar';
import DesktopNav from './DesktopNav';

export default function TabLayout() {
  return (
    <div className="contents lg:flex lg:fixed lg:inset-0 lg:w-screen lg:h-screen lg:overflow-hidden lg:bg-background lg:z-[1]">
      <DesktopNav />
      <main className="contents lg:block lg:flex-1 lg:min-w-0 lg:h-screen lg:overflow-y-auto lg:overflow-x-hidden">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
