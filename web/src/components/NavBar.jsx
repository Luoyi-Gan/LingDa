// 替代小程序的原生导航栏（二级页用）
// UI 重做：sticky + 轻微毛玻璃 + lucide chevron
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function NavBar({ title, onBack, right, transparent = false }) {
  const navigate = useNavigate();
  const back = onBack || (() => navigate(-1));
  return (
    <div
      className={
        transparent
          ? 'sticky top-0 z-30'
          : 'sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60'
      }
    >
      <div className="h-[env(safe-area-inset-top)]" />
      <div className="relative mx-auto w-full max-w-[1180px] h-12 md:h-14 flex items-center px-2 md:px-4">
        <button
          onClick={back}
          aria-label="返回"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 text-center font-heading text-base md:text-lg font-bold tracking-tight text-foreground truncate">
          {title}
        </div>
        <div className="min-w-[36px] flex items-center justify-end">
          {right || null}
        </div>
      </div>
    </div>
  );
}
