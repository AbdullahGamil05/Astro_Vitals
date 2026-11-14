import { Link, Navigate, useParams } from "react-router-dom";
import { AstronautProfileView } from "@/components/AstronautProfileView";
import { Avatar, StatusBadge } from "@/components/ui/primitives";
import { astronauts, getAstronaut } from "@/data/astronauts";
import { activeAlertsFor } from "@/data/operations";

export function ProfilesPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {astronauts.map((a) => (
        <Link
          key={a.id}
          to={`/medical/astronauts/${a.id}`}
          className="orbit-card group p-5 transition hover:border-orbit-cyan/40 hover:bg-orbit-card-2"
        >
          <div className="flex items-center gap-4">
            <Avatar name={a.name} src={a.photo} from={a.avatarFrom} to={a.avatarTo} size={96} />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold tracking-tight text-ink">{a.name}</p>
              <p className="truncate text-xs text-orbit-muted">{a.title}</p>
              <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-orbit-dim">{a.crewId}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <StatusBadge status={a.status} />
            <span className="font-mono text-xs text-orbit-muted">
              {a.missionCode} · Day {a.missionDay}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-orbit-line pt-4 text-center">
            <div>
              <dt className="text-[11px] text-orbit-dim">HR</dt>
              <dd className="font-mono text-sm text-ink">{a.vitals.heartRate}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-orbit-dim">SpO2</dt>
              <dd className="font-mono text-sm text-ink">{a.vitals.spo2}%</dd>
            </div>
            <div>
              <dt className="text-[11px] text-orbit-dim">Alerts</dt>
              <dd className="font-mono text-sm text-ink">{activeAlertsFor(a.id).length}</dd>
            </div>
          </dl>
        </Link>
      ))}
    </div>
  );
}

export function MedicalAstronautDetailPage() {
  const { id } = useParams();
  const astronaut = getAstronaut(id);
  if (!astronaut) return <Navigate to="/medical/directory" replace />;
  return <AstronautProfileView astronaut={astronaut} backTo={{ to: "/medical/directory", label: "Back to directory" }} />;
}
