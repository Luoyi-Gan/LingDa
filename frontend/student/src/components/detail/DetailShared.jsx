import { Star } from 'lucide-react';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import HoverableUserAvatar from '../HoverableUserAvatar';
import { cn } from '../../lib/cn';

export function DetailHero({
  tint,
  icon: Icon,
  tag,
  title,
  subtitle,
  countdown,
  meetLabel,
  total,
  current,
}) {
  const accent = getAccent(tint);
  return (
    <Card bento className="relative mb-4 overflow-hidden border-slate-200 bg-white p-5 shadow-sm md:p-6">
      {Icon && (
        <div className={cn('absolute right-5 top-5 hidden h-12 w-12 items-center justify-center rounded-lg md:flex', accent.soft)}>
          <Icon aria-hidden className={cn('h-6 w-6', accent.text)} strokeWidth={2} />
        </div>
      )}
      <div className="relative">
        {tag && (
          <span className={cn('inline-flex items-center rounded px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]', accent.soft, accent.text)}>
            {tag}
          </span>
        )}
        <h1 className="mt-3 max-w-2xl font-heading text-2xl font-bold leading-tight tracking-tight text-slate-950 md:text-3xl">
          {title || '—'}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {countdown && (
            <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold', accent.soft, accent.text)}>
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {countdown}
            </span>
          )}
          {meetLabel && (
            <span className="text-xs text-slate-500">{meetLabel}</span>
          )}
          {total != null && (
            <span className="ml-auto inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-600">
              {current ?? 0}/{total}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

export function DetailSection({ title, icon: Icon, action, children, className }) {
  return (
    <Card bento className={cn('border-slate-200 bg-white p-5 shadow-sm md:p-6', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-slate-400" strokeWidth={2} />}
          {title && (
            <span className="font-heading text-base font-bold text-slate-950">
              {title}
            </span>
          )}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      {children}
    </Card>
  );
}

export function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-400">
          {label}
        </div>
        <div className="mt-0.5 break-words text-sm font-semibold text-slate-950">
          {value || <span className="text-slate-300">—</span>}
        </div>
      </div>
    </div>
  );
}

export function CreatorCard({ creator, roleLabel = '房主' }) {
  if (!creator) return null;
  return (
    <div>
      <div className="flex items-center gap-4">
        <HoverableUserAvatar
          userId={creator.user_id}
          fallbackName={creator.username}
        >
          <Avatar className="h-14 w-14 ring-2 ring-slate-100">
            <AvatarFallback
              style={{ background: creator.avatar_color }}
              className="text-white font-bold text-xl"
            >
              {creator.avatar_text}
            </AvatarFallback>
          </Avatar>
        </HoverableUserAvatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-heading text-base font-bold text-slate-950">
              {creator.username}
            </span>
            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
              {roleLabel}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {creator.college}
            {creator.major && <> · {creator.major}</>}
          </p>
        </div>
        {creator.rating != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
            <Star className="h-3 w-3" fill="currentColor" />
            <span className="tabular-nums">{creator.rating}</span>
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
        <Stat num={creator.post_count} label="组队" />
        <Stat num={creator.rating_count} label="评价" />
        <Stat num={creator.gender || '—'} label="性别" />
      </div>
      {creator.tags && creator.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {creator.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ num, label }) {
  return (
    <div>
      <div className="font-heading text-lg font-bold tabular-nums text-foreground">
        {num ?? 0}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </div>
    </div>
  );
}

// 成员网格 —— 已加入成员头像 + 空位
export function MemberGrid({ members, emptyCount }) {
  const empties = Array.from({ length: Math.max(0, emptyCount) }, (_, i) => i);
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7">
      {members.map((item) => (
        <div key={item.user_id} className="flex flex-col items-center gap-1.5">
          <HoverableUserAvatar
            userId={item.user_id}
            fallbackName={item.username}
          >
            <Avatar className="h-12 w-12 ring-2 ring-slate-100">
              <AvatarFallback
                style={{ background: item.avatar_color }}
                className="text-white font-bold"
              >
                {item.avatar_text}
              </AvatarFallback>
            </Avatar>
          </HoverableUserAvatar>
          <span className="line-clamp-1 w-full text-center text-[11px] font-medium text-slate-600">
            {item.username}
          </span>
        </div>
      ))}
      {empties.map((i) => (
        <div key={`e${i}`} className="flex flex-col items-center gap-1.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-slate-50 text-xl font-bold text-slate-300">
            +
          </div>
          <span className="text-[11px] text-slate-400">空位</span>
        </div>
      ))}
    </div>
  );
}

// 要求/标签 chips 行
export function PillRow({ items }) {
  if (!items || !items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={typeof it === 'string' ? it : it.label}
          className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
        >
          {typeof it === 'string' ? it : it.label}
        </span>
      ))}
    </div>
  );
}

function getAccent(tint) {
  if (tint === 't-violet') {
    return { soft: 'bg-orange-50', text: 'text-orange-700' };
  }
  if (tint === 't-teal') {
    return { soft: 'bg-emerald-50', text: 'text-emerald-700' };
  }
  return { soft: 'bg-blue-50', text: 'text-blue-700' };
}
