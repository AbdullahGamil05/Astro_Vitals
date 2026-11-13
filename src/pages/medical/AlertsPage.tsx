import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCard } from "@/components/AlertCard";
import { Avatar, Card } from "@/components/ui/primitives";
import { cn } from "@/lib/health";
import { useAstronauts, useUnifiedAlerts } from "@/lib/liveData";

type StatusFilter = "active" | "resolved" | "all";
type SeverityFilter = "all" | "critical" | "warning" | "info";

function Segmented<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="inline-flex rounded-lg border border-white/10 p-0.5">
        {options.map((o) => (
          <label key={o.id} className="cursor-pointer">
            <input type="radio" name={name} className="peer sr-only" checked={value === o.id} onChange={() => onChange(o.id)} />
            <span className="inline-flex rounded-md px-3 py-1.5 text-sm text-orbit-muted peer-checked:bg-white/10 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-orbit-cyan">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function MedicalAlertsPage() {
  const alerts = useUnifiedAlerts();
  const crew = useAstronauts();
  const [status, setStatus] = useState<StatusFilter>("active");
  const [severity, setSeverity] = useState<SeverityFilter>("all");

  const active = alerts.filter((a) => a.active);
  const shown = alerts.filter(
    (a) => (status === "all" || (status === "active") === a.active) && (severity === "all" || a.severity === severity),
  );

  const stat = (label: string, value: number, tone: string) => (
    <Card key={label} className="p-4">
      <p className="text-xs text-orbit-muted">{label}</p>
      <p className={cn("mt-1 font-mono text-2xl font-semibold tabular-nums", tone)}>{value}</p>
    </Card>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat("Active critical", active.filter((a) => a.severity === "critical").length, "text-orbit-crit")}
        {stat("Active warnings", active.filter((a) => a.severity === "warning").length, "text-orbit-warn")}
        {stat("Live detections", alerts.filter((a) => a.live && a.active).length, "text-orbit-cyan")}
        {stat("Resolved", alerts.filter((a) => !a.active).length, "text-white")}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          name="alert-status"
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { id: "active", label: "Active" },
            { id: "resolved", label: "Resolved" },
            { id: "all", label: "All" },
          ]}
        />
        <Segmented
          name="alert-severity"
          label="Severity"
          value={severity}
          onChange={setSeverity}
          options={[
            { id: "all", label: "Any severity" },
            { id: "critical", label: "Critical" },
            { id: "warning", label: "Warning" },
            { id: "info", label: "Info" },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <Card>
          <p className="text-sm text-orbit-muted">No alerts match these filters.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((a) => {
            const person = crew.find((c) => c.id === a.astronautId);
            return (
              <AlertCard
                key={a.id}
                alert={a}
                header={
                  person ? (
                    <Link to={`/medical/astronauts/${person.id}`} className="inline-flex items-center gap-2 text-sm text-white hover:underline">
                      <Avatar name={person.name} from={person.avatarFrom} to={person.avatarTo} size={24} />
                      {person.name}
                    </Link>
                  ) : null
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
