import type { LiveMetric, Sample, SensorStatus } from "@/data/monitoring";

export const sensorLabel: Record<SensorStatus, string> = {
  connected: "Connected",
  weak: "Weak signal",
  disconnected: "No signal",
  idle: "Idle",
};

export const sensorColor: Record<SensorStatus, string> = {
  connected: "#20C7A5",
  weak: "#F59E42",
  disconnected: "#F0524F",
  idle: "#7C8BA3",
};

export function sensorStatus(last: Sample | undefined, metric: LiveMetric, running: boolean): SensorStatus {
  if (!last) return "idle";
  if (last[metric] === null) return running ? "disconnected" : "idle";
  if (!running) return "idle";
  return last.quality[metric] < 70 ? "weak" : "connected";
}
