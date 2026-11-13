import type { LiveMetric, Sample, ScenarioId } from "@/data/monitoring";
import { LIVE_METRICS } from "@/data/monitoring";
import type { VitalsSnapshot } from "@/data/types";
import { baselineFor, type Baseline } from "./config";

export const TICK_INTERVAL_MS = 2000;
export const SEED_INTERVAL_MS = 5 * 60_000;
export const SEED_POINTS = 288;
export const SEED_LAG_MS = 6 * 60_000;

type Rand = () => number;

export function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const gaussian = (rand: Rand) => (rand() + rand() + rand() + rand() - 2) / 0.58;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number, d: number) => +v.toFixed(d);

function fullQuality(rand: Rand): Record<LiveMetric, number> {
  const q = {} as Record<LiveMetric, number>;
  for (const m of LIVE_METRICS) {
    q[m] = rand() < 0.03 ? Math.round(52 + rand() * 12) : Math.round(90 + rand() * 8);
  }
  return q;
}

interface TickContext {
  baseline: Baseline;
  scenario: ScenarioId;
  scenarioTick: number;
  ts: number;
}

/** Target value each metric is steered towards for the active scenario. */
function targets(ctx: TickContext, rand: Rand) {
  const { baseline: b, scenario } = ctx;
  const ramp = clamp(ctx.scenarioTick / 6, 0, 1);
  const wave = Math.sin(ctx.ts / 45_000);
  const activity = Math.max(0.9, b.activity + wave * 0.15 + (rand() < 0.04 ? 0.8 : 0));
  return {
    activity,
    heartRate: b.heartRate + (activity - b.activity) * 4 + (scenario === "hrDeviation" ? ramp * 38 : 0),
    spo2: b.spo2 - (scenario === "spo2Drop" ? ramp * 8 : 0),
    temperature: b.temperature + (scenario === "fever" ? ramp * 1.5 : 0),
    respiratoryRate: b.respiratoryRate + (activity - b.activity) * 1.5 + (scenario === "spo2Drop" ? ramp * 3 : 0),
  };
}

/** Generates the next simulated reading, smoothing from the previous one. */
export function nextSample(prev: Sample | undefined, ctx: TickContext, rand: Rand = Math.random): Sample {
  const t = targets(ctx, rand);
  const smooth = (target: number, previous: number | null | undefined, noise: number) =>
    (previous == null ? target : previous + (target - previous) * 0.45) + gaussian(rand) * noise;

  const quality = fullQuality(rand);
  const dropout = ctx.scenario === "sensorDropout" && ctx.scenarioTick >= 2;
  if (dropout) quality.spo2 = 0;

  return {
    ts: ctx.ts,
    heartRate: Math.round(clamp(smooth(t.heartRate, prev?.heartRate, 0.9), 35, 190)),
    spo2: dropout ? null : Math.round(clamp(smooth(t.spo2, prev?.spo2, 0.35), 80, 100)),
    temperature: round(clamp(smooth(t.temperature, prev?.temperature, 0.02), 34.5, 41), 2),
    respiratoryRate: Math.round(clamp(smooth(t.respiratoryRate, prev?.respiratoryRate, 0.4), 6, 36)),
    activity: round(clamp(smooth(t.activity, prev?.activity, 0.05), 0.8, 9), 1),
    quality,
  };
}

/**
 * Deterministic 24-hour simulated history ending at `anchor - SEED_LAG_MS`.
 * The last four hours blend towards the astronaut's current static vitals so the
 * history agrees with the rest of the demo data.
 */
export function seedHistory(astronautId: string, vitals: VitalsSnapshot, anchor: number): Sample[] {
  const base = baselineFor(astronautId);
  const rand = mulberry32(hashString(astronautId));
  const end = anchor - SEED_LAG_MS;
  const samples: Sample[] = [];

  for (let i = 0; i < SEED_POINTS; i++) {
    const ts = end - (SEED_POINTS - 1 - i) * SEED_INTERVAL_MS;
    const d = new Date(ts);
    const hour = d.getHours() + d.getMinutes() / 60;
    const asleep = hour >= 23 || hour < 6;
    const exercising = (hour >= 10 && hour < 10.75) || (hour >= 14.5 && hour < 15);
    const activity = asleep ? 0.95 + rand() * 0.1 : exercising ? 4.5 + rand() * 1.5 : 1.2 + rand() * 0.6;
    const circadian = Math.cos(((hour - 15) / 24) * Math.PI * 2);
    const blend = clamp((i - (SEED_POINTS - 48)) / 48, 0, 1) ** 2;

    const hr = base.heartRate + circadian * 3 + (activity - 1.4) * 5 + gaussian(rand) * 1.2;
    const spo2 = base.spo2 + gaussian(rand) * 0.4;
    const temp = base.temperature + circadian * 0.12 + gaussian(rand) * 0.04;
    const rr = base.respiratoryRate + (activity - 1.4) * 1.6 + gaussian(rand) * 0.5;

    samples.push({
      ts,
      heartRate: Math.round(hr + (vitals.heartRate - base.heartRate) * blend),
      spo2: Math.round(clamp(spo2 + (vitals.spo2 - base.spo2) * blend, 80, 100)),
      temperature: round(temp + (vitals.temperature - base.temperature) * blend, 2),
      respiratoryRate: Math.round(rr + (vitals.respiratoryRate - base.respiratoryRate) * blend),
      activity: round(activity, 1),
      quality: fullQuality(rand),
    });
  }
  return samples;
}
