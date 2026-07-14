import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Button } from './ui/button';
import { cn } from '../lib/cn';

export default function FavoriteButton({ roomType, roomId, payload, className }) {
  const { showToast } = useUI();
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    api.community
      .favorites('room')
      .then((res) => setActive((res.list || []).some((item) => Number(item.target_id) === Number(roomId))))
      .catch(() => {});
  }, [roomId]);

  const onClick = () => {
    if (!roomId || saving) return;
    setSaving(true);
    const action = active
      ? api.community.unfavorite('room', Number(roomId))
      : api.community.favorite('room', Number(roomId));
    action
      .then(() => {
        setActive(!active);
        showToast({ title: active ? '已取消收藏' : '已收藏', icon: 'success' });
      })
      .finally(() => setSaving(false));
  };

  return (
    <Button
      variant="ghost"
      size="lg"
      onClick={onClick}
      className={cn(
        'px-3',
        active && 'bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700',
        className,
      )}
      aria-label={active ? '取消收藏' : '收藏'}
      aria-pressed={active}
      disabled={saving}
    >
      <Star className="h-5 w-5" fill={active ? 'currentColor' : 'none'} />
    </Button>
  );
}
