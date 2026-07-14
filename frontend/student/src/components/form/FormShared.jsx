import { cn } from '../../lib/cn';

export function FieldGroup({ label, icon: Icon, required, hint, children, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-slate-400" strokeWidth={2} />}
        <span className="text-sm font-semibold text-slate-700">
          {label}
        </span>
        {required && <span className="text-xs font-bold text-blue-600">*</span>}
      </div>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
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
            'inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
            isOn(it)
              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
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
            'inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold tabular-nums transition',
            value === n
              ? 'bg-blue-600 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
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
        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      />
      <input
        type="time"
        value={time}
        onChange={(e) => onTime(e.target.value)}
        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      />
    </div>
  );
}
