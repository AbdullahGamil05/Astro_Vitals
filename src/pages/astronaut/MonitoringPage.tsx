import { Pause, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { AlertCard } from "@/components/AlertCard";
import { MetricPanel } from "@/components/monitoring/MetricPanel";
import { Card, CardHeader, ProgressBar, SimulatedTag } from "@/components/ui/primitives";
import { LIVE_METRICS, scenarios, type TimeWindow } from "@/data/monitoring";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/health";
import { useAstronaut, useHistory, useLive, useSession, useUnifiedAlerts } from "@/lib/liveData";
import { baselineFor } from "@/lib/monitoring/config";
import { sensorColor, sensorLabel, sensorStatus } from "@/lib/monitoring/sensors";
import { WINDOW_LABEL } from "@/lib/monitoring/series";

const windows: TimeWindow[] = ["1h", "6h", "24h"];

export function MonitoringPage() {
  const { user } = useAuth();
  const id = user?.astronautId;
  const me = useAstronaut(id);
  const session = useSession(id);
  const { start, stop, setScenario, reset } = useLive();
  const [window, setWindow] = useState<TimeWindow>("1h");
  const samples = useHistory(id, window);
  const alerts = useUnifiedAlerts(id).filter((a) => a.active);

  if (!me || !id) return null;
  const baseline = baselineFor(id);
  const last = samples[samples.length - 1];
  const connected = LIVE_METRICS.filter((m) => sensorStatus(last, m, session.running) === "connected").length;
  const sleep = me.daily[me.daily.length - 1];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Card glow>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn("size-2.5 rounded-full", session.running ? "animate-pulse bg-orbit-teal" : "bg-orbit-dim")}
                aria-hidden="true"
              />
              <h2 className="text-base font-semibold text-ink" aria-live="polite">
                {session.running ? "Live monitoring is running" : "Monitoring is stopped"}
              </h2>
              <SimulatedTag />
            </div>
            <p className="mt-1 text-sm text-orbit-muted">
              {session.running
                ? "A new simulated reading arrives every 2 seconds."
                : "Showing stored history. Start monitoring to stream new simulated readings."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (session.running ? stop(id) : start(id))}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors",
                session.running ? "border border-white/15 text-ink hover:bg-white/5" : "bg-orbit-cyan text-orbit-bg hover:bg-orbit-cyan/90",
              )}
            >
              {session.running ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
              {session.running ? "Stop monitoring" : "Start monitoring"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm text-orbit-muted transition-colors hover:bg-white/5 hover:text-ink"
              title="Clear simulated data, alerts and submitted assessments"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset demo
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 border-t border-orbit-line pt-5 lg:grid-cols-[1fr_auto]">
          <fieldset>
            <legend className="orbit-eyebrow">Demo scenario</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {scenarios.map((s) => (
                <label key={s.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="scenario"
                    className="peer sr-only"
                    checked={session.scenario === s.id}
                    onChange={() => setScenario(id, s.id)}
                  />
                  <span className="inline-flex rounded-lg border border-white/10 px-3 py-1.5 text-sm text-orbit-muted transition-colors hover:text-ink peer-checked:border-orbit-cyan peer-checked:bg-orbit-cyan/10 peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-orbit-cyan">
                    {s.label}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-orbit-muted">
              {scenarios.find((s) => s.id === session.scenario)?.description}
              {!session.running ? " Start monitoring to see its effect." : ""}
            </p>
          </fieldset>
          <fieldset>
            <legend className="orbit-eyebrow">Time window</legend>
            <div className="mt-2 inline-flex rounded-lg border border-white/10 p-0.5">
              {windows.map((w) => (
                <label key={w} className="cursor-pointer">
                  <input type="radio" name="window" className="peer sr-only" checked={window === w} onChange={() => setWindow(w)} />
                  <span className="inline-flex rounded-md px-3 py-1.5 text-sm text-orbit-muted peer-checked:bg-white/10 peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-orbit-cyan">
                    {WINDOW_LABEL[w]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      <p className="text-xs text-orbit-muted">
        Sensors: <span className="font-medium text-ink">{connected}</span> of {LIVE_METRICS.length} connected. Dashed line on each chart shows your personal baseline.
      </p>

      {alerts.length > 0 ? (
        <section aria-label="Active alerts" className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Active alerts ({alerts.length})</h2>
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {LIVE_METRICS.map((m) => (
          <MetricPanel key={m} metric={m} samples={samples} baseline={baseline[m]} running={session.running} />
        ))}
        <Card>
          <CardHeader title="Sleep" subtitle="Last recorded night (from the sleep tracker)" />
          {sleep ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <p className="font-mono text-3xl font-semibold tabular-nums text-ink">
                  {sleep.sleepHours.toFixed(1)}
                  <span className="ml-1 text-sm font-normal text-orbit-muted">h</span>
                </p>
                <p className="text-xs text-orbit-muted">Target 7.5 h</p>
              </div>
              <ProgressBar value={(sleep.sleepHours / 8) * 100} color="#94A3B8" />
              <p className="flex items-center gap-1.5 text-xs text-orbit-muted">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: sensorColor.idle }} aria-hidden="true" />
                Sleep is measured once per night, so it does not stream. Sensor: {sensorLabel.idle.toLowerCase()} between sleep periods.
              </p>
            </div>
          ) : (
            <p className="text-sm text-orbit-muted">No sleep data recorded.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
