import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn, metricMeta, metricStatus, statusColor, statusText } from "@/lib/health";
import type { MetricKind } from "@/data/types";
import { SimulatedTag } from "./primitives";

function HudReticles() {
  return (
    <span className="hud-reticles" aria-hidden="true">
      {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((corner) => (
        <span key={corner} className={`hud-reticle hud-reticle-${corner}`} />
      ))}
    </span>
  );
}

function AnimatedNumber({
  value,
  decimals,
  transitionKey,
}: {
  value: number;
  decimals: number;
  transitionKey?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const displayedValue = useRef(value);
  const previousKey = useRef(transitionKey);

  useEffect(() => {
    if (
      transitionKey === undefined ||
      previousKey.current === transitionKey ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      previousKey.current = transitionKey;
      displayedValue.current = value;
      setDisplayValue(value);
      return;
    }

    previousKey.current = transitionKey;
    const startValue = displayedValue.current;
    const startTime = performance.now();
    const duration = 650;
    let frame = 0;

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const nextValue = startValue + (value - startValue) * eased;
      displayedValue.current = nextValue;
      setDisplayValue(nextValue);
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [value, transitionKey]);

  return <span className="font-mono text-4xl font-medium tabular-nums tracking-tight text-ink">{displayValue.toFixed(decimals)}</span>;
}

export function VitalCard({
  kind,
  value,
  icon: Icon,
  transitionKey,
}: {
  kind: MetricKind;
  value: number;
  icon: LucideIcon;
  transitionKey?: string;
}) {
  const meta = metricMeta[kind];
  const status = metricStatus(kind, value);
  return (
    <div className="orbit-card hud-card p-5">
      <HudReticles />
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-orbit-muted">
          <Icon className="size-3.5 text-orbit-dim" aria-hidden="true" />
          {meta.label}
        </span>
        <SimulatedTag />
      </div>
      <p className="mt-5 flex items-baseline gap-1.5">
        <AnimatedNumber value={value} decimals={meta.decimals} transitionKey={transitionKey} />
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
    <div className="orbit-card hud-card p-6">
      <HudReticles />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-orbit-muted">{label}</span>
        <Icon className="size-4" style={{ color }} aria-hidden="true" />
      </div>
      <p className="mt-5 font-mono text-4xl font-medium tabular-nums tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-3 border-t border-white/10 pt-3 text-xs text-orbit-muted">{hint}</p> : null}
    </div>
  );
}
