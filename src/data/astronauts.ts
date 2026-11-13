import type {
  Assessment,
  Astronaut,
  DailyPoint,
  HealthStatus,
  HourlyPoint,
  VitalsSnapshot,
} from "./types";

interface TrendShape {
  /** Offset of the 24h-ago value relative to the current value. */
  drift: VitalsSnapshot;
  /** Oscillation amplitude per metric. */
  wobble: VitalsSnapshot;
  phase: number;
}

function buildHourly(current: VitalsSnapshot, shape: TrendShape): HourlyPoint[] {
  return Array.from({ length: 24 }, (_, i) => {
    const progress = (i - 23) / 23;
    const osc = (amp: number, k: number) => amp * Math.sin(i * 0.55 + shape.phase + k);
    const isLast = i === 23;
    const hour = String((i + 1) % 24).padStart(2, "0");
    return {
      label: `${hour}:00`,
      heartRate: isLast
        ? current.heartRate
        : Math.round(current.heartRate + shape.drift.heartRate * -progress + osc(shape.wobble.heartRate, 0)),
      spo2: isLast
        ? current.spo2
        : Math.round(current.spo2 + shape.drift.spo2 * -progress + osc(shape.wobble.spo2, 1)),
      temperature: isLast
        ? current.temperature
        : +(current.temperature + shape.drift.temperature * -progress + osc(shape.wobble.temperature, 2)).toFixed(1),
      respiratoryRate: isLast
        ? current.respiratoryRate
        : Math.round(
            current.respiratoryRate + shape.drift.respiratoryRate * -progress + osc(shape.wobble.respiratoryRate, 3),
          ),
    };
  });
}

function buildDaily(opts: {
  endIndex: number;
  startIndex: number;
  restingHr: number;
  hrDrift: number;
  sleep: number;
  sleepDrift: number;
  phase: number;
}): DailyPoint[] {
  return Array.from({ length: 14 }, (_, i) => {
    const t = i / 13;
    const noise = Math.sin(i * 1.3 + opts.phase);
    return {
      label: i === 13 ? "Today" : `D-${13 - i}`,
      healthIndex: Math.round(opts.startIndex + (opts.endIndex - opts.startIndex) * t + noise * 2),
      restingHeartRate: Math.round(opts.restingHr - opts.hrDrift * (1 - t) + noise * 1.5),
      sleepHours: +(opts.sleep - opts.sleepDrift * (1 - t) + noise * 0.3).toFixed(1),
    };
  });
}

const assessment = (
  id: string,
  date: string,
  score: number,
  mood: string,
  summary: string,
  type = "Daily Wellness Check",
): Assessment => ({ id, date, type, score, mood, summary });

