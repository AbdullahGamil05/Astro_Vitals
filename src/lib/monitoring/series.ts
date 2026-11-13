import type { LiveMetric, Sample, TimeWindow } from "@/data/monitoring";

export const WINDOW_MS: Record<TimeWindow, number> = {
  "1h": 3_600_000,
  "6h": 21_600_000,
  "24h": 86_400_000,
};

export const WINDOW_LABEL: Record<TimeWindow, string> = {
  "1h": "1 hour",
  "6h": "6 hours",
  "24h": "24 hours",
};

export function windowSamples(all: Sample[], window: TimeWindow, now: number): Sample[] {
  const from = now - WINDOW_MS[window];
  return all.filter((s) => s.ts >= from);
}

export interface ChartPoint {
  ts: number;
  value: number | null;
}

/** Buckets samples into at most `maxPoints` averaged points. A bucket with no data stays `null` so charts show gaps. */
export function toChartPoints(samples: Sample[], metric: LiveMetric, maxPoints = 72): ChartPoint[] {
  if (samples.length === 0) return [];
  const size = Math.max(1, Math.ceil(samples.length / maxPoints));
  const points: ChartPoint[] = [];
  for (let i = 0; i < samples.length; i += size) {
    const bucket = samples.slice(i, i + size);
    const values = bucket.map((s) => s[metric]).filter((v): v is number => v !== null);
    points.push({
      ts: bucket[Math.floor(bucket.length / 2)].ts,
      value: values.length ? +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : null,
    });
  }
  return points;
}

export function latestValue(samples: Sample[], metric: LiveMetric): { value: number; ts: number } | null {
  for (let i = samples.length - 1; i >= 0; i--) {
    const v = samples[i][metric];
    if (v !== null) return { value: v, ts: samples[i].ts };
  }
  return null;
}

export function stats(samples: Sample[], metric: LiveMetric) {
  const values = samples.map((s) => s[metric]).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const first = samples.find((s) => s[metric] !== null);
  const last = [...samples].reverse().find((s) => s[metric] !== null);
  const hours = first && last && last.ts > first.ts ? (last.ts - first.ts) / 3_600_000 : 0;
  const half = Math.max(1, Math.floor(values.length / 4));
  const head = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const tail = values.slice(-half).reduce((a, b) => a + b, 0) / half;
  return {
    mean,
    min: Math.min(...values),
    max: Math.max(...values),
    slopePerHour: hours > 0 ? (tail - head) / hours : 0,
    count: values.length,
  };
}
