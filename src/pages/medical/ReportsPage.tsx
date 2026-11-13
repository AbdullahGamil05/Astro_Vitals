import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Download, FileBarChart } from "lucide-react";
import { Avatar, Card, CardHeader, SimulatedTag, StatusBadge } from "@/components/ui/primitives";
import { statusLabel } from "@/data/astronauts";
import { useAlertCases, useAstronauts, useUnifiedAlerts } from "@/lib/liveData";
import { useLeaderboard } from "@/lib/useEngagement";
import { formatDateTime } from "@/lib/time";

interface ReportRow {
  id: string;
  name: string;
  mission: string;
  status: string;
  heartRate: number;
  spo2: number;
  temperature: number;
  respiratoryRate: number;
  sleepHours: number;
  activeAlerts: number;
  acknowledged: number;
  engagementPoints: number;
  lastAssessment: string;
}

const csvColumns: { key: keyof ReportRow; label: string }[] = [
  { key: "name", label: "Astronaut" },
  { key: "mission", label: "Mission" },
  { key: "status", label: "Status" },
  { key: "heartRate", label: "Heart rate (bpm)" },
  { key: "spo2", label: "SpO2 (%)" },
  { key: "temperature", label: "Temperature (C)" },
  { key: "respiratoryRate", label: "Respiratory rate (br/min)" },
  { key: "sleepHours", label: "Sleep (h)" },
  { key: "activeAlerts", label: "Active alerts" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "engagementPoints", label: "Engagement points" },
  { key: "lastAssessment", label: "Last assessment" },
];

function toCsv(rows: ReportRow[]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = csvColumns.map((c) => escape(c.label)).join(",");
  const body = rows.map((r) => csvColumns.map((c) => escape(r[c.key])).join(","));
  return [header, ...body].join("\n");
}

export function ReportsPage() {
  const crew = useAstronauts();
  const alerts = useUnifiedAlerts();
  const cases = useAlertCases();
  const board = useLeaderboard();

  const rows = useMemo<ReportRow[]>(
    () =>
      crew.map((a) => {
        const mine = alerts.filter((x) => x.astronautId === a.id && x.active);
        return {
          id: a.id,
          name: a.name,
          mission: a.missionCode,
          status: statusLabel[a.status],
          heartRate: Math.round(a.vitals.heartRate),
          spo2: Math.round(a.vitals.spo2),
          temperature: Number(a.vitals.temperature.toFixed(1)),
          respiratoryRate: Math.round(a.vitals.respiratoryRate),
          sleepHours: Number(a.sleep.totalHours.toFixed(1)),
          activeAlerts: mine.length,
          acknowledged: mine.filter((x) => x.acknowledged || cases[x.id]?.acknowledgedAt).length,
          engagementPoints: board.find((b) => b.astronaut.id === a.id)?.engagement.totalPoints ?? a.points,
          lastAssessment: a.lastAssessment,
        };
      }),
    [crew, alerts, cases, board],
  );

  const totals = {
    active: rows.reduce((s, r) => s + r.activeAlerts, 0),
    acknowledged: rows.reduce((s, r) => s + r.acknowledged, 0),
    attention: crew.filter((a) => a.status !== "stable").length,
  };

  const download = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crew-health-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Crew members", value: crew.length },
          { label: "Requiring attention", value: totals.attention },
          { label: "Alerts acknowledged", value: `${totals.acknowledged} / ${totals.active}` },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="orbit-eyebrow">{s.label}</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-white">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Crew health summary"
          subtitle={`Generated ${formatDateTime(Date.now())} from current monitoring and assessment data`}
          action={
            <div className="flex items-center gap-2">
              <SimulatedTag />
              <button
                type="button"
                onClick={download}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orbit-cyan to-orbit-teal px-3 py-2 text-xs font-semibold text-orbit-bg transition hover:brightness-110"
              >
                <Download className="size-4" aria-hidden="true" />
                Export CSV
              </button>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <caption className="sr-only">Crew health summary report</caption>
            <thead>
              <tr className="border-b border-orbit-line text-xs text-orbit-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Astronaut</th>
                <th scope="col" className="px-3 py-2 font-medium">Status</th>
                <th scope="col" className="px-3 py-2 font-medium">HR</th>
                <th scope="col" className="px-3 py-2 font-medium">SpO2</th>
                <th scope="col" className="px-3 py-2 font-medium">Temp</th>
                <th scope="col" className="px-3 py-2 font-medium">Sleep</th>
                <th scope="col" className="px-3 py-2 font-medium">Alerts</th>
                <th scope="col" className="px-3 py-2 font-medium">Points</th>
                <th scope="col" className="py-2 pl-3 font-medium">Last assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orbit-line">
              {rows.map((r) => {
                const a = crew.find((c) => c.id === r.id)!;
                return (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 pr-3">
                      <Link to={`/medical/astronauts/${r.id}`} className="flex items-center gap-2.5 text-white hover:underline">
                        <Avatar name={a.name} from={a.avatarFrom} to={a.avatarTo} size={28} />
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={a.status} compact />
                    </td>
                    <td className="px-3 py-3 font-mono text-white/90">{r.heartRate}</td>
                    <td className="px-3 py-3 font-mono text-white/90">{r.spo2}%</td>
                    <td className="px-3 py-3 font-mono text-white/90">{r.temperature}</td>
                    <td className="px-3 py-3 font-mono text-white/90">{r.sleepHours} h</td>
                    <td className="px-3 py-3 font-mono text-white/90">
                      {r.activeAlerts}
                      {r.activeAlerts ? <span className="text-orbit-muted"> ({r.acknowledged} ack)</span> : null}
                    </td>
                    <td className="px-3 py-3 font-mono text-white/90">{r.engagementPoints}</td>
                    <td className="py-3 pl-3 text-orbit-muted">{r.lastAssessment}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-orbit-dim">
          <FileBarChart className="size-4" aria-hidden="true" />
          Individual reports are available from each astronaut&apos;s profile.
        </p>
      </Card>
    </div>
  );
}
