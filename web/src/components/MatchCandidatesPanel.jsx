// 发布页「先匹配后创建」候选列表 —— UI 重做：Tailwind 版
// 在发布表单填到一半时，提示有几个相似队伍可以直接加入，避免重复造队
import { ArrowRight, Users, MapPin, Clock3 } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './ui/button';

const TINT_BY_TYPE = {
  carpool: 't-sky',
  entertainment: 't-violet',
  study: 't-teal',
  group: 't-teal',
};

export default function MatchCandidatesPanel({
  items,
  onJoin,
  onProceed,
  proceeded,
  type,
}) {
  if (!items || items.length === 0) return null;
  const tint = TINT_BY_TYPE[type] || 't-sky';
  return (
    <div className={cn('rounded-bento border-transparent shadow-bento p-5 md:p-6 mt-4', tint)}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4" />
        <p className="font-heading text-sm md:text-base font-bold">
          已有 {items.length} 个相似队伍
        </p>
        <span className="ml-auto text-xs opacity-70">先看一眼，避免重复造队</span>
      </div>
      <div className="space-y-2">
        {items.map((c) => (
          <div
            key={c.room_id}
            className="rounded-xl bg-white/55 dark:bg-white/10 backdrop-blur-sm p-3 flex items-center gap-3"
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/70 dark:bg-white/15 shrink-0">
              <span className="font-heading text-xs font-bold tabular-nums">
                {c.score}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {type === 'carpool'
                  ? `${c.start_location || ''} → ${c.end_location || ''}`
                  : c.title || c.course_name || '—'}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] opacity-80 mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-2.5 w-2.5" />
                  {c.meet_time_label || '时间待定'}
                </span>
                {c.meet_location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" />
                    {c.meet_location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Users className="h-2.5 w-2.5" />
                  {c.current_num}/{c.total_num}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onJoin(c)}
              className="bg-white/60 hover:bg-white/80 dark:bg-white/15 dark:hover:bg-white/25 text-current shrink-0"
            >
              查看
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      {!proceeded && (
        <button
          onClick={onProceed}
          className="mt-4 w-full text-xs font-semibold opacity-80 hover:opacity-100 transition-opacity inline-flex items-center justify-center gap-1"
        >
          都不合适，我要新建一个
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
      {proceeded && (
        <p className="mt-4 text-xs text-center opacity-70">
          已确认新建，请点击下方按钮
        </p>
      )}
    </div>
  );
}
