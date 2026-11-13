import {
  BADGES,
  currentStreak,
  dayPoints,
  engagementSeed,
  MAX_DAILY_POINTS,
  type BadgeDef,
  type TaskId,
} from "@/data/gamification";

const DAY_MS = 86_400_000;

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Completed task ids keyed by astronaut, then by local day. */
export type Ledger = Record<string, Record<string, TaskId[]>>;

export interface BadgeStatus {
  def: BadgeDef;
  value: number;
  unlocked: boolean;
}

export interface Engagement {
  astronautId: string;
  today: TaskId[];
  todayPoints: number;
  completionPct: number;
  weeklyPoints: number;
  totalPoints: number;
  streak: number;
  badges: BadgeStatus[];
}

export function computeEngagement(astronautId: string, basePoints: number, ledger: Ledger, now: number): Engagement {
  const seed = engagementSeed[astronautId] ?? { history: [], today: [] };
  const days: TaskId[][] = [];
  for (let back = 6; back >= 0; back -= 1) {
    const key = dayKey(now - back * DAY_MS);
    const seeded = back === 0 ? seed.today : (seed.history[6 - back] ?? []);
    days.push([...new Set([...seeded, ...(ledger[astronautId]?.[key] ?? [])])]);
  }
  const today = days[6];
  const todayPoints = dayPoints(today);
  const badges = BADGES.map((def) => {
    const value = def.measure(days);
    return { def, value: Math.min(value, def.target), unlocked: value >= def.target };
  });
  return {
    astronautId,
    today,
    todayPoints,
    completionPct: Math.round((todayPoints / MAX_DAILY_POINTS) * 100),
    weeklyPoints: days.reduce((s, d) => s + dayPoints(d), 0),
    totalPoints: basePoints + todayPoints,
    streak: currentStreak(days),
    badges,
  };
}
