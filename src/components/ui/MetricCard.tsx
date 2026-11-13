import type { LucideIcon } from "lucide-react";
import { cn, metricMeta, metricStatus, statusColor, statusText } from "@/lib/health";
import type { MetricKind } from "@/data/types";
import { SimulatedTag } from "./primitives";

export function VitalCard({
  kind,
  value,
  icon: Icon,
}: {
  kind: MetricKind;
  value: number;
  icon: LucideIcon;
}) {
  const meta = metricMeta[kind];
  const status = metricStatus(kind, value);
  return (
    <div className="orbit-card p-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-orbit-muted">
          <Icon className="size-3.5 text-orbit-dim" aria-hidden="true" />
          {meta.label}
        </span>
        <SimulatedTag />
      </div>
      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="font-mono text-4xl font-medium tabular-nums tracking-tight text-ink">{value.toFixed(meta.decimals)}</span>
        <span className="font-mono text-xs text-orbit-muted">{meta.unit}</span>
      </p>
      <p className={cn("mt-3 flex items-center gap-2 text-xs font-medium", statusText[status])}>
        <span className="size-1.5 rounded-full" style={{ backgroundColor: statusColor[status] }} />
        {status === "stable" ? "Within range" : status === "warning" ? "Outside range" : "Critical range"}
      </p>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  color = "#3B82F6",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  color?: string;
}) {
  return (
    <div className="orbit-card p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-orbit-muted">{label}</span>
        <Icon className="size-4" style={{ color }} aria-hidden="true" />
      </div>
      <p className="mt-5 font-mono text-4xl font-medium tabular-nums tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-3 border-t border-white/10 pt-3 text-xs text-orbit-muted">{hint}</p> : null}
    </div>
  );
}
