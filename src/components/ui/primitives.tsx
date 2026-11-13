import type { ReactNode } from "react";
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
  return <section className={cn("orbit-card p-5", glow && "orbit-glow", className)}>{children}</section>;
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
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-orbit-muted">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Avatar({
  name,
  from,
  to,
  size = 36,
}: {
  name: string;
  from: string;
  to: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-1 ring-white/15"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function StatusBadge({ status, compact }: { status: HealthStatus; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
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
  critical: { color: "#F0524F", label: "Critical" },
  warning: { color: "#F59E42", label: "Warning" },
  info: { color: "#4A90FF", label: "Info" },
};

export function SeverityDot({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      className="mt-1.5 size-2 shrink-0 rounded-full"
      style={{ backgroundColor: severityStyle[severity].color, boxShadow: `0 0 8px ${severityStyle[severity].color}88` }}
      title={severityStyle[severity].label}
    />
  );
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const s = severityStyle[severity];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
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
        "inline-flex items-center rounded border border-orbit-cyan/25 bg-orbit-cyan/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-orbit-cyan",
        className,
      )}
    >
      Simulated
    </span>
  );
}

export function ProgressBar({ value, color = "#4A90FF" }: { value: number; color?: string }) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-white/8"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 112,
  stroke = 9,
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
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4A90FF" />
          <stop offset="100%" stopColor="#9CC4FF" />
        </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
