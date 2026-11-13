import type { LiveMetric, Sample } from "@/data/monitoring";
import { cn, statusColor, statusText } from "@/lib/health";
import { formatMetric, liveMetricMeta, liveMetricStatus } from "@/lib/monitoring/config";
import { sensorColor, sensorLabel, sensorStatus } from "@/lib/monitoring/sensors";
import { latestValue, toChartPoints } from "@/lib/monitoring/series";
import { formatClock, timeAgo } from "@/lib/time";
import { Card } from "@/components/ui/primitives";
import { LiveChart } from "./LiveChart";

interface MetricPanelProps {
  metric: LiveMetric;
  samples: Sample[];
  baseline: number;
  running: boolean;
}

const statusWord = { stable: "Within range", warning: "Outside range", critical: "Critical range" } as const;

export function MetricPanel({ metric, samples, baseline, running }: MetricPanelProps) {
  const meta = liveMetricMeta[metric];
  const last = samples[samples.length - 1];
  const latest = latestValue(samples, metric);
  const current = last ? last[metric] : null;
  const status = current === null ? null : liveMetricStatus(metric, current);
  const sensor = sensorStatus(last, metric, running);
  const quality = last ? last.quality[metric] : null;
  const showStatus = metric !== "activity";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
          <p className="mt-0.5 truncate text-xs text-orbit-muted">{meta.sensor}</p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-medium"
          style={{ color: sensorColor[sensor] }}
        >
          <span className="size-1.5 rounded-full" style={{ backgroundColor: sensorColor[sensor] }} />
          {sensorLabel[sensor]}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className={cn("font-mono text-3xl font-semibold tabular-nums", status ? statusText[status] : "text-orbit-muted")}>
            {current === null ? "No data" : formatMetric(metric, current)}
            {current !== null ? <span className="ml-1 text-sm font-normal text-orbit-muted">{meta.unit}</span> : null}
          </p>
          {showStatus ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-orbit-muted">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: status ? statusColor[status] : "#7C8BA3" }} />
              {status ? statusWord[status] : "Sensor is not delivering data"}
            </p>
          ) : null}
        </div>
        <dl className="text-right text-xs text-orbit-muted">
          <div>
            <dt className="sr-only">Personal baseline</dt>
            <dd>Baseline {formatMetric(metric, baseline)} {meta.unit}</dd>
          </div>
          <div className="mt-0.5">
            <dt className="sr-only">Signal quality</dt>
            <dd>{quality !== null && current !== null ? `Signal ${quality}%` : "Signal lost"}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-2 text-[11px] text-orbit-muted">
        {latest ? `Last reading ${formatClock(latest.ts)} (${timeAgo(latest.ts)})` : "No readings in this window"}
      </p>

      <div className="mt-3">
        <LiveChart
          points={toChartPoints(samples, metric)}
          color={meta.color}
          name={meta.label}
          unit={meta.unit}
          decimals={meta.decimals}
          domain={meta.domain}
          baseline={metric === "activity" ? undefined : baseline}
        />
      </div>
    </Card>
  );
}
