// 包装头像：点击打开对方个人主页（UserCard）；自己的头像进 /me
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserCard from './UserCard';
import { useAuth } from '../context/AuthContext';

export default function HoverableUserAvatar({
  userId,
  fallbackName,
  children,
  className,
  style,
  disabled,
}) {
  const navigate = useNavigate();
  const { currentUser } = useAuth() || {};
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const elRef = useRef(null);
  const hoverTimer = useRef(null);
  const isWide =
    typeof window !== 'undefined' && window.innerWidth >= 1024;
  const isSelf = !!userId && currentUser?.user_id === userId;
  const inactive = disabled || !userId;

  const openCard = () => {
    if (inactive) return;
    if (isSelf) {
      navigate('/me');
      return;
    }
    if (elRef.current)
      setAnchorRect(elRef.current.getBoundingClientRect());
    setOpen(true);
  };

  const onEnter = () => {
    if (!isWide || inactive || isSelf) return;
    hoverTimer.current = setTimeout(openCard, 280);
  };
  const onLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };
  const onClick = (e) => {
    if (inactive) return;
    e.stopPropagation();
    e.preventDefault();
    openCard();
  };

  useEffect(
    () => () => hoverTimer.current && clearTimeout(hoverTimer.current),
    [],
  );

  return (
    <>
      <span
        ref={elRef}
        role={inactive ? undefined : 'button'}
        tabIndex={inactive ? undefined : 0}
        aria-label={
          inactive
            ? undefined
            : isSelf
              ? '查看我的资料'
              : `查看${fallbackName || '用户'}主页`
        }
        className={className}
        style={{ cursor: inactive ? 'default' : 'pointer', ...style }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={onClick}
        onKeyDown={(e) => {
          if (inactive) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            openCard();
          }
        }}
      >
        {children}
      </span>
      {open && !isSelf && (
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
