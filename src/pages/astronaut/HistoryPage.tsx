import { useState } from "react";
import { AlertCard } from "@/components/AlertCard";
import { LiveChart } from "@/components/monitoring/LiveChart";
import { Card, CardHeader, SimulatedTag } from "@/components/ui/primitives";
import { LIVE_METRICS, type LiveMetric, type TimeWindow } from "@/data/monitoring";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/health";
import { useAstronaut, useHistory, useLive, useUnifiedAlerts } from "@/lib/liveData";
import { assessmentSummary } from "@/lib/assessment";
import { baselineFor, formatMetric, liveMetricMeta } from "@/lib/monitoring/config";
import { WINDOW_LABEL, stats, toChartPoints } from "@/lib/monitoring/series";
import { formatClock, formatDateTime } from "@/lib/time";

type Tab = "measurements" | "assessments" | "alerts";
const tabs: { id: Tab; label: string }[] = [
  { id: "measurements", label: "Measurements" },
  { id: "assessments", label: "Assessments" },
  { id: "alerts", label: "Alerts" },
];
const windows: TimeWindow[] = ["1h", "6h", "24h"];

function Measurements({ id }: { id: string }) {
  const [metric, setMetric] = useState<LiveMetric>("heartRate");
  const [window, setWindow] = useState<TimeWindow>("6h");
  const samples = useHistory(id, window);
  const meta = liveMetricMeta[metric];
  const s = stats(samples, metric);
  const recent = samples.slice(-15).reverse();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-orbit-muted">
          Metric
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as LiveMetric)}
            className="h-9 rounded-lg border border-white/10 bg-orbit-card-2 px-3 text-sm text-white"
          >
            {LIVE_METRICS.map((m) => (
              <option key={m} value={m}>
                {liveMetricMeta[m].label}
              </option>
            ))}
          </select>
        </label>
        <div className="inline-flex rounded-lg border border-white/10 p-0.5" role="radiogroup" aria-label="Time window">
          {windows.map((w) => (
            <label key={w} className="cursor-pointer">
              <input type="radio" name="history-window" className="peer sr-only" checked={window === w} onChange={() => setWindow(w)} />
              <span className="inline-flex rounded-md px-3 py-1.5 text-sm text-orbit-muted peer-checked:bg-white/10 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-orbit-cyan">
                {WINDOW_LABEL[w]}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader title={meta.label} subtitle={`Last ${WINDOW_LABEL[window]}, dashed line is your baseline`} action={<SimulatedTag />} />
        <LiveChart
          points={toChartPoints(samples, metric)}
          color={meta.color}
          name={meta.label}
          unit={meta.unit}
          decimals={meta.decimals}
          domain={meta.domain}
          baseline={metric === "activity" ? undefined : baselineFor(id)[metric]}
          height={220}
        />
        {s ? (
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              ["Minimum", s.min],
              ["Average", s.mean],
              ["Maximum", s.max],
            ].map(([label, v]) => (
              <div key={label as string} className="rounded-lg bg-white/[0.04] p-3">
                <dt className="text-xs text-orbit-muted">{label as string}</dt>
                <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-white">
                  {formatMetric(metric, v as number)} <span className="text-xs font-normal text-orbit-muted">{meta.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Most recent readings" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-sm">
            <caption className="sr-only">Most recent {meta.label} readings</caption>
            <thead className="text-xs text-orbit-muted">
              <tr>
                <th scope="col" className="pb-2 font-medium">Time</th>
                <th scope="col" className="pb-2 font-medium">Value</th>
                <th scope="col" className="pb-2 font-medium">Signal quality</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.ts} className="border-t border-orbit-line">
                  <td className="py-2 font-mono text-orbit-muted">{formatClock(r.ts)}</td>
                  <td className="py-2 font-mono tabular-nums text-white">{r[metric] === null ? "No data" : `${formatMetric(metric, r[metric])} ${meta.unit}`}</td>
                  <td className="py-2 text-orbit-muted">{r[metric] === null ? "Lost" : `${r.quality[metric]}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Assessments({ id }: { id: string }) {
  const me = useAstronaut(id);
  const { state } = useLive();
  const submitted = state.assessments.filter((a) => a.astronautId === id).sort((a, b) => b.submittedAt - a.submittedAt);
  if (!me) return null;

  return (
    <div className="space-y-3">
      {submitted.map((a) => (
        <Card key={a.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Daily check-in</h3>
            <span className="text-xs text-orbit-muted">{formatDateTime(a.submittedAt)}</span>
          </div>
          <p className="mt-1 text-sm text-orbit-muted">{assessmentSummary(a)}</p>
          <p className="mt-2 text-xs text-orbit-muted">
            Wellness score <span className="font-mono font-semibold text-white">{a.score}</span>
            {a.escalation !== "none" ? ` · ${a.escalation === "urgent" ? "Urgent review" : "Flagged for review"}` : ""}
          </p>
        </Card>
      ))}
      {me.assessments.map((a) => (
        <Card key={a.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">{a.type}</h3>
            <span className="text-xs text-orbit-muted">{a.date}</span>
          </div>
          <p className="mt-1 text-sm text-orbit-muted">{a.summary}</p>
          <p className="mt-2 text-xs text-orbit-muted">
            Wellness score <span className="font-mono font-semibold text-white">{a.score}</span> · Mood {a.mood}
          </p>
        </Card>
      ))}
      {submitted.length === 0 && me.assessments.length === 0 ? <p className="text-sm text-orbit-muted">No assessments yet.</p> : null}
    </div>
  );
}

function Alerts({ id }: { id: string }) {
  const alerts = useUnifiedAlerts(id);
  if (alerts.length === 0) return <p className="text-sm text-orbit-muted">No alerts have been raised.</p>;
  return (
    <div className="space-y-3">
      {alerts.map((a) => (
        <AlertCard key={a.id} alert={a} />
      ))}
    </div>
  );
}

export function HistoryPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("measurements");
  const id = user?.astronautId;
  if (!id) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div role="tablist" aria-label="Health history sections" className="inline-flex rounded-lg border border-white/10 p-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="history-panel"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm transition-colors",
              tab === t.id ? "bg-white/10 text-white" : "text-orbit-muted hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="history-panel" aria-labelledby={`tab-${tab}`}>
        {tab === "measurements" ? <Measurements id={id} /> : tab === "assessments" ? <Assessments id={id} /> : <Alerts id={id} />}
      </div>
    </div>
  );
}
