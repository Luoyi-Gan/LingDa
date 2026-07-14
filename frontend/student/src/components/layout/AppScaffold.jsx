import { Inbox } from 'lucide-react';
import { cn } from '../../lib/cn';

export function AppPage({ children, aside, className }) {
  return (
    <div className={cn('min-h-screen bg-[#F7F9FC] pb-28 lg:pb-10', className)}>
      <div className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 pt-6 md:px-8 md:pt-8 xl:grid-cols-[minmax(0,1fr)_286px]">
        <main className="min-w-0 space-y-6">{children}</main>
        {aside && <aside className="hidden space-y-5 xl:block">{aside}</aside>}
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action, trailing, className }) {
  return (
    <header className={cn('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {(action || trailing) && (
        <div className="flex items-center gap-3">
          {trailing}
          {action}
        </div>
      )}
    </header>
  );
}

export function SectionSurface({ children, className }) {
  return (
    <section className={cn('overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
      {children}
    </section>
  );
}

export function SectionHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="font-heading text-xl font-bold tracking-tight text-slate-950">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SegmentedTabs({ items, value, onChange, className }) {
  return (
    <div className={cn('inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm', className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold transition',
              active
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
            )}
          >
            {Icon && <Icon className="h-4 w-4" strokeWidth={2} />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyPanel({ text, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <Icon className="h-9 w-9 text-slate-300" strokeWidth={1.7} />
      <p className="mt-3 text-sm text-slate-500">{text}</p>
    </div>
  );
}

export function TypeBadge({ children, tone = 'blue', className }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-700',
    violet: 'bg-violet-50 text-violet-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold', tones[tone] || tones.blue, className)}>
      {children}
    </span>
  );
}

export function LineButton({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 text-sm font-semibold text-blue-600 transition hover:bg-blue-600 hover:text-white',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
