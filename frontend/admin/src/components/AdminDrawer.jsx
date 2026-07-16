import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * 右侧滑入抽屉。底层页面保持原样（不滚回顶部、不挤动布局）。
 */
export default function AdminDrawer({ open, title, onClose, children, wide = false }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const scrollRef = useRef(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 280);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!mounted) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };

    scrollRef.current = window.scrollY;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = scrollbar > 0 ? `${scrollbar}px` : '';
    // 顶栏若 fixed，一并补齐，避免滚动条消失后右移
    document.documentElement.style.setProperty('--admin-drawer-gutter', `${scrollbar}px`);

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.documentElement.style.removeProperty('--admin-drawer-gutter');
      window.removeEventListener('keydown', onKey);
      window.scrollTo(0, scrollRef.current);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div className={`admin-drawer-root ${visible ? 'is-visible' : ''}`} role="presentation">
      <button type="button" className="admin-drawer-scrim" aria-label="关闭详情" onClick={onClose} />
      <aside
        className={`admin-drawer-panel ${wide ? 'is-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title || '详情'}
      >
        <header className="admin-drawer-header">
          <div>
            <span className="eyebrow">Detail</span>
            <h2>{title || '详情'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="admin-drawer-body">{children}</div>
      </aside>
    </div>
  );
}
