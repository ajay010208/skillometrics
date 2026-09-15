import React from "react";

export function GlassCard({
  children,
  className = "",
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <div className={`glass ${hover ? "glass-hover" : ""} ${className}`}>{children}</div>;
}

export function Chip({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "cyan" | "violet" | "green" | "amber" | "pink";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-900/[0.06] text-slate-600",
    cyan: "bg-amber-500/15 text-amber-600",
    violet: "bg-orange-500/15 text-orange-600",
    green: "bg-emerald-500/15 text-emerald-600",
    amber: "bg-amber-500/20 text-amber-600",
    pink: "bg-pink-500/20 text-pink-300",
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

export function KpiTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="stat-tile">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="kpi-value mt-2">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = "cyan",
}: {
  value: number;
  max?: number;
  tone?: "cyan" | "green" | "amber" | "pink" | "violet";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tones: Record<string, string> = {
    cyan: "from-amber-400 to-orange-600",
    green: "from-emerald-400 to-green-500",
    amber: "from-amber-400 to-orange-500",
    pink: "from-pink-400 to-rose-500",
    violet: "from-orange-400 to-amber-600",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/[0.06]">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${tones[tone]} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Stars({ value, size = "text-sm" }: { value: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight`}>
      {"★".repeat(Math.round(value))}
      <span className="text-slate-600">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

const AVATAR_HUES = [
  "bg-amber-500/20 text-amber-700",
  "bg-orange-500/20 text-orange-700",
  "bg-emerald-500/20 text-emerald-700",
  "bg-sky-500/15 text-sky-700",
  "bg-rose-500/15 text-rose-700",
  "bg-violet-500/15 text-violet-700",
];

/** Round initials avatar; hue picked deterministically from the name. */
export function Avatar({ name, size = "h-9 w-9 text-xs" }: { name: string; size?: string }) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  let h = 0;
  for (let i = 0; i < (name ?? "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const tone = AVATAR_HUES[h % AVATAR_HUES.length];
  return (
    <span
      aria-hidden
      title={name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-black ${size} ${tone}`}
    >
      {initials}
    </span>
  );
}

export function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  if (source === "ai") {
    return <Chip tone="violet">✦ AI</Chip>;
  }
  if (source === "fallback") {
    return <Chip tone="cyan">⚡ Smart engine</Chip>;
  }
  return null;
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-slate-500">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon = "✨", title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="glass-soft flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="text-3xl">{icon}</div>
      <div className="font-semibold text-slate-900">{title}</div>
      {hint && <div className="max-w-md text-sm text-slate-500">{hint}</div>}
    </div>
  );
}

export function VerifiedBadge() {
  return (
    <Chip tone="green">✓ Verified placement</Chip>
  );
}

/** Interview questions as numbered rows with amber "Q1 / Q2" chips. */
export function QuestionList({
  questions,
  compact = false,
}: {
  questions: string[];
  compact?: boolean;
}) {
  if (!questions.length) return null;
  return (
    <ul className="space-y-1.5">
      {questions.map((q, i) => (
        <li key={i} className="flex items-start gap-2">
          <span
            className="mt-px inline-flex h-5 shrink-0 items-center gap-0.5 rounded-md bg-amber-500/15 px-1.5 text-[10px] font-black tracking-wide text-amber-600"
            title={`Question ${i + 1}`}
          >
            <span aria-hidden>❓</span>Q{i + 1}
          </span>
          <span className={`${compact ? "text-xs" : "text-sm"} leading-relaxed text-slate-600`}>{q}</span>
        </li>
      ))}
    </ul>
  );
}
