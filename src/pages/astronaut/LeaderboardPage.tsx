import { Lock, Trophy } from "lucide-react";
import { Avatar, Card, CardHeader, ProgressBar, SimulatedTag } from "@/components/ui/primitives";
import { BONUS_POINTS, MAX_DAILY_POINTS, TASKS } from "@/data/gamification";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/health";
import { useLeaderboard } from "@/lib/useEngagement";

export function LeaderboardPage() {
  const { user } = useAuth();
  const board = useLeaderboard();
  const mine = board.find((e) => e.astronaut.id === user?.astronautId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {mine ? (
        <Card glow>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={mine.astronaut.name} from={mine.astronaut.avatarFrom} to={mine.astronaut.avatarTo} size={52} />
              <div>
                <p className="orbit-eyebrow">Your position</p>
                <p className="font-mono text-3xl font-semibold text-white">
                  #{mine.rank}
                  <span className="ml-2 text-sm font-normal text-orbit-muted">of {board.length}</span>
                </p>
              </div>
            </div>
            {[
              { label: "Total points", value: mine.engagement.totalPoints },
              { label: "This week", value: mine.engagement.weeklyPoints },
              { label: "Today", value: `${mine.engagement.todayPoints} / ${MAX_DAILY_POINTS}` },
              { label: "Streak", value: `${mine.engagement.streak} days` },
            ].map((s) => (
              <div key={s.label}>
                <p className="orbit-eyebrow">{s.label}</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Crew ranking"
          subtitle="Ranked by task completion and engagement. Health status and assessment answers never affect rank."
          action={<SimulatedTag />}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Crew leaderboard</caption>
            <thead className="text-xs text-orbit-muted">
              <tr className="border-b border-orbit-line">
                <th scope="col" className="w-12 py-2 pr-2 font-medium">Rank</th>
                <th scope="col" className="py-2 pr-4 font-medium">Astronaut</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Total</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Week</th>
                <th scope="col" className="w-44 py-2 pr-4 font-medium">Today</th>
                <th scope="col" className="py-2 font-medium">Badges</th>
              </tr>
            </thead>
            <tbody>
              {board.map((e) => {
                const unlocked = e.engagement.badges.filter((b) => b.unlocked);
                const isMe = e.astronaut.id === user?.astronautId;
                return (
                  <tr key={e.astronaut.id} className={cn("border-b border-orbit-line/60 last:border-0", isMe && "bg-orbit-cyan/10")} aria-current={isMe ? "true" : undefined}>
                    <td className="py-3 pr-2 font-mono text-orbit-muted">
                      {e.rank === 1 ? <Trophy className="size-4 text-orbit-warn" aria-label="First place" /> : e.rank}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={e.astronaut.name} from={e.astronaut.avatarFrom} to={e.astronaut.avatarTo} size={32} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">
                            {e.astronaut.name}
                            {isMe ? <span className="ml-2 text-xs font-normal text-orbit-cyan">You</span> : null}
                          </p>
                          <p className="truncate text-xs text-orbit-muted">{e.astronaut.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-orbit-cyan">{e.engagement.totalPoints}</td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-white">{e.engagement.weeklyPoints}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ProgressBar value={e.engagement.completionPct} />
                        </div>
                        <span className="w-9 text-right font-mono text-xs tabular-nums text-orbit-muted">{e.engagement.completionPct}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      {unlocked.length === 0 ? (
                        <span className="text-xs text-orbit-dim">None yet</span>
                      ) : (
                        <ul className="flex gap-1.5">
                          {unlocked.map((b) => (
                            <li
                              key={b.def.id}
                              title={b.def.name}
                              className="flex size-7 items-center justify-center rounded-md bg-orbit-cyan/15 text-orbit-cyan"
                            >
                              <b.def.icon className="size-4" aria-hidden="true" />
                              <span className="sr-only">{b.def.name}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {mine ? (
        <section aria-labelledby="achievements-heading">
          <div className="mb-3 flex items-center gap-3">
            <h2 id="achievements-heading" className="text-sm font-semibold text-white">
              Achievements
            </h2>
            <span className="text-xs text-orbit-muted">
              {mine.engagement.badges.filter((b) => b.unlocked).length} of {mine.engagement.badges.length} unlocked
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mine.engagement.badges.map((b) => (
              <Card key={b.def.id} className={cn("p-4", !b.unlocked && "opacity-80")}>
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      b.unlocked ? "bg-orbit-cyan/15 text-orbit-cyan" : "bg-white/5 text-orbit-dim",
                    )}
                  >
                    {b.unlocked ? <b.def.icon className="size-5" aria-hidden="true" /> : <Lock className="size-5" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{b.def.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-orbit-muted">{b.def.description}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      b.unlocked ? "border-orbit-teal/40 text-orbit-teal" : "border-white/10 text-orbit-muted",
                    )}
                  >
                    {b.unlocked ? "Unlocked" : "Locked"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar value={(b.value / b.def.target) * 100} color={b.unlocked ? "#20C7A5" : "#28C5D8"} />
                  </div>
                  <span className="font-mono text-xs tabular-nums text-orbit-muted">
                    {b.value}/{b.def.target} {b.def.unit}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <Card>
        <CardHeader title="How points work" subtitle="Each task is rewarded once per day. Weekly totals cover the last 7 days." />
        <ul className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {TASKS.map((t) => (
            <li key={t.id} className="flex justify-between border-b border-orbit-line/60 py-1.5">
              <span className="text-orbit-text">{t.title}</span>
              <span className="font-mono text-orbit-cyan">+{t.points}</span>
            </li>
          ))}
          <li className="flex justify-between border-b border-orbit-line/60 py-1.5">
            <span className="text-orbit-text">Complete all daily tasks</span>
            <span className="font-mono text-orbit-cyan">+{BONUS_POINTS}</span>
          </li>
          <li className="flex justify-between py-1.5">
            <span className="font-medium text-white">Daily maximum</span>
            <span className="font-mono text-white">{MAX_DAILY_POINTS}</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
