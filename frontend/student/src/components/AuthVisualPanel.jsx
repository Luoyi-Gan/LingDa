import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/cn';

export default function AuthVisualPanel({
  image,
  imagePosition = 'center',
  eyebrow,
  title,
  subtitle,
  meta = [],
  action,
  compact = false,
}) {
  return (
    <aside
      className={cn(
        'relative overflow-hidden bg-slate-950 p-6 text-white md:p-10',
        'lg:flex lg:min-h-screen lg:flex-1 lg:flex-col lg:justify-between lg:p-14',
        compact ? 'min-h-[220px]' : 'min-h-[260px]',
      )}
    >
      <img
        src={image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: imagePosition }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/68 to-slate-950/28" />
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent" />
      <div className="absolute inset-0 bg-slate-950/12" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/34 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur transition hover:bg-slate-950/44"
          >
            <ArrowLeft className="h-3 w-3" />
            {action.label}
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/34 px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            灵搭 · LingDa
          </div>
        )}
      </div>

      <div className="relative z-10 mt-8 on-media lg:mt-0 lg:max-w-[460px]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-2xl font-extrabold text-blue-700 shadow-lg shadow-slate-950/20 lg:h-14 lg:w-14 lg:text-3xl">
            灵
          </div>
          <div className="leading-none">
            <div className="font-heading text-xl font-extrabold tracking-tight text-white lg:text-2xl">
              灵搭
            </div>
            <div className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-white/80">
              LingDa
            </div>
          </div>
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/90">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-heading text-3xl font-extrabold leading-[1.08] tracking-tight text-white md:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-white/92 lg:text-base">
          {subtitle}
        </p>

        {meta.length > 0 && (
          <div className="mt-8 grid max-w-sm grid-cols-3 divide-x divide-white/18 rounded-lg border border-white/16 bg-white/12 p-4 text-center backdrop-blur-md">
            {meta.map((item) => (
              <div key={item.label} className="px-3">
                <div className="font-heading text-xl font-extrabold tabular-nums">
                  {item.value}
                </div>
                <div className="mt-1 text-[11px] text-white/68">{item.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 hidden text-xs text-white/54 lg:block">
        © {new Date().getFullYear()} 灵搭 LingDa
      </div>
    </aside>
  );
}
