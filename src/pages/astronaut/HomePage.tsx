import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Check,
  CircleDot,
  Flame,
  HeartPulse,
  Moon,
  Rocket,
  Thermometer,
  Trophy,
  Wind,
  Droplets,
} from "lucide-react";
import { TrendChart } from "@/components/charts/TrendChart";
import { VitalCard } from "@/components/ui/MetricCard";
import {
  Avatar,
  Card,
  CardHeader,
  ProgressBar,
  ProgressRing,
  SeverityDot,
  SimulatedTag,
  StatusBadge,
} from "@/components/ui/primitives";
import { getAstronaut, statusLabel } from "@/data/astronauts";
import { alertsFor, initialTasks, leaderboard } from "@/data/operations";
import { useAuth } from "@/lib/auth";
import { cn, statusColor } from "@/lib/health";

export function AstronautHomePage() {
  const { user } = useAuth();
  const me = getAstronaut(user?.astronautId);
  const [tasks, setTasks] = useState(initialTasks);
  if (!me) return null;

  const totalPoints = tasks.reduce((s, t) => s + t.points, 0);
  const earned = tasks.filter((t) => t.done).reduce((s, t) => s + t.points, 0);
  const progress = Math.round((earned / totalPoints) * 100);
  const missionPct = Math.round((me.missionDay / me.missionTotalDays) * 100);
  const board = leaderboard();
  const myAlerts = alertsFor(me.id).slice(0, 4);
  const firstName = me.name.split(" ")[0];

  const toggleTask = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div className="space-y-6">
      {/* Welcome + mission */}
      <Card className="orbit-grid-bg relative overflow-hidden" glow>
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-orbit-cyan/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={me.name} from={me.avatarFrom} to={me.avatarTo} size={64} />
            <div>
              <p className="orbit-eyebrow">Good morning, Commander</p>
              <h2 className="mt-1 text-2xl font-semibold text-white text-balance">Welcome back, {firstName}</h2>
              <p className="mt-1 text-sm text-orbit-muted">
                {me.title} · {me.missionCode} {me.missionName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[440px]">
            <div className="rounded-lg border border-orbit-line bg-black/20 p-3">
              <p className="orbit-eyebrow">Mission day</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-white">
                {me.missionDay}
                <span className="text-sm text-orbit-dim"> / {me.missionTotalDays}</span>
              </p>
              <div className="mt-2">
                <ProgressBar value={missionPct} />
              </div>
            </div>
            <div className="rounded-lg border border-orbit-line bg-black/20 p-3">
              <p className="orbit-eyebrow">Overall health</p>
              <p className="mt-2">
                <StatusBadge status={me.status} />
              </p>
              <p className="mt-2 text-xs text-orbit-muted">Updated {me.lastMeasurement}</p>
            </div>
            <div className="col-span-2 rounded-lg border border-orbit-line bg-black/20 p-3 sm:col-span-1">
              <p className="orbit-eyebrow">Daily points</p>
              <p className="mt-1 flex items-center gap-2 font-mono text-2xl font-semibold text-white">
                <Flame className="size-5 text-orbit-warn" aria-hidden="true" />
                {earned}
              </p>
              <p className="mt-1 text-xs text-orbit-muted">of {totalPoints} available</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Vitals */}
      <section aria-labelledby="vitals-heading">
        <div className="mb-3 flex items-center gap-3">
          <h2 id="vitals-heading" className="text-sm font-semibold text-white">
            Current vitals
          </h2>
          <SimulatedTag />
          <span className="text-xs text-orbit-muted">Last measurement {me.lastMeasurement}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <VitalCard kind="heartRate" value={me.vitals.heartRate} icon={HeartPulse} />
          <VitalCard kind="spo2" value={me.vitals.spo2} icon={Droplets} />
          <VitalCard kind="temperature" value={me.vitals.temperature} icon={Thermometer} />
          <VitalCard kind="respiratoryRate" value={me.vitals.respiratoryRate} icon={Wind} />
        </div>
      </section>

      {/* Charts + sleep */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Health trends — last 24 hours"
            subtitle="Hourly averages from wearable sensors"
            action={<SimulatedTag />}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-orbit-muted">
                <HeartPulse className="size-3.5 text-orbit-cyan" aria-hidden="true" /> Heart rate (bpm)
              </p>
              <TrendChart data={me.hourly} xKey="label" dataKey="heartRate" color="#28C5D8" unit="bpm" name="Heart rate" domain={[50, 90]} height={160} />
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-orbit-muted">
                <Droplets className="size-3.5 text-orbit-teal" aria-hidden="true" /> SpO2 (%)
              </p>
              <TrendChart data={me.hourly} xKey="label" dataKey="spo2" color="#20C7A5" unit="%" name="SpO2" domain={[94, 100]} height={160} />
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-orbit-muted">
                <Thermometer className="size-3.5 text-orbit-warn" aria-hidden="true" /> Body temperature (°C)
              </p>
              <TrendChart data={me.hourly} xKey="label" dataKey="temperature" color="#F59E42" unit="°C" name="Temperature" domain={[36, 37.5]} height={160} />
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-orbit-muted">
                <Wind className="size-3.5 text-[#8B9CF7]" aria-hidden="true" /> Respiratory rate (br/min)
              </p>
              <TrendChart data={me.hourly} xKey="label" dataKey="respiratoryRate" color="#8B9CF7" unit="br/min" name="Respiratory rate" domain={[10, 20]} height={160} />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Sleep summary" subtitle="Last night" action={<SimulatedTag />} />
            <div className="flex items-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-[#8B9CF7]/15 text-[#8B9CF7]">
                <Moon className="size-6" aria-hidden="true" />
              </span>
              <p className="font-mono text-3xl font-semibold text-white">
                {me.sleep.totalHours}
                <span className="ml-1 text-sm text-orbit-muted">hours</span>
              </p>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                { label: "Deep sleep", v: me.sleep.deepHours, max: 2.5, c: "#28C5D8", suffix: "h" },
                { label: "REM sleep", v: me.sleep.remHours, max: 2.5, c: "#8B9CF7", suffix: "h" },
                { label: "Sleep efficiency", v: me.sleep.efficiency, max: 100, c: "#20C7A5", suffix: "%" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between">
                    <dt className="text-orbit-muted">{row.label}</dt>
                    <dd className="font-mono text-white">
                      {row.v}
                      {row.suffix}
                    </dd>
                  </div>
                  <ProgressBar value={(row.v / row.max) * 100} color={row.c} />
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Recent alerts" action={<Link to="/astronaut/history" className="text-xs text-orbit-cyan hover:underline">History</Link>} />
            <ul className="space-y-3">
              {myAlerts.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <SeverityDot severity={a.severity} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{a.title}</p>
                    <p className="text-xs text-orbit-muted">{a.message}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-orbit-dim">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Tasks, progress, leaderboard */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Today's tasks"
            subtitle={`${tasks.filter((t) => t.done).length} of ${tasks.length} completed`}
            action={
              <span className="flex items-center gap-1.5 rounded-full border border-orbit-line px-2.5 py-1 font-mono text-xs text-orbit-muted">
                <Activity className="size-3.5 text-orbit-cyan" aria-hidden="true" />
                {earned} pts
              </span>
            }
          />
          <ul className="divide-y divide-orbit-line">
            {tasks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => toggleTask(t.id)}
                  aria-pressed={t.done}
                  className="flex w-full items-center gap-3 py-3 text-left hover:bg-white/[0.02]"
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border",
                      t.done ? "border-orbit-teal bg-orbit-teal text-orbit-bg" : "border-orbit-dim text-transparent",
                    )}
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm font-medium", t.done ? "text-orbit-muted line-through" : "text-white")}>{t.title}</span>
                    <span className="block truncate text-xs text-orbit-muted">{t.detail}</span>
                  </span>
                  <span className="font-mono text-xs text-orbit-dim">{t.time}</span>
                  <span className="w-14 text-right font-mono text-xs text-orbit-cyan">+{t.points}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card className="flex items-center gap-5">
            <ProgressRing value={progress}>
              <span className="font-mono text-2xl font-semibold text-white">{progress}%</span>
            </ProgressRing>
            <div>
              <h2 className="text-sm font-semibold text-white">Daily mission progress</h2>
              <p className="mt-1 text-xs leading-relaxed text-orbit-muted">
                Complete today&apos;s tasks to keep your health streak and climb the leaderboard.
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-orbit-teal">
                <Rocket className="size-3.5" aria-hidden="true" /> Day {me.missionDay} on track
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Leaderboard"
              subtitle="Crew wellness points"
              action={<Link to="/astronaut/leaderboard" className="text-xs text-orbit-cyan hover:underline">View all</Link>}
            />
            <ol className="space-y-1.5">
              {board.map((a, i) => (
                <li
                  key={a.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2.5 py-2",
                    a.id === me.id && "bg-orbit-cyan/10 ring-1 ring-orbit-cyan/25",
                  )}
                >
                  <span className="w-5 text-center font-mono text-sm text-orbit-muted">
                    {i === 0 ? <Trophy className="mx-auto size-4 text-orbit-warn" aria-label="First place" /> : i + 1}
                  </span>
                  <Avatar name={a.name} from={a.avatarFrom} to={a.avatarTo} size={28} />
                  <span className="min-w-0 flex-1 truncate text-sm text-white">{a.name}</span>
                  <CircleDot className="size-3" style={{ color: statusColor[a.status] }} aria-label={statusLabel[a.status]} />
                  <span className="font-mono text-sm text-orbit-cyan">{a.points}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
