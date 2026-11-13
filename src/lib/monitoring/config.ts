import type { HealthStatus } from "@/data/types";
import type { LiveMetric } from "@/data/monitoring";
import { metricStatus } from "@/lib/health";

export interface LiveMetricMeta {
  label: string;
  unit: string;
  decimals: number;
  color: string;
  sensor: string;
  domain: [number, number];
}

export const liveMetricMeta: Record<LiveMetric, LiveMetricMeta> = {
  heartRate: { label: "Heart rate", unit: "bpm", decimals: 0, color: "#4A90FF", sensor: "Optical heart-rate sensor (wrist)", domain: [40, 140] },
  spo2: { label: "Blood oxygen (SpO2)", unit: "%", decimals: 0, color: "#20C7A5", sensor: "Pulse oximeter (ear clip)", domain: [86, 100] },
  temperature: { label: "Body temperature", unit: "°C", decimals: 1, color: "#F59E42", sensor: "Skin temperature patch", domain: [35.5, 39] },
  respiratoryRate: { label: "Respiratory rate", unit: "br/min", decimals: 0, color: "#8B9CF7", sensor: "Respiration chest band", domain: [8, 28] },
  activity: { label: "Physical activity", unit: "MET", decimals: 1, color: "#E879A6", sensor: "Motion sensor (IMU)", domain: [0, 8] },
};

export interface Baseline {
  heartRate: number;
  spo2: number;
  temperature: number;
  respiratoryRate: number;
  activity: number;
}

/** Personal baselines for the demo crew (derived from each astronaut's typical resting profile). */
export const baselines: Record<string, Baseline> = {
  a1: { heartRate: 64, spo2: 98, temperature: 36.7, respiratoryRate: 14, activity: 1.5 },
  a2: { heartRate: 68, spo2: 97, temperature: 36.8, respiratoryRate: 15, activity: 1.5 },
  a3: { heartRate: 66, spo2: 97, temperature: 36.7, respiratoryRate: 15, activity: 1.4 },
  a4: { heartRate: 70, spo2: 98, temperature: 36.7, respiratoryRate: 15, activity: 1.5 },
  a5: { heartRate: 71, spo2: 98, temperature: 36.6, respiratoryRate: 15, activity: 1.6 },
};

export function baselineFor(astronautId: string): Baseline {
  return baselines[astronautId] ?? baselines.a1;
}

/** Simplified demo thresholds, not clinical guidance. Activity has no status band. */
export function liveMetricStatus(metric: LiveMetric, value: number): HealthStatus {
  return metric === "activity" ? "stable" : metricStatus(metric, value);
}

export function formatMetric(metric: LiveMetric, value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(liveMetricMeta[metric].decimals);
}
