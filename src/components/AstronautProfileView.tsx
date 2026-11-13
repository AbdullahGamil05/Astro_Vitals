import { Link } from "react-router-dom";
import { ArrowLeft, BrainCircuit, Droplets, HeartPulse, NotebookPen, Thermometer, Wind } from "lucide-react";
import { TrendChart } from "@/components/charts/TrendChart";
import { VitalCard } from "@/components/ui/MetricCard";
import {
  Avatar,
  Card,
  CardHeader,
  ProgressBar,
  SeverityBadge,
  SimulatedTag,
  StatusBadge,
} from "@/components/ui/primitives";
import { alertsFor } from "@/data/operations";
import type { Astronaut } from "@/data/types";
import { statusColor } from "@/lib/health";

function InfoList({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-orbit-dim">{k}</dt>
          <dd className="mt-0.5 text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AstronautProfileView({ astronaut: a, backTo }: { astronaut: Astronaut; backTo?: { to: string; label: string } }) {
  const history = alertsFor(a.id);
  const missionPct = Math.round((a.missionDay / a.missionTotalDays) * 100);

  return (
    <div className="space-y-6">
      {backTo ? (
        <Link to={backTo.to} className="inline-flex items-center gap-1.5 text-sm text-orbit-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {backTo.label}
        </Link>
      ) : null}

      <Card glow className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: statusColor[a.status] }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={a.name} from={a.avatarFrom} to={a.avatarTo} size={72} />
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-ink">{a.name}</h2>
            <p className="mt-0.5 text-sm text-orbit-muted">
              {a.title} · {a.missionCode}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <StatusBadge status={a.status} />
            <p className="mt-2 text-xs text-orbit-muted">Last measurement {a.lastMeasurement}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Personal information" />
          <InfoList
            items={[
              ["Full name", a.name],
              ["Age", `${a.age}`],
              ["Nationality", a.nationality],
              ["Blood type", a.bloodType],
              ["Height", `${a.heightCm} cm`],
              ["Weight", `${a.weightKg} kg`],
              ["Email", a.email],
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Mission information" />
          <InfoList
            items={[
              ["Mission", a.missionName],
              ["Mission code", a.missionCode],
              ["Role", a.title],
              ["Mission day", `${a.missionDay} of ${a.missionTotalDays}`],
            ]}
          />
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-orbit-muted">
              <span>Mission progress</span>
              <span className="font-mono">{missionPct}%</span>
            </div>
            <ProgressBar value={missionPct} />
          </div>
        </Card>
      </div>

      <section aria-labelledby="profile-vitals">
        <div className="mb-3 flex items-center gap-3">
          <h2 id="profile-vitals" className="text-sm font-semibold text-ink">
            Current health metrics
          </h2>
          <SimulatedTag />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <VitalCard kind="heartRate" value={a.vitals.heartRate} icon={HeartPulse} />
          <VitalCard kind="spo2" value={a.vitals.spo2} icon={Droplets} />
          <VitalCard kind="temperature" value={a.vitals.temperature} icon={Thermometer} />
          <VitalCard kind="respiratoryRate" value={a.vitals.respiratoryRate} icon={Wind} />
        </div>
      </section>

      <Card>
        <CardHeader title="Historical health trends — 14 days" subtitle="Daily composite index, resting heart rate and sleep" action={<SimulatedTag />} />
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="mb-1 text-xs font-medium text-orbit-muted">Health index (0-100)</p>
            <TrendChart data={a.daily} xKey="label" dataKey="healthIndex" color={statusColor[a.status]} unit="" name="Health index" domain={[0, 100]} height={170} interval={2} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-orbit-muted">Resting heart rate (bpm)</p>
            <TrendChart data={a.daily} xKey="label" dataKey="restingHeartRate" color="#3B82F6" unit="bpm" name="Resting HR" domain={["auto", "auto"]} height={170} interval={2} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-orbit-muted">Sleep (hours)</p>
            <TrendChart data={a.daily} xKey="label" dataKey="sleepHours" color="#94A3B8" unit="h" name="Sleep" domain={[2, 9]} height={170} interval={2} />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Assessment history" subtitle={`Last assessment: ${a.lastAssessment}`} />
          <ul className="space-y-4">
            {a.assessments.map((s) => (
              <li key={s.id} className="flex gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-semibold"
                  style={{
                    backgroundColor: `${s.score >= 80 ? "#3FBF9F" : s.score >= 60 ? "#F97316" : "#EF4444"}1f`,
                    color: s.score >= 80 ? "#3FBF9F" : s.score >= 60 ? "#F97316" : "#EF4444",
                  }}
                >
                  {s.score}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {s.type} <span className="font-normal text-orbit-dim">· {s.date} · {s.mood}</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-orbit-muted">{s.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Alert history" />
          <ul className="space-y-3">
            {history.length === 0 ? <li className="text-sm text-orbit-muted">No alerts recorded.</li> : null}
            {history.map((al) => (
              <li key={al.id} className="rounded-lg border border-orbit-line bg-black/15 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{al.title}</p>
                  <SeverityBadge severity={al.severity} />
                </div>
                <p className="mt-1 text-xs text-orbit-muted">{al.message}</p>
                <p className="mt-1.5 font-mono text-[11px] text-orbit-dim">
                  {al.time} · {al.active ? "Active" : "Resolved"}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-dashed">
          <CardHeader title="AI insights" subtitle="Stage 2" />
          <div className="flex items-start gap-3 text-sm text-orbit-muted">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orbit-cyan/10 text-orbit-cyan">
              <BrainCircuit className="size-5" aria-hidden="true" />
            </span>
            <p className="leading-relaxed">
              Predictive risk scoring, anomaly explanations and personalised recommendations will appear here once the
              analysis engine is connected.
            </p>
          </div>
        </Card>
        <Card className="border-dashed">
          <CardHeader title="Medical notes" subtitle="Stage 2" />
          <div className="flex items-start gap-3 text-sm text-orbit-muted">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orbit-teal/10 text-orbit-teal">
              <NotebookPen className="size-5" aria-hidden="true" />
            </span>
            <p className="leading-relaxed">
              Flight surgeon notes, treatment plans and follow-up reminders will be recorded and timestamped here.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