export const astronauts: Astronaut[] = [
  {
    id: "a1",
    name: "Elena Vasquez",
    title: "Mission Commander",
    crewId: "ORBIT-A01",
    nationality: "Spain",
    age: 41,
    heightCm: 172,
    weightKg: 64,
    bloodType: "O+",
    missionName: "Meridian Station Expedition",
    missionCode: "ORBIT-7",
    missionDay: 142,
    missionTotalDays: 180,
    status: "stable",
    vitals: { heartRate: 64, spo2: 98, temperature: 36.7, respiratoryRate: 14 },
    sleep: { totalHours: 7.2, deepHours: 1.6, remHours: 1.9, efficiency: 91 },
    lastMeasurement: "6 min ago",
    lastAssessment: "Today, 07:30 UTC",
    points: 1240,
    avatarFrom: "#3B82F6",
    avatarTo: "#2563EB",
    hourly: buildHourly(
      { heartRate: 64, spo2: 98, temperature: 36.7, respiratoryRate: 14 },
      {
        drift: { heartRate: 2, spo2: 0, temperature: 0, respiratoryRate: 0 },
        wobble: { heartRate: 4, spo2: 0.6, temperature: 0.15, respiratoryRate: 1 },
        phase: 0.4,
      },
    ),
    daily: buildDaily({ startIndex: 90, endIndex: 93, restingHr: 62, hrDrift: 2, sleep: 7.2, sleepDrift: 0.2, phase: 0.2 }),
    assessments: [
      assessment("as-1-1", "Today", 92, "Focused", "Energy high. No discomfort reported. Completed exercise block on schedule."),
      assessment("as-1-2", "Yesterday", 90, "Calm", "Slept well. Mild shoulder stiffness after ARED session."),
      assessment("as-1-3", "D-2", 89, "Motivated", "No symptoms. Hydration on target."),
      assessment("as-1-4", "D-7", 88, "Steady", "Weekly review: all indicators within personal baseline.", "Weekly Review"),
    ],
  },
  {
    id: "a2",
    name: "Kenji Tanaka",
    title: "Flight Engineer",
    crewId: "ORBIT-A02",
    nationality: "Japan",
    age: 38,
    heightCm: 175,
    weightKg: 70,
    bloodType: "A+",
    missionName: "Meridian Station Expedition",
    missionCode: "ORBIT-7",
    missionDay: 142,
    missionTotalDays: 180,
    status: "stable",
    vitals: { heartRate: 68, spo2: 97, temperature: 36.8, respiratoryRate: 15 },
    sleep: { totalHours: 6.8, deepHours: 1.4, remHours: 1.7, efficiency: 88 },
    lastMeasurement: "9 min ago",
    lastAssessment: "Today, 07:42 UTC",
    points: 1185,
    avatarFrom: "#3FBF9F",
    avatarTo: "#0E7490",
    hourly: buildHourly(
      { heartRate: 68, spo2: 97, temperature: 36.8, respiratoryRate: 15 },
      {
        drift: { heartRate: -1, spo2: 0, temperature: 0, respiratoryRate: 0 },
        wobble: { heartRate: 5, spo2: 0.7, temperature: 0.12, respiratoryRate: 1 },
        phase: 1.7,
      },
    ),
    daily: buildDaily({ startIndex: 87, endIndex: 90, restingHr: 66, hrDrift: 1, sleep: 6.9, sleepDrift: 0.1, phase: 1.1 }),
    assessments: [
      assessment("as-2-1", "Today", 89, "Alert", "Minor eye strain after robotics session. Otherwise well."),
      assessment("as-2-2", "Yesterday", 88, "Relaxed", "Good appetite. Exercise completed."),
      assessment("as-2-3", "D-2", 87, "Focused", "No symptoms reported."),
    ],
  },
  {
    id: "a3",
    name: "Amara Okafor",
    title: "Mission Specialist — Biologist",
    crewId: "ORBIT-A03",
    nationality: "Nigeria",
    age: 36,
    heightCm: 168,
    weightKg: 61,
    bloodType: "B+",
    missionName: "Meridian Station Expedition",
    missionCode: "ORBIT-7",
    missionDay: 142,
    missionTotalDays: 180,
    status: "warning",
    vitals: { heartRate: 102, spo2: 94, temperature: 37.3, respiratoryRate: 20 },
    sleep: { totalHours: 5.1, deepHours: 0.8, remHours: 1.0, efficiency: 72 },
    lastMeasurement: "4 min ago",
    lastAssessment: "Today, 07:55 UTC",
    points: 1090,
    avatarFrom: "#F97316",
    avatarTo: "#DB2777",
    hourly: buildHourly(
      { heartRate: 102, spo2: 94, temperature: 37.3, respiratoryRate: 20 },
      {
        drift: { heartRate: -16, spo2: 3, temperature: -0.5, respiratoryRate: -4 },
        wobble: { heartRate: 5, spo2: 0.8, temperature: 0.12, respiratoryRate: 1 },
        phase: 2.6,
      },
    ),
    daily: buildDaily({ startIndex: 84, endIndex: 68, restingHr: 82, hrDrift: -14, sleep: 5.3, sleepDrift: -1.6, phase: 2.2 }),
    assessments: [
      assessment("as-3-1", "Today", 64, "Fatigued", "Reports poor sleep, mild headache and light chest tightness on exertion."),
      assessment("as-3-2", "Yesterday", 70, "Tired", "Sleep interrupted twice. Skipped half of afternoon exercise."),
      assessment("as-3-3", "D-2", 78, "Tense", "Lab workload high. Mild neck tension."),
      assessment("as-3-4", "D-7", 85, "Steady", "Weekly review: trend declining, sleep recovery advised.", "Weekly Review"),
    ],
  },
  {
    id: "a4",
    name: "Lars Henriksen",
    title: "Systems Specialist",
    crewId: "ORBIT-A04",
    nationality: "Norway",
    age: 45,
    heightCm: 184,
    weightKg: 82,
    bloodType: "AB-",
    missionName: "Lunar Gateway Transit",
    missionCode: "ORBIT-8",
    missionDay: 61,
    missionTotalDays: 120,
    status: "critical",
    vitals: { heartRate: 124, spo2: 90, temperature: 38.2, respiratoryRate: 26 },
    sleep: { totalHours: 3.9, deepHours: 0.4, remHours: 0.6, efficiency: 58 },
    lastMeasurement: "1 min ago",
    lastAssessment: "Yesterday, 19:10 UTC",
    points: 760,
    avatarFrom: "#EF4444",
    avatarTo: "#7C3AED",
    hourly: buildHourly(
      { heartRate: 124, spo2: 90, temperature: 38.2, respiratoryRate: 26 },
      {
        drift: { heartRate: -38, spo2: 7, temperature: -1.3, respiratoryRate: -10 },
        wobble: { heartRate: 4, spo2: 0.7, temperature: 0.1, respiratoryRate: 1 },
        phase: 3.4,
      },
    ),
    daily: buildDaily({ startIndex: 82, endIndex: 41, restingHr: 96, hrDrift: -28, sleep: 4.2, sleepDrift: -2.4, phase: 3.1 }),
    assessments: [
      assessment("as-4-1", "Yesterday", 52, "Anxious", "Persistent cough, night sweats, shortness of breath when moving between modules."),
      assessment("as-4-2", "D-2", 61, "Drained", "Sleep very poor. Declined evening exercise."),
      assessment("as-4-3", "D-3", 72, "Tired", "Reports low-grade fever feeling and fatigue."),
    ],
  },
  {
    id: "a5",
    name: "Priya Nair",
    title: "Research Scientist",
    crewId: "ORBIT-A05",
    nationality: "India",
    age: 34,
    heightCm: 163,
    weightKg: 56,
    bloodType: "A-",
    missionName: "Lunar Gateway Transit",
    missionCode: "ORBIT-8",
    missionDay: 61,
    missionTotalDays: 120,
    status: "stable",
    vitals: { heartRate: 71, spo2: 98, temperature: 36.6, respiratoryRate: 15 },
    sleep: { totalHours: 7.0, deepHours: 1.5, remHours: 1.8, efficiency: 90 },
    lastMeasurement: "12 min ago",
    lastAssessment: "Today, 08:05 UTC",
    points: 1010,
    avatarFrom: "#8B5CF6",
    avatarTo: "#3B82F6",
    hourly: buildHourly(
      { heartRate: 71, spo2: 98, temperature: 36.6, respiratoryRate: 15 },
      {
        drift: { heartRate: 1, spo2: 0, temperature: 0, respiratoryRate: 0 },
        wobble: { heartRate: 4, spo2: 0.5, temperature: 0.1, respiratoryRate: 1 },
        phase: 4.5,
      },
    ),
    daily: buildDaily({ startIndex: 88, endIndex: 91, restingHr: 69, hrDrift: 1, sleep: 7.0, sleepDrift: 0.1, phase: 4.0 }),
    assessments: [
      assessment("as-5-1", "Today", 90, "Upbeat", "Feeling well. Minor puffiness in face (expected fluid shift)."),
      assessment("as-5-2", "Yesterday", 89, "Calm", "No symptoms."),
      assessment("as-5-3", "D-2", 88, "Focused", "Good sleep, exercise completed."),
    ],
  },
];

export function getAstronaut(id: string | undefined): Astronaut | undefined {
  return astronauts.find((a) => a.id === id);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const statusLabel: Record<HealthStatus, string> = {
  stable: "Stable",
  warning: "Needs attention",
  critical: "Critical",
};
