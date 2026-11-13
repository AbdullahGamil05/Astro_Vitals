import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { Avatar, Card, StatusBadge } from "@/components/ui/primitives";
import { astronauts } from "@/data/astronauts";
import { activeAlertsFor } from "@/data/operations";
import { cn } from "@/lib/health";

export function DirectoryPage() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return astronauts.filter(
      (a) =>
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.missionName.toLowerCase().includes(q) ||
        a.missionCode.toLowerCase().includes(q) ||
        a.status.includes(q),
    );
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-orbit-muted">
          {rows.length} of {astronauts.length} astronauts
        </p>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-orbit-dim" aria-hidden="true" />
          <label htmlFor="directory-search" className="sr-only">
            Search astronauts
          </label>
          <input
            id="directory-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, mission or status"
            className="w-full rounded-lg border border-orbit-line bg-orbit-card py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-orbit-dim focus:border-orbit-cyan focus:outline-none"
          />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-orbit-line">
                {["Astronaut", "Mission", "Health status", "Last measurement", "Last assessment", "Active alerts", ""].map((h) => (
                  <th key={h} scope="col" className="orbit-eyebrow px-5 py-3 font-medium">
                    {h || <span className="sr-only">Open</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-orbit-line">
              {rows.map((a) => {
                const active = activeAlertsFor(a.id).length;
                return (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/medical/astronauts/${a.id}`)}
                    className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/medical/astronauts/${a.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-3"
                      >
                        <Avatar name={a.name} from={a.avatarFrom} to={a.avatarTo} size={36} />
                        <span>
                          <span className="block font-medium text-white">{a.name}</span>
                          <span className="block text-xs text-orbit-muted">{a.title}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="block text-white">{a.missionCode}</span>
                      <span className="block text-xs text-orbit-muted">Day {a.missionDay}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-orbit-muted">{a.lastMeasurement}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-orbit-muted">{a.lastAssessment}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 font-mono text-xs",
                          active === 0 ? "bg-white/5 text-orbit-muted" : a.status === "critical" ? "bg-orbit-crit/15 text-orbit-crit" : "bg-orbit-warn/15 text-orbit-warn",
                        )}
                      >
                        {active}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-orbit-dim">
                      <ChevronRight className="inline size-4" aria-hidden="true" />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-orbit-muted">
                    No astronauts match &ldquo;{query}&rdquo;.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
