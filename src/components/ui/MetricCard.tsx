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
    <div className="orbit-card relative overflow-hidden p-4">
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: statusColor[status] }}
      />
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-orbit-muted">
          <Icon className="size-4" style={{ color: statusColor[status] }} aria-hidden="true" />
          {meta.label}
        </span>
        <SimulatedTag />
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-semibold tabular-nums text-white">{value.toFixed(meta.decimals)}</span>
        <span className="text-sm text-orbit-muted">{meta.unit}</span>
      </p>
      <p className={cn("mt-1 text-xs font-medium capitalize", statusText[status])}>
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
  color = "#28C5D8",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  color?: string;
}) {
  return (
    <div className="orbit-card relative overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-15 blur-2xl"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-orbit-muted">{label}</span>
        <span
          className="flex size-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-orbit-muted">{hint}</p> : null}
    </div>
  );
}
