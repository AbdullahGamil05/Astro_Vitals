export type HealthStatus = "stable" | "warning" | "critical";
export type Role = "astronaut" | "medical";
export type AlertSeverity = "info" | "warning" | "critical";
export type MetricKind = "heartRate" | "spo2" | "temperature" | "respiratoryRate";

export interface VitalsSnapshot {
  heartRate: number;
  spo2: number;
  temperature: number;
  respiratoryRate: number;
}

export interface HourlyPoint extends VitalsSnapshot {
  label: string;
}

export interface DailyPoint {
  label: string;
  healthIndex: number;
  restingHeartRate: number;
  sleepHours: number;
}

export interface SleepSummary {
  totalHours: number;
  deepHours: number;
  remHours: number;
  efficiency: number;
}

export interface Assessment {
  id: string;
  date: string;
  type: string;
  score: number;
  mood: string;
  summary: string;
}

export interface Astronaut {
  id: string;
  name: string;
  title: string;
  email: string;
  nationality: string;
  age: number;
  heightCm: number;
  weightKg: number;
  bloodType: string;
  missionName: string;
  missionCode: string;
  missionDay: number;
  missionTotalDays: number;
  status: HealthStatus;
  vitals: VitalsSnapshot;
  sleep: SleepSummary;
  lastMeasurement: string;
  lastAssessment: string;
  points: number;
  avatarFrom: string;
  avatarTo: string;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  assessments: Assessment[];
}

export interface HealthAlert {
  id: string;
  astronautId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  time: string;
  active: boolean;
}

export interface HealthEvent {
  id: string;
  astronautId: string;
  severity: AlertSeverity;
  text: string;
  time: string;
}

export interface MissionTask {
  id: string;
  title: string;
  detail: string;
  time: string;
  points: number;
  done: boolean;
}

export interface DemoAccount {
  email: string;
  password: string;
  role: Role;
  name: string;
  title: string;
  astronautId?: string;
  scenario?: HealthStatus;
  avatarFrom: string;
  avatarTo: string;
}
