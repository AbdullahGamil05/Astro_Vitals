import { Link } from "react-router-dom";
import { Droplets, Flame, HeartPulse, Moon, Rocket, Thermometer, Trophy, Wind } from "lucide-react";
import { TrendChart } from "@/components/charts/TrendChart";
import { DailyTasks } from "@/components/DailyTasks";
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
import { MAX_DAILY_POINTS } from "@/data/gamification";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/health";
import { useAstronaut, useUnifiedAlerts } from "@/lib/liveData";
import { useLeaderboard } from "@/lib/useEngagement";

export function AstronautHomePage() {
  const { user } = useAuth();
  const me = useAstronaut(user?.astronautId);
  const board = useLeaderboard();
  const alerts = useUnifiedAlerts(user?.astronautId);
  if (!me) return null;

  const mine = board.find((e) => e.astronaut.id === me.id);
  const earned = mine?.engagement.todayPoints ?? 0;
  const progress = mine?.engagement.completionPct ?? 0;
  const missionPct = Math.round((me.missionDay / me.missionTotalDays) * 100);
  const myAlerts = alerts.filter((a) => a.active).slice(0, 4);
  const firstName = me.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <Card className="orbit-grid-bg relative overflow-hidden" glow>
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-orbit-cyan/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={me.name} from={me.avatarFrom} to={me.avatarTo} size={64} />
            <div>
              <p className="orbit-eyebrow">Crew console</p>
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
              <p className="mt-1 text-xs text-orbit-muted">of {MAX_DAILY_POINTS} available</p>
            </div>
          </div>
        </div>
      </Card>

      <section aria-labelledby="vitals-heading">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 id="vitals-heading" className="text-sm font-semibold text-white">
            Current vitals
          </h2>
          <SimulatedTag />
          <span className="text-xs text-orbit-muted">Last measurement {me.lastMeasurement}</span>
          <Link to="/astronaut/monitoring" className="ml-auto text-xs text-orbit-cyan hover:underline">
            Open live monitoring
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <VitalCard kind="heartRate" value={me.vitals.heartRate} icon={HeartPulse} />
          <VitalCard kind="spo2" value={me.vitals.spo2} icon={Droplets} />
          <VitalCard kind="temperature" value={me.vitals.temperature} icon={Thermometer} />
          <VitalCard kind="respiratoryRate" value={me.vitals.respiratoryRate} icon={Wind} />
        </div>
      </section>

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
              <TrendChart data={me.hourly} xKey="label" dataKey="heartRate" color="#4A90FF" unit="bpm" name="Heart rate" domain={[50, 90]} height={160} />
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
                { label: "Deep sleep", v: me.sleep.deepHours, max: 2.5, c: "#4A90FF", suffix: "h" },
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
            <CardHeader title="Active alerts" action={<Link to="/astronaut/history" className="text-xs text-orbit-cyan hover:underline">History</Link>} />
            {myAlerts.length === 0 ? (
              <p className="text-sm text-orbit-muted">No active alerts. Readings are within your personal baseline.</p>
            ) : (
              <ul className="space-y-3">
                {myAlerts.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <SeverityDot severity={a.severity} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{a.title}</p>
                      <p className="text-xs text-orbit-muted">{a.explanation}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-orbit-dim">{a.timeLabel}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <DailyTasks astronautId={me.id} />

        <div className="space-y-6">
          <Card className="flex items-center gap-5">
            <ProgressRing value={progress}>
              <span className="font-mono text-2xl font-semibold text-white">{progress}%</span>
            </ProgressRing>
            <div>
              <h2 className="text-sm font-semibold text-white">Daily mission progress</h2>
              <p className="mt-1 text-xs leading-relaxed text-orbit-muted">
                Complete today&apos;s tasks to build your streak and climb the leaderboard.
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-orbit-teal">
                <Rocket className="size-3.5" aria-hidden="true" /> {mine?.engagement.streak ?? 0}-day streak
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Leaderboard"
              subtitle="Ranked by task completion"
              action={<Link to="/astronaut/leaderboard" className="text-xs text-orbit-cyan hover:underline">View all</Link>}
            />
            <ol className="space-y-1.5">
              {board.map((e) => (
                <li
                  key={e.astronaut.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2.5 py-2",
                    e.astronaut.id === me.id && "bg-orbit-cyan/10 ring-1 ring-orbit-cyan/25",
                  )}
                >
                  <span className="w-5 text-center font-mono text-sm text-orbit-muted">
                    {e.rank === 1 ? <Trophy className="mx-auto size-4 text-orbit-warn" aria-label="First place" /> : e.rank}
                  </span>
                  <Avatar name={e.astronaut.name} from={e.astronaut.avatarFrom} to={e.astronaut.avatarTo} size={28} />
                  <span className="min-w-0 flex-1 truncate text-sm text-white">{e.astronaut.name}</span>
                  <span className="font-mono text-sm text-orbit-cyan">{e.engagement.totalPoints}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
