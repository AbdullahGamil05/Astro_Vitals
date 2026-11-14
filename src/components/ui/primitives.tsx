import { useState, type ReactNode } from "react";
import { initials, statusLabel } from "@/data/astronauts";
import type { AlertSeverity, HealthStatus } from "@/data/types";
import { cn, statusColor, statusSoftBg, statusText } from "@/lib/health";

export function Card({
  className,
  children,
  glow,
}: {
  className?: string;
  children: ReactNode;
  glow?: boolean;
}) {
  return <section className={cn("orbit-card p-6", glow && "orbit-glow", className)}>{children}</section>;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3 border-b border-white/10 pb-4">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-orbit-muted">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Avatar({
  name,
  src,
  from,
  to,
  size = 40,
  online = true,
}: {
  name: string;
  src?: string;
  from: string;
  to: string;
  size?: number;
  online?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(src) && !failed;
  const large = size >= 64;
  // Small avatars zoom in on the face; large frames show the suit and shoulders.
  const zoom = size < 56 ? 1.4 : 1.12;
  const dot = Math.min(18, Math.max(8, Math.round(size * 0.2)));
  // Centers the dot on the circle's edge at 45 degrees.
  const dotOffset = size * 0.146 - dot / 2;

  return (
    <span aria-hidden="true" className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className={cn(
          "size-full overflow-hidden rounded-full border-sky-400/40 bg-orbit-card-2",
          large
            ? "border-2 shadow-[0_0_0_1px_rgb(56_189_248/0.14),0_0_22px_rgb(56_189_248/0.32)]"
            : "border shadow-[0_0_10px_rgb(56_189_248/0.25)]",
        )}
      >
        {showPhoto && src ? (
          <img
            src={src}
            srcSet={`${src.replace(/(\.\w+)$/, "-160$1")} 160w, ${src} 640w`}
            sizes={`${Math.round(size * zoom)}px`}
            width={size}
            height={size}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setFailed(true)}
            className="size-full select-none object-cover object-top"
            style={{ transform: `scale(${zoom})`, transformOrigin: "50% 22%" }}
          />
        ) : (
          <span
            className="flex size-full items-center justify-center font-mono font-medium text-ink"
            style={{ fontSize: size * 0.36, backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
          >
            {initials(name)}
          </span>
        )}
      </span>
      {online ? (
        <span
          className="absolute flex"
          style={{ width: dot, height: dot, right: dotOffset, bottom: dotOffset }}
        >
          {large ? (
            <span className="absolute inset-0 rounded-full bg-orbit-teal opacity-60 motion-safe:animate-ping" />
          ) : null}
          <span className="relative size-full rounded-full border-2 border-orbit-bg bg-orbit-teal shadow-[0_0_6px_rgb(63_191_159/0.9)]" />
        </span>
      ) : null}
    </span>
  );
}

export function StatusBadge({ status, compact }: { status: HealthStatus; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider",
        statusSoftBg[status],
        statusText[status],
      )}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: statusColor[status] }} />
      {compact ? statusLabel[status].split(" ")[0] : statusLabel[status]}
    </span>
  );
}

const severityStyle: Record<AlertSeverity, { color: string; label: string }> = {
  critical: { color: "#EF4444", label: "Critical" },
  warning: { color: "#F97316", label: "Warning" },
  info: { color: "#3B82F6", label: "Info" },
};

export function SeverityDot({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      className="mt-1.5 size-2 shrink-0 rounded-full"
      style={{ backgroundColor: severityStyle[severity].color }}
      title={severityStyle[severity].label}
    />
  );
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const s = severityStyle[severity];
  return (
    <span
      className="inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider"
      style={{ color: s.color, borderColor: `${s.color}40`, backgroundColor: `${s.color}14` }}
    >
      {s.label}
    </span>
  );
}

export function SimulatedTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-orbit-muted",
        className,
      )}
    >
      Simulated
    </span>
  );
}

export function ProgressBar({ value, color = "#3B82F6" }: { value: number; color?: string }) {
  return (
    <div
      className="h-1 w-full overflow-hidden rounded-sm bg-white/10"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 112,
  stroke = 6,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
