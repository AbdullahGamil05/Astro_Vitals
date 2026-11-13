import { CalendarCheck, ClipboardCheck, Flame, HeartPulse, ShieldCheck, type LucideIcon } from "lucide-react";

export type TaskId = "assessment" | "measurements" | "sleep" | "exercise" | "aiReview";

export const MEASUREMENT_TARGET = 10;
export const BONUS_POINTS = 10;
export const STREAK_MIN_POINTS = 50;

export interface TaskDef {
  id: TaskId;
  title: string;
  detail: string;
  points: number;
}

export const TASKS: TaskDef[] = [
  { id: "assessment", title: "Daily health assessment", detail: "Complete the five-minute check-in", points: 20 },
  { id: "measurements", title: "Scheduled health measurements", detail: `Collect ${MEASUREMENT_TARGET} live monitoring readings`, points: 30 },
  { id: "sleep", title: "Record sleep data", detail: "Log last night's sleep summary", points: 10 },
  { id: "exercise", title: "Complete assigned exercise", detail: "ARED resistance protocol, 45 minutes", points: 20 },
  { id: "aiReview", title: "Review AI recommendations", detail: "Read today's AI health analysis", points: 10 },
];

export const MAX_DAILY_POINTS = TASKS.reduce((s, t) => s + t.points, 0) + BONUS_POINTS;

export interface AwardEvent {
  id: string;
  astronautId: string;
  task: TaskId | "bonus";
  points: number;
  ts: number;
}

/**
 * Simulated engagement history for the fictional crew. `history` holds the six days before today
 * (oldest first); `today` is what has already been completed today.
 */
export const engagementSeed: Record<string, { history: TaskId[][]; today: TaskId[] }> = {
  a1: {
    history: [
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
      ["assessment", "measurements", "sleep", "exercise"],
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
    ],
    today: [],
  },
  a2: {
    history: [
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
      ["assessment", "measurements", "sleep", "exercise"],
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
      ["assessment", "measurements", "sleep", "exercise"],
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
    ],
    today: ["assessment", "measurements", "exercise"],
  },
  a3: {
    history: [
      ["assessment", "sleep"],
      ["assessment", "measurements", "sleep"],
      ["assessment", "exercise", "measurements"],
      ["sleep", "assessment"],
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
      ["assessment", "measurements"],
    ],
    today: ["assessment", "sleep"],
  },
  a4: {
    history: [["assessment"], ["assessment", "sleep"], ["sleep"], ["assessment", "measurements"], ["assessment"], ["sleep", "assessment"]],
    today: ["sleep"],
  },
  a5: {
    history: [
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
      ["assessment", "measurements", "sleep", "exercise"],
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
      ["assessment", "measurements", "sleep"],
      ["assessment", "measurements", "sleep", "exercise", "aiReview"],
    ],
    today: ["assessment", "measurements", "sleep", "exercise"],
  },
};

export function dayPoints(tasks: readonly TaskId[]): number {
  const done = new Set(tasks);
  const base = TASKS.filter((t) => done.has(t.id)).reduce((s, t) => s + t.points, 0);
  return base + (TASKS.every((t) => done.has(t.id)) ? BONUS_POINTS : 0);
}

export const isFullDay = (tasks: readonly TaskId[]) => TASKS.every((t) => tasks.includes(t.id));

export function currentStreak(days: readonly (readonly TaskId[])[]): number {
  let i = days.length - 1;
  if (i >= 0 && dayPoints(days[i]) < STREAK_MIN_POINTS) i -= 1;
  let streak = 0;
  while (i >= 0 && dayPoints(days[i]) >= STREAK_MIN_POINTS) {
    streak += 1;
    i -= 1;
  }
  return streak;
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  target: number;
  unit: string;
  measure: (days: readonly (readonly TaskId[])[]) => number;
}

const countDays = (days: readonly (readonly TaskId[])[], test: (d: readonly TaskId[]) => boolean) => days.filter(test).length;

export const BADGES: BadgeDef[] = [
  {
    id: "consistency",
    name: "Consistency Champion",
    description: "Earn 70+ points on at least 5 of the last 7 days.",
    icon: CalendarCheck,
    target: 5,
    unit: "days",
    measure: (d) => countDays(d, (x) => dayPoints(x) >= 70),
  },
  {
    id: "monitoring",
    name: "Health Monitoring Pro",
    description: "Complete scheduled health measurements on all 7 of the last 7 days.",
    icon: HeartPulse,
    target: 7,
    unit: "days",
    measure: (d) => countDays(d, (x) => x.includes("measurements")),
  },
  {
    id: "discipline",
    name: "Mission Discipline",
    description: "Complete every daily task on at least 6 of the last 7 days.",
    icon: ShieldCheck,
    target: 6,
    unit: "days",
    measure: (d) => countDays(d, isFullDay),
  },
  {
    id: "streak",
    name: "7-Day Streak",
    description: `Earn ${STREAK_MIN_POINTS}+ points every day for 7 days in a row.`,
    icon: Flame,
    target: 7,
    unit: "days",
    measure: currentStreak,
  },
  {
    id: "assessment",
    name: "Assessment Champion",
    description: "Submit the daily assessment on all 7 of the last 7 days.",
    icon: ClipboardCheck,
    target: 7,
    unit: "days",
    measure: (d) => countDays(d, (x) => x.includes("assessment")),
  },
];
