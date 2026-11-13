import type { HealthStatus, MetricKind } from "@/data/types";

export const metricMeta: Record<MetricKind, { label: string; unit: string; decimals: number }> = {
  heartRate: { label: "Heart rate", unit: "bpm", decimals: 0 },
  spo2: { label: "SpO2", unit: "%", decimals: 0 },
  temperature: { label: "Body temperature", unit: "°C", decimals: 1 },
  respiratoryRate: { label: "Respiratory rate", unit: "br/min", decimals: 0 },
};

/** Simplified demo thresholds, not clinical guidance. */
export function metricStatus(kind: MetricKind, value: number): HealthStatus {
  switch (kind) {
    case "heartRate":
      if (value > 120 || value < 45) return "critical";
      if (value > 100 || value < 50) return "warning";
      return "stable";
    case "spo2":
      if (value < 92) return "critical";
      if (value < 95) return "warning";
      return "stable";
    case "temperature":
      if (value >= 38 || value < 35.5) return "critical";
      if (value >= 37.5 || value < 36) return "warning";
      return "stable";
    case "respiratoryRate":
      if (value > 24 || value < 10) return "critical";
      if (value > 20 || value < 12) return "warning";
      return "stable";
  }
}

export const statusColor: Record<HealthStatus, string> = {
  stable: "#20C7A5",
  warning: "#F59E42",
  critical: "#F0524F",
};

export const statusText: Record<HealthStatus, string> = {
  stable: "text-orbit-teal",
  warning: "text-orbit-warn",
  critical: "text-orbit-crit",
};

export const statusSoftBg: Record<HealthStatus, string> = {
  stable: "bg-orbit-teal/10 border-orbit-teal/25",
  warning: "bg-orbit-warn/10 border-orbit-warn/25",
  critical: "bg-orbit-crit/10 border-orbit-crit/25",
};

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
