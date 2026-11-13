import { Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import type { UnifiedAlert } from "@/data/monitoring";
import { cn } from "@/lib/health";
import { liveMetricMeta } from "@/lib/monitoring/config";
import { SeverityBadge } from "@/components/ui/primitives";

const otherLabels: Record<string, string> = {
  assessment: "Daily assessment",
  environment: "Cabin environment",
  sleep: "Sleep",
};

export function metricLabel(metric: UnifiedAlert["relatedMetric"]): string {
  return metric in liveMetricMeta ? liveMetricMeta[metric as keyof typeof liveMetricMeta].label : (otherLabels[metric] ?? metric);
}

const accent = { critical: "border-l-orbit-crit", warning: "border-l-orbit-warn", info: "border-l-orbit-cyan" } as const;

export function AlertCard({ alert, header }: { alert: UnifiedAlert; header?: ReactNode }) {
  return (
    <article className={cn("orbit-card border-l-2 p-4", accent[alert.severity], !alert.active && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={alert.severity} />
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] font-medium",
            alert.active ? "border-white/15 text-white" : "border-white/10 text-orbit-muted",
          )}
        >
          {alert.active ? "Active" : "Resolved"}
        </span>
        {alert.live ? (
          <span className="rounded-full border border-orbit-cyan/25 bg-orbit-cyan/10 px-2 py-0.5 text-[11px] font-medium text-orbit-cyan">
            Live detection
          </span>
        ) : null}
        <span className="ml-auto text-xs text-orbit-muted">{alert.timeLabel}</span>
      </div>
      {header ? <div className="mt-3">{header}</div> : null}
      <h3 className="mt-3 text-sm font-semibold text-white">{alert.title}</h3>
      <p className="mt-0.5 text-xs text-orbit-muted">Related to: {metricLabel(alert.relatedMetric)}</p>
      <p className="mt-2 text-sm leading-relaxed text-orbit-text">{alert.explanation}</p>
      <div className="mt-3 flex gap-2 rounded-lg bg-white/[0.04] p-3">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-orbit-cyan" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-orbit-text">
          <span className="font-semibold text-white">Recommended next step: </span>
          {alert.recommendedAction}
        </p>
      </div>
    </article>
  );
}
