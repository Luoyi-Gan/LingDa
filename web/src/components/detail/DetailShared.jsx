// Detail 页共用组件 —— 三个详情页用同一套原语，颜色按 type 主色
import { Star } from 'lucide-react';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import HoverableUserAvatar from '../HoverableUserAvatar';
import { cn } from '../../lib/cn';

// 详情页 Hero —— 大色块（按 type tint） + 角落简笔画 + 标签 / 标题 / 倒计时
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
  return (
    <Card
      bento
      className={cn(
        'border-transparent p-6 md:p-7 relative overflow-hidden mb-4',
        tint,
      )}
    >
      {Icon && (
        <Icon
          aria-hidden
          className="absolute -right-8 -bottom-8 h-48 w-48 opacity-15"
          strokeWidth={1.25}
        />
      )}
      <div className="relative">
        {tag && (
          <span className="inline-flex items-center rounded-full bg-white/55 dark:bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]">
            {tag}
          </span>
        )}
        <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight leading-tight mt-3">
          {title || '—'}
        </h1>
        {subtitle && <p className="text-sm opacity-75 mt-1">{subtitle}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {countdown && (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/40 dark:bg-white/15 px-3 py-1 text-xs font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {countdown}
            </span>
          )}
          {meetLabel && (
            <span className="text-xs opacity-80">{meetLabel}</span>
          )}
          {total != null && (
            <span className="ml-auto inline-flex items-center rounded-full bg-black/15 dark:bg-white/15 px-2.5 py-0.5 text-xs font-bold tabular-nums">
              {current ?? 0}/{total}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

// 卡片化的 section 包装
export function DetailSection({ title, icon: Icon, action, children, className }) {
  return (
    <Card bento className={cn('p-5 md:p-6', className)}>
      {(title || action) && (
        <div className="flex items-center gap-2 mb-4">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />}
          {title && (
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
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

// 单条信息行（icon + label + value）
export function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
        {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-semibold text-foreground mt-0.5 break-words">
          {value || <span className="text-muted-foreground/60">—</span>}
        </div>
      </div>
    </div>
  );
}

// 房主卡片
export function CreatorCard({ creator, roleLabel = '房主' }) {
  if (!creator) return null;
  return (
    <div>
      <div className="flex items-center gap-4">
        <HoverableUserAvatar
          userId={creator.user_id}
          fallbackName={creator.username}
        >
          <Avatar className="h-14 w-14 ring-2 ring-border">
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
            <span className="font-heading text-base font-bold text-foreground truncate">
              {creator.username}
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              {roleLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {creator.college}
            {creator.major && <> · {creator.major}</>}
          </p>
        </div>
        {creator.rating != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 px-2 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
            <Star className="h-3 w-3" fill="currentColor" />
            <span className="tabular-nums">{creator.rating}</span>
          </span>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-3 text-center">
        <Stat num={creator.post_count} label="组队" />
        <Stat num={creator.rating_count} label="评价" />
        <Stat num={creator.gender || '—'} label="性别" />
      </div>
      {creator.tags && creator.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {creator.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
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
      <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

// 成员网格 —— 已加入成员头像 + 空位
export function MemberGrid({ members, emptyCount }) {
  const empties = Array.from({ length: Math.max(0, emptyCount) }, (_, i) => i);
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3">
      {members.map((item) => (
        <div key={item.user_id} className="flex flex-col items-center gap-1.5">
          <HoverableUserAvatar
            userId={item.user_id}
            fallbackName={item.username}
          >
            <Avatar className="h-12 w-12 ring-2 ring-border">
              <AvatarFallback
                style={{ background: item.avatar_color }}
                className="text-white font-bold"
              >
                {item.avatar_text}
              </AvatarFallback>
            </Avatar>
          </HoverableUserAvatar>
          <span className="text-[11px] font-medium text-center line-clamp-1 w-full">
            {item.username}
          </span>
        </div>
      ))}
      {empties.map((i) => (
        <div key={`e${i}`} className="flex flex-col items-center gap-1.5">
          <div className="h-12 w-12 rounded-full border-2 border-dashed border-border bg-muted/40 flex items-center justify-center text-muted-foreground/60 text-xl font-bold">
            +
          </div>
          <span className="text-[11px] text-muted-foreground/70">空位</span>
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
          className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
        >
          {typeof it === 'string' ? it : it.label}
        </span>
      ))}
    </div>
  );
}
