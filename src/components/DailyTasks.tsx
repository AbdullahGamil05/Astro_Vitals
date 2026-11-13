import { Activity, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader } from "@/components/ui/primitives";
import { MEASUREMENT_TARGET, TASKS, type TaskId } from "@/data/gamification";
import { cn } from "@/lib/health";
import { useLive, useTodayReadings } from "@/lib/liveData";
import { useMyEngagement } from "@/lib/useEngagement";

const linkStyle =
  "rounded-lg border border-orbit-cyan/40 px-3 py-1.5 text-xs font-medium text-orbit-cyan transition-colors hover:bg-orbit-cyan/10";

export function DailyTasks({ astronautId }: { astronautId: string }) {
  const { completeTask } = useLive();
  const readings = useTodayReadings(astronautId);
  const mine = useMyEngagement(astronautId);
  const done = new Set<TaskId>(mine?.engagement.today ?? []);

  const action = (id: TaskId) => {
    switch (id) {
      case "assessment":
        return (
          <Link to="/astronaut/assessment" className={linkStyle}>
            Start
          </Link>
        );
      case "measurements":
        return (
          <Link to="/astronaut/monitoring" className={linkStyle}>
            Monitor
          </Link>
        );
      case "aiReview":
        return (
          <Link to="/astronaut/ai-analysis" className={linkStyle}>
            Review
          </Link>
        );
      case "sleep":
        return (
          <button type="button" onClick={() => completeTask(astronautId, "sleep")} className={linkStyle}>
            Record sleep
          </button>
        );
      case "exercise":
        return (
          <button type="button" onClick={() => completeTask(astronautId, "exercise")} className={linkStyle}>
            Mark complete
          </button>
        );
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Today's tasks"
        subtitle={`${done.size} of ${TASKS.length} completed. Points are awarded once per task each day.`}
        action={
          <span className="flex items-center gap-1.5 rounded-full border border-orbit-line px-2.5 py-1 font-mono text-xs text-orbit-muted">
            <Activity className="size-3.5 text-orbit-cyan" aria-hidden="true" />
            {mine?.engagement.todayPoints ?? 0} pts
          </span>
        }
      />
      <ul className="divide-y divide-orbit-line">
        {TASKS.map((t) => {
          const isDone = done.has(t.id);
          const detail =
            t.id === "measurements" && !isDone
              ? `${Math.min(readings, MEASUREMENT_TARGET)} of ${MEASUREMENT_TARGET} live readings collected today`
              : t.detail;
          return (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border",
                  isDone ? "border-orbit-teal bg-orbit-teal text-orbit-bg" : "border-orbit-dim text-transparent",
                )}
              >
                <Check className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{isDone ? "Completed" : "Not completed"}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm font-medium", isDone ? "text-orbit-muted line-through" : "text-white")}>{t.title}</span>
                <span className="block truncate text-xs text-orbit-muted">{detail}</span>
              </span>
              <span className={cn("w-12 text-right font-mono text-xs", isDone ? "text-orbit-teal" : "text-orbit-cyan")}>+{t.points}</span>
              <span className="flex w-28 justify-end">
                {isDone ? <span className="text-xs text-orbit-teal">Done</span> : action(t.id)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
