import { Link } from "react-router-dom";
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, HeartPulse, ShieldAlert, Users } from "lucide-react";
import { axisTick, chartTooltipStyle } from "@/components/charts/TrendChart";
import { StatCard } from "@/components/ui/MetricCard";
import { Avatar, Card, CardHeader, SeverityDot, SimulatedTag } from "@/components/ui/primitives";
import { astronauts, getAstronaut } from "@/data/astronauts";
import { healthEvents } from "@/data/operations";
import { statusColor } from "@/lib/health";
import { useAstronauts, useUnifiedAlerts } from "@/lib/liveData";

const crewTrend = astronauts[0].daily.map((d, i) => ({
  label: d.label,
  ...Object.fromEntries(astronauts.map((a) => [a.id, a.daily[i].healthIndex])),
}));

export function MedicalOverviewPage() {
  const crew = useAstronauts();
  const alerts = useUnifiedAlerts();
  const stable = crew.filter((a) => a.status === "stable").length;
  const warning = crew.filter((a) => a.status === "warning").length;
  const critical = crew.filter((a) => a.status === "critical").length;
  const criticalAlerts = alerts.filter((a) => a.active && a.severity === "critical").length;

  const distribution = [
    { name: "Stable", value: stable, color: statusColor.stable },
    { name: "Needs attention", value: warning, color: statusColor.warning },
    { name: "Critical", value: critical, color: statusColor.critical },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total astronauts" value={crew.length} hint="Across 2 active missions" icon={Users} />
        <StatCard label="Stable" value={stable} hint="Within personal baseline" icon={HeartPulse} color="#20C7A5" />
        <StatCard label="Requiring attention" value={warning + critical} hint={`${warning} warning · ${critical} critical`} icon={AlertTriangle} color="#F59E42" />
        <StatCard label="Critical alerts" value={criticalAlerts} hint="Active, unresolved" icon={ShieldAlert} color="#F0524F" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Mission health overview"
            subtitle="Composite health index per astronaut, last 14 days"
            action={<SimulatedTag />}
          />
          <div style={{ height: 300 }} role="img" aria-label="Crew health index over 14 days">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={crewTrend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgb(255 255 255 / 0.05)" vertical={false} />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={[20, 100]} width={44} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: "#8AA0BA" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#8AA0BA" }} iconType="circle" />
                {astronauts.map((a) => (
                  <Line
                    key={a.id}
                    type="monotone"
                    dataKey={a.id}
                    name={a.name}
                    stroke={a.status === "stable" ? ["#28C5D8", "#20C7A5", "#8B9CF7"][astronauts.filter((x) => x.status === "stable").indexOf(a)] : statusColor[a.status]}
                    strokeWidth={a.status === "stable" ? 1.8 : 2.6}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Crew status" subtitle="Current distribution" />
          <div style={{ height: 220 }} role="img" aria-label="Crew status distribution">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3} stroke="none">
                  {distribution.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-2 text-sm">
            {distribution.map((d) => (
              <li key={d.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-orbit-muted">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span className="font-mono text-white">{d.value}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent health events"
          action={
            <Link to="/medical/alerts" className="text-xs text-orbit-cyan hover:underline">
              Medical alerts
            </Link>
          }
        />
        <ul className="divide-y divide-orbit-line">
          {healthEvents.map((ev) => {
            const a = getAstronaut(ev.astronautId);
            if (!a) return null;
            return (
              <li key={ev.id}>
                <Link to={`/medical/astronauts/${a.id}`} className="flex items-center gap-3 py-3 hover:bg-white/[0.02]">
                  <SeverityDot severity={ev.severity} />
                  <Avatar name={a.name} from={a.avatarFrom} to={a.avatarTo} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white">{ev.text}</span>
                    <span className="block text-xs text-orbit-muted">{a.name}</span>
                  </span>
                  <span className="font-mono text-xs text-orbit-dim">{ev.time}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
