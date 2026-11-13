import type { AlertSeverity, MetricKind } from "./types";

export type LiveMetric = MetricKind | "activity";

export const LIVE_METRICS: LiveMetric[] = ["heartRate", "spo2", "temperature", "respiratoryRate", "activity"];

export type SensorStatus = "connected" | "weak" | "disconnected" | "idle";

/** One simulated telemetry reading. `null` means the sensor delivered no data. */
export interface Sample {
  ts: number;
  heartRate: number | null;
  spo2: number | null;
  temperature: number | null;
  respiratoryRate: number | null;
  activity: number | null;
  /** Signal quality per metric, 0-100. */
  quality: Record<LiveMetric, number>;
}

export type ScenarioId = "nominal" | "hrDeviation" | "spo2Drop" | "fever" | "sensorDropout";

export interface ScenarioInfo {
  id: ScenarioId;
  label: string;
  description: string;
}

export const scenarios: ScenarioInfo[] = [
  { id: "nominal", label: "Nominal", description: "All metrics stay near the personal baseline." },
  { id: "hrDeviation", label: "Heart rate deviation", description: "Heart rate climbs well above baseline without matching activity." },
  { id: "spo2Drop", label: "Oxygen change", description: "Blood oxygen saturation gradually falls below baseline." },
  { id: "fever", label: "Elevated temperature", description: "Skin temperature rises steadily above baseline." },
  { id: "sensorDropout", label: "Sensor dropout", description: "The pulse oximeter stops delivering data." },
];

export type TimeWindow = "1h" | "6h" | "24h";

export interface Session {
  running: boolean;
  scenario: ScenarioId;
  /** Ticks since the current scenario was selected. */
  scenarioTick: number;
  tick: number;
  startedAt?: number;
  stoppedAt?: number;
}

export type AlertMetric = LiveMetric | "assessment";

export interface LiveAlert {
  id: string;
  astronautId: string;
  ruleId: string;
  severity: Exclude<AlertSeverity, "info">;
  title: string;
  timestamp: number;
  relatedMetric: AlertMetric;
  explanation: string;
  recommendedAction: string;
  active: boolean;
  resolvedAt?: number;
  source: "monitoring" | "assessment";
}

/** Alert shape shared by static demo alerts and live alerts for display. */
export interface UnifiedAlert {
  id: string;
  astronautId: string;
  severity: AlertSeverity;
  title: string;
  relatedMetric: AlertMetric | "environment" | "sleep";
  explanation: string;
  recommendedAction: string;
  timeLabel: string;
  timestamp?: number;
  active: boolean;
  live: boolean;
  acknowledged?: boolean;
  followUp?: FollowUpStatus;
}

export type FollowUpStatus = "none" | "scheduled" | "in_progress" | "completed";

export interface CaseNote {
  id: string;
  author: string;
  ts: number;
  text: string;
}

/** Medical team handling of one alert: acknowledgement, follow-up and notes. */
export interface AlertCase {
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  followUp: FollowUpStatus;
  notes: CaseNote[];
}

export interface AssessmentAnswers {
  exhaustion: boolean;
  headaches: boolean;
  energy: number;
  sleepQuality: number;
  musclePain: boolean;
  mood: number;
  stress: number;
  isolation: number;
  motivation: number;
}

export type PartialAnswers = { [K in keyof AssessmentAnswers]?: AssessmentAnswers[K] };

export type EscalationLevel = "none" | "review" | "urgent";

export interface SubmittedAssessment {
  id: string;
  astronautId: string;
  submittedAt: number;
  answers: AssessmentAnswers;
  score: number;
  flags: string[];
  escalation: EscalationLevel;
}
