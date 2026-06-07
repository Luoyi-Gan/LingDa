// Form 共用原语 —— FieldGroup / ChipRow / NumberRow / DateTimeRow
// 让三个发布表单结构一致、风格统一
import { cn } from '../../lib/cn';

export function FieldGroup({ label, icon: Icon, required, hint, children, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />}
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        {required && <span className="text-cta text-xs font-bold">*</span>}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

export function ChipRow({ items, value, onChange, multi = false, getLabel, getKey }) {
  const keyOf = getKey || ((x) => (typeof x === 'string' ? x : x.value));
  const labelOf = getLabel || ((x) => (typeof x === 'string' ? x : x.label));
  const selected = multi ? (Array.isArray(value) ? value : []) : value;
  const isOn = (it) => {
    const k = keyOf(it);
    return multi ? selected.includes(k) : selected === k;
  };
  const click = (it) => {
    const k = keyOf(it);
    if (multi) {
      const next = selected.includes(k)
        ? selected.filter((x) => x !== k)
        : [...selected, k];
      onChange(next);
    } else {
      onChange(k);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <button
          key={keyOf(it)}
          type="button"
          onClick={() => click(it)}
          className={cn(
            'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
            isOn(it)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/70',
          )}
        >
          {labelOf(it)}
        </button>
      ))}
    </div>
  );
}

export function NumberRow({ items, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            'h-10 w-10 inline-flex items-center justify-center rounded-full text-sm font-bold tabular-nums transition-all',
            value === n
              ? 'bg-primary text-primary-foreground ring-2 ring-primary/25'
              : 'bg-muted text-muted-foreground hover:bg-muted/70',
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function DateTimeRow({ date, time, onDate, onTime }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => onDate(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
      <input
        type="time"
        value={time}
        onChange={(e) => onTime(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
    </div>
  );
}
