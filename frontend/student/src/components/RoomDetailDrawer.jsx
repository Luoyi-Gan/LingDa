import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';
import {
  ROOM_DETAIL_CLOSE,
  ROOM_DETAIL_EVENT,
  closeRoomDetail,
} from '../lib/roomDetail';
import DetailCarpool from '../pages/detail-carpool/DetailCarpool';
import DetailEntertainment from '../pages/detail-entertainment/DetailEntertainment';
import DetailStudy from '../pages/detail-study/DetailStudy';

const TITLES = {
  carpool: '拼车详情',
  entertainment: '娱乐详情',
  study: '组队详情',
};

export default function RoomDetailDrawer() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState(null);

  const close = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => {
      setOpen(false);
      setPayload(null);
    }, 280);
  }, []);

  useEffect(() => {
    const onOpen = (e) => {
      const detail = e.detail;
      if (!detail?.id) return;
      setPayload(detail);
      setOpen(true);
      requestAnimationFrame(() => setVisible(true));
    };
    const onClose = () => close();
    window.addEventListener(ROOM_DETAIL_EVENT, onOpen);
    window.addEventListener(ROOM_DETAIL_CLOSE, onClose);
    return () => {
      window.removeEventListener(ROOM_DETAIL_EVENT, onOpen);
      window.removeEventListener(ROOM_DETAIL_CLOSE, onClose);
    };
  }, [close]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeRoomDetail();
    };
    document.body.classList.add('overflow-hidden');
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('overflow-hidden');
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open || !payload) return null;

  const type = payload.type || 'study';
  const roomId = Number(payload.id);

  return (
    <div className="fixed inset-0 z-[95]" role="presentation">
      <button
        type="button"
        aria-label="关闭详情"
        className={cn(
          'absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        style={{ transitionDuration: '280ms' }}
        onClick={close}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={TITLES[type] || '详情'}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-full flex-col bg-[#F7F9FC] shadow-[-12px_0_40px_rgb(15_23_42_/0.16)]',
          'sm:max-w-[440px] md:max-w-[520px] transition-transform',
          visible ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{
          transitionDuration: '280ms',
          transitionTimingFunction: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        }}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur-md">
          <div className="min-w-0 flex-1 truncate px-2 font-heading text-base font-bold text-slate-950">
            {TITLES[type] || '详情'}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="关闭"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {type === 'carpool' && (
            <DetailCarpool roomId={roomId} embedded onClose={close} />
          )}
          {type === 'entertainment' && (
            <DetailEntertainment roomId={roomId} embedded onClose={close} />
          )}
          {type === 'study' && (
            <DetailStudy roomId={roomId} embedded onClose={close} />
          )}
        </div>
      </aside>
    </div>
  );
}
