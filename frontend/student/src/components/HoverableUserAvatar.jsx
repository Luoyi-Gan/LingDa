// 包装一个头像元素：桌面 hover 300ms / 移动 tap → 打开 UserCard
import { useEffect, useRef, useState } from 'react';
import UserCard from './UserCard';

export default function HoverableUserAvatar({
  userId,
  fallbackName,
  children,
  className,
  style,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const elRef = useRef(null);
  const hoverTimer = useRef(null);
  const isWide =
    typeof window !== 'undefined' && window.innerWidth >= 1024;

  const openCard = () => {
    if (disabled || !userId) return;
    if (elRef.current)
      setAnchorRect(elRef.current.getBoundingClientRect());
    setOpen(true);
  };

  const onEnter = () => {
    if (!isWide || disabled) return;
    hoverTimer.current = setTimeout(openCard, 280);
  };
  const onLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };
  const onClick = (e) => {
    if (disabled || !userId) return;
    if (isWide) {
      // 桌面：点击也开（一些用户不习惯等 hover）
      openCard();
      e.stopPropagation();
      return;
    }
    // 移动：直接打开
    openCard();
    e.stopPropagation();
  };

  useEffect(
    () => () => hoverTimer.current && clearTimeout(hoverTimer.current),
    [],
  );

  return (
    <>
      <span
        ref={elRef}
        className={className}
        style={{ cursor: disabled ? 'default' : 'pointer', ...style }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={onClick}
      >
        {children}
      </span>
      {open && (
        <UserCard
          userId={userId}
          fallbackName={fallbackName}
          anchorRect={anchorRect}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
