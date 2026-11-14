import { astronauts } from "./astronauts";
import type { DemoAccount, HealthAlert, HealthEvent, MissionTask } from "./types";

export const demoAccounts: DemoAccount[] = [
  {
    loginId: "ORBIT-A01",
    password: "demo123",
    role: "astronaut",
    name: "Elena Vasquez",
    title: "Mission Commander",
    astronautId: "a1",
    avatarFrom: "#3B82F6",
    avatarTo: "#2563EB",
    photo: "/images/crew/elena-vasquez.webp",
  },
  {
    loginId: "ORBIT-M01",
    password: "demo123",
    role: "medical",
    name: "Dr. Marcus Reyes",
    title: "Flight Surgeon",
    avatarFrom: "#3FBF9F",
    avatarTo: "#0E7490",
    photo: "/images/crew/marcus-reyes.webp",
  },
];

export const alerts: HealthAlert[] = [
  {
    id: "al1",
    astronautId: "a4",
    severity: "critical",
    title: "SpO2 below critical threshold",
    message: "Blood oxygen saturation at 90% for 12 minutes (threshold 92%).",
    time: "12 min ago",
    active: true,
  },
  {
    id: "al2",
    astronautId: "a4",
    severity: "critical",
    title: "Sustained tachycardia",
    message: "Heart rate above 120 bpm at rest for 28 minutes.",
    time: "28 min ago",
    active: true,
  },
  {
    id: "al3",
    astronautId: "a4",
    severity: "warning",
    title: "Elevated body temperature",
    message: "Temperature trending upward, now 38.2 °C.",
    time: "3 h ago",
    active: true,
  },
  {
    id: "al4",
    astronautId: "a3",
    severity: "warning",
    title: "SpO2 trending low",
    message: "Oxygen saturation has averaged 94% over the last 6 hours.",
    time: "1 h ago",
    active: true,
  },
  {
    id: "al5",
    astronautId: "a3",
    severity: "warning",
    title: "Sleep deficit",
    message: "5.1 hours of sleep, third consecutive night below 6 hours.",
    time: "6 h ago",
    active: true,
  },
  {
    id: "al6",
    astronautId: "a2",
    severity: "info",
    title: "Elevated CO2 in Node 2",
    message: "Ambient CO2 briefly exceeded comfort range. Resolved after scrubber cycle.",
    time: "Yesterday",
    active: false,
  },
  {
    id: "al7",
    astronautId: "a1",
    severity: "info",
    title: "Hydration reminder",
    message: "Fluid intake below daily target. Reminder acknowledged.",
    time: "Yesterday",
    active: false,
  },
  {
    id: "al8",
    astronautId: "a5",
    severity: "info",
    title: "Exercise streak",
    message: "Seven consecutive days of completed exercise protocol.",
    time: "2 days ago",
    active: false,
  },
];

export const healthEvents: HealthEvent[] = [
  { id: "ev1", astronautId: "a4", severity: "critical", text: "SpO2 dropped to 90%", time: "12 min ago" },
  { id: "ev2", astronautId: "a4", severity: "critical", text: "Resting heart rate exceeded 120 bpm", time: "28 min ago" },
  { id: "ev3", astronautId: "a3", severity: "warning", text: "Submitted daily assessment with chest tightness", time: "1 h ago" },
  { id: "ev4", astronautId: "a3", severity: "warning", text: "Three nights of reduced sleep detected", time: "6 h ago" },
  { id: "ev5", astronautId: "a1", severity: "info", text: "Completed exercise protocol", time: "8 h ago" },
  { id: "ev6", astronautId: "a5", severity: "info", text: "Daily assessment submitted — no symptoms", time: "9 h ago" },
];

export const initialTasks: MissionTask[] = [
  { id: "t1", title: "Morning vitals scan", detail: "Wearable calibration and baseline capture", time: "07:00", points: 20, done: true },
  { id: "t2", title: "Daily wellness assessment", detail: "Five-minute symptom and mood check-in", time: "07:30", points: 30, done: true },
  { id: "t3", title: "Resistance exercise (ARED)", detail: "45 minutes, protocol B", time: "10:00", points: 50, done: false },
  { id: "t4", title: "Cardio session (T2 treadmill)", detail: "30 minutes at target heart rate zone", time: "14:30", points: 40, done: false },
  { id: "t5", title: "Hydration and nutrition log", detail: "Record fluid and caloric intake", time: "18:00", points: 20, done: false },
  { id: "t6", title: "Sleep preparation checklist", detail: "Light dimming and cabin temperature set", time: "21:30", points: 20, done: false },
];

export function alertsFor(astronautId: string) {
  return alerts.filter((a) => a.astronautId === astronautId);
}

export function activeAlertsFor(astronautId: string) {
  return alerts.filter((a) => a.astronautId === astronautId && a.active);
}

export function leaderboard() {
  return [...astronauts].sort((a, b) => b.points - a.points);
}
