// 地点自动联想输入框（#4b）—— UI 重做：Tailwind 重写，与 shadcn Input 一致
// 行为：聚焦/输入时拉 /places/suggest，下拉显示历史地点；空 q → 常用 Top N。
import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { api } from '../lib/api';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { cn } from '../lib/cn';

export default function PlaceAutocomplete({
  value,
  onChange,
  placeholder,
  className,
  limit = 8,
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const dq = useDebouncedValue(value || '', 220);
  const wrapRef = useRef(null);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const seq = ++seqRef.current;
    api.places
      .suggest(dq, limit)
      .then((r) => {
        if (seq !== seqRef.current) return;
        setList(r.list || []);
      })
      .catch(() => {});
  }, [dq, open, limit]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (place) => {
    onChange && onChange(place);
    setOpen(false);
  };

  return (
    <div className={cn('relative w-full', className)} ref={wrapRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm
                     placeholder:text-muted-foreground
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
                     disabled:cursor-not-allowed disabled:opacity-50"
          value={value || ''}
          placeholder={placeholder}
          onChange={(e) => {
            onChange && onChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && list.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg max-h-72 overflow-y-auto animate-in fade-in-0 zoom-in-95">
          {list.map((it) => (
            <button
              type="button"
              key={it.place}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(it.place);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <span className="truncate">{it.place}</span>
              {it.freq > 1 && (
                <span className="ml-2 text-xs text-muted-foreground tabular-nums shrink-0">
                  {it.freq}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
