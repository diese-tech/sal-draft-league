"use client";

import { cn, slugify, formatNumber } from "@/lib/utils";

// ─── Section layout ───────────────────────────────────────────────────────────

export function PreviewPanel({
  eyebrow,
  title,
  tunedBy,
  collapsed,
  onToggle,
  children,
}: {
  eyebrow: string;
  title: string;
  tunedBy?: string[];
  collapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-black/30 backdrop-blur">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full cursor-pointer flex-wrap items-end justify-between gap-3 p-4 text-left transition hover:bg-white/[0.02]",
          collapsed ? "rounded-2xl" : "rounded-t-2xl",
        )}
      >
        <div>
          <p className="text-xs font-black uppercase text-cyan-200/80">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tunedBy ? (
            <div className="flex flex-wrap gap-1.5">
              {tunedBy.map((item) => (
                <span key={item} className="rounded-full border border-orange-200/15 bg-orange-300/10 px-2 py-1 text-[0.65rem] font-black uppercase text-orange-100/80">
                  Tuned by {item}
                </span>
              ))}
            </div>
          ) : null}
          <span className={cn("ml-1 text-slate-500 transition-transform", !collapsed && "rotate-180")}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </button>
      {!collapsed && <div className="min-w-0 border-t border-white/10 p-4 pt-4">{children}</div>}
    </section>
  );
}

export function InlineControls({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div data-testid={`controls-${slugify(title)}`} className="h-fit rounded-2xl border border-white/10 bg-black/25 2xl:sticky 2xl:top-4">
      <p className="px-3 pt-3 text-xs font-black uppercase text-cyan-100">{title}</p>
      <div className="grid gap-3 overflow-y-auto p-3 pt-2 2xl:max-h-[calc(100vh-6rem)]">{children}</div>
    </div>
  );
}

export function PreviewTarget({
  label,
  affectedBy,
  children,
}: {
  label: string;
  affectedBy: string;
  children: React.ReactNode;
}) {
  return (
    <div data-testid="preview-target" className="min-w-0 rounded-2xl border border-cyan-200/12 bg-cyan-200/[0.025] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <p className="text-xs font-black uppercase text-cyan-100">{label}</p>
        <p className="text-[0.68rem] font-bold text-slate-400">{affectedBy}</p>
      </div>
      <div className="min-w-0 pb-2">{children}</div>
    </div>
  );
}

export function ControlDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-[0.6rem] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

// ─── Primitive controls ───────────────────────────────────────────────────────

export function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const controlId = slugify(label);
  return (
    <label data-control-label={label} data-control-kind="toggle" className="flex items-center justify-between gap-3 text-sm font-bold text-slate-200">
      <span>{label}</span>
      <input
        data-testid={`toggle-${controlId}`}
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-cyan-300"
      />
    </label>
  );
}

export function SelectControl<Option extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Option;
  options: Option[];
  onChange: (value: Option) => void;
}) {
  const controlId = slugify(label);
  return (
    <label data-control-label={label} data-control-kind="select" className="grid gap-1 text-sm font-bold text-slate-200">
      <span>{label}</span>
      <select
        data-testid={`select-${controlId}`}
        value={value}
        onChange={(e) => onChange(e.target.value as Option)}
        className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-200/50"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const controlId = slugify(label);

  function updateValue(next: number) {
    onChange(Math.min(max, Math.max(min, next)));
  }

  return (
    <label data-control-label={label} data-control-kind="slider" className="grid gap-1 text-sm font-bold text-slate-200">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="font-mono text-xs text-cyan-100">{formatNumber(value)}{suffix}</span>
      </span>
      <span className="grid grid-cols-[1fr_5.5rem] gap-2">
        <input
          data-testid={`slider-range-${controlId}`}
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onInput={(e) => updateValue(Number(e.currentTarget.value))}
          onChange={(e) => updateValue(Number(e.currentTarget.value))}
          className="w-full accent-cyan-300"
        />
        <input
          data-testid={`slider-number-${controlId}`}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onInput={(e) => updateValue(Number(e.currentTarget.value))}
          onChange={(e) => updateValue(Number(e.currentTarget.value))}
          className="h-8 rounded-lg border border-white/10 bg-black/35 px-2 text-right font-mono text-xs text-white outline-none focus:border-cyan-200/45"
        />
      </span>
    </label>
  );
}
