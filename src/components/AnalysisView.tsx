import { AlertTriangle, CheckCircle2, Info, Siren } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/primitives";
import { cn } from "@/lib/health";
import { formatMetric, liveMetricMeta } from "@/lib/monitoring/config";
import type { AnalysisResponse, Insight, InsightSeverity } from "@/services/ai/schema";

export const levelStyle = {
  stable: { label: "Stable", color: "text-orbit-teal", box: "border-orbit-teal/30 bg-orbit-teal/10", icon: CheckCircle2 },
  attention: { label: "Needs attention", color: "text-orbit-warn", box: "border-orbit-warn/30 bg-orbit-warn/10", icon: AlertTriangle },
  concern: { label: "Prompt review advised", color: "text-orbit-crit", box: "border-orbit-crit/30 bg-orbit-crit/10", icon: Siren },
} as const;

const sevDot: Record<InsightSeverity, string> = {
  info: "bg-orbit-cyan",
  warning: "bg-orbit-warn",
  critical: "bg-orbit-crit",
};
const sevWord: Record<InsightSeverity, string> = { info: "Info", warning: "Warning", critical: "Critical" };

const priorityStyle = {
  urgent: "border-orbit-crit/40 text-orbit-crit",
  soon: "border-orbit-warn/40 text-orbit-warn",
  routine: "border-white/15 text-orbit-muted",
} as const;

function InsightList({ items, empty }: { items: Insight[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-orbit-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.id} className="flex gap-3">
          <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", sevDot[i.severity])} aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-ink">
              {i.title} <span className="sr-only">({sevWord[i.severity]})</span>
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-orbit-muted">{i.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-orbit-muted marker:text-orbit-dim">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

export function AnalysisView({ analysis, banner }: { analysis: AnalysisResponse; banner?: ReactNode }) {
  const level = levelStyle[analysis.overall.level];
  const Icon = level.icon;

  return (
    <div className="space-y-4">
      {banner}
      <section className={cn("rounded-lg border p-5", level.box)} aria-labelledby="analysis-overall">
        <div className="flex items-start gap-3">
          <Icon className={cn("mt-0.5 size-6 shrink-0", level.color)} aria-hidden="true" />
          <div>
            <p className={cn("orbit-eyebrow", level.color)}>{level.label}</p>
            <h2 id="analysis-overall" className="mt-1 text-lg font-semibold text-ink text-balance">
              {analysis.overall.headline}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-orbit-text text-pretty">{analysis.overall.summary}</p>
          </div>
        </div>
        <p
          className={cn(
            "mt-4 rounded-lg border px-3 py-2 text-sm",
            analysis.escalation.recommended ? "border-orbit-crit/30 bg-orbit-crit/10 text-ink" : "border-white/10 bg-black/20 text-orbit-muted",
          )}
        >
          <span className="font-semibold">{analysis.escalation.recommended ? "Escalation recommended. " : "No escalation needed. "}</span>
          {analysis.escalation.reason}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Physical health insights" subtitle="Vital signs, sleep and reported symptoms" />
          <InsightList items={analysis.physical} empty="No physical findings to report." />
        </Card>
        <Card>
          <CardHeader title="Psychological health insights" subtitle="Self-reported mood, stress and motivation" />
          <InsightList items={analysis.psychological} empty="No psychological findings to report." />
        </Card>
      </div>

      <Card>
        <CardHeader title="Deviations from your personal baseline" subtitle="Compared with this astronaut's own typical values" />
        {analysis.deviations.length === 0 ? (
          <p className="text-sm text-orbit-muted">All measured vital signs are close to the personal baseline.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-sm">
              <thead className="text-xs text-orbit-muted">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Metric</th>
                  <th className="pb-2 pr-4 font-medium">Observed</th>
                  <th className="pb-2 pr-4 font-medium">Baseline</th>
                  <th className="pb-2 pr-4 font-medium">Difference</th>
                  <th className="pb-2 font-medium">Level</th>
                </tr>
              </thead>
              <tbody>
                {analysis.deviations.map((d) => {
                  const meta = liveMetricMeta[d.metric];
                  return (
                    <tr key={d.metric} className="border-t border-orbit-line">
                      <td className="py-2 pr-4 text-ink">{meta.label}</td>
                      <td className="py-2 pr-4 font-mono tabular-nums">{formatMetric(d.metric, d.observed)} {meta.unit}</td>
                      <td className="py-2 pr-4 font-mono tabular-nums text-orbit-muted">{formatMetric(d.metric, d.baseline)} {meta.unit}</td>
                      <td className="py-2 pr-4 font-mono tabular-nums">{d.delta > 0 ? "+" : ""}{d.delta.toFixed(meta.decimals)}</td>
                      <td className="py-2">
                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", d.severity === "critical" ? "border-orbit-crit/40 text-orbit-crit" : "border-orbit-warn/40 text-orbit-warn")}>
                          {sevWord[d.severity]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recommendations" subtitle="Suggested next steps, most urgent first" />
          <ul className="space-y-3">
            {[...analysis.recommendations]
              .sort((a, b) => ["urgent", "soon", "routine"].indexOf(a.priority) - ["urgent", "soon", "routine"].indexOf(b.priority))
              .map((r) => (
                <li key={r.id} className="flex items-start gap-3">
                  <span className={cn("mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", priorityStyle[r.priority])}>
                    {r.priority}
                  </span>
                  <p className="text-sm leading-relaxed text-orbit-text">{r.text}</p>
                </li>
              ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Why you are seeing this" subtitle="Plain-language explanation of each finding" />
          <BulletList items={analysis.explanations} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Data used" />
          <BulletList items={analysis.dataUsed.length ? analysis.dataUsed : ["No data was available."]} />
        </Card>
        <Card>
          <CardHeader title="Limitations" />
          <BulletList items={analysis.limitations} />
        </Card>
      </div>

      <div className="flex gap-3 rounded-lg border border-orbit-line bg-black/20 p-4 text-xs leading-relaxed text-orbit-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-orbit-cyan" aria-hidden="true" />
        <p>
          {analysis.disclaimer}{" "}
          <span className="text-orbit-dim">
            Engine: {analysis.engine.name} · generated {new Date(analysis.generatedAt).toLocaleTimeString()}
          </span>
        </p>
      </div>
    </div>
  );
}
