import type { LiveAlert, LiveMetric, Sample, SubmittedAssessment, TimeWindow } from "@/data/monitoring";
import { LIVE_METRICS } from "@/data/monitoring";
import type { Astronaut } from "@/data/types";
import { baselineFor } from "@/lib/monitoring/config";
import { latestValue, stats, windowSamples } from "@/lib/monitoring/series";
import { ANALYSIS_SCHEMA_VERSION, type AnalysisRequest } from "./schema";

interface BuildInput {
  astronaut: Astronaut;
  /** Up to 24h of merged seed + live samples, ascending. */
  samples: Sample[];
  alerts: LiveAlert[];
  assessment?: SubmittedAssessment;
  now: number;
}

const windows: TimeWindow[] = ["1h", "6h", "24h"];

export function buildAnalysisRequest({ astronaut, samples, alerts, assessment, now }: BuildInput): AnalysisRequest {
  const baseline = baselineFor(astronaut.id);
  const last = samples[samples.length - 1];

  const values = {} as Record<LiveMetric, number | null>;
  const signalQuality = {} as Record<LiveMetric, number | null>;
  for (const m of LIVE_METRICS) {
    values[m] = last ? last[m] : null;
    signalQuality[m] = last ? last.quality[m] : null;
  }

  const trends: AnalysisRequest["trends"] = [];
  for (const window of windows) {
    const inWindow = windowSamples(samples, window, now);
    for (const metric of LIVE_METRICS) {
      const s = stats(inWindow, metric);
      if (!s) continue;
      trends.push({
        metric,
        window,
        mean: +s.mean.toFixed(2),
        min: s.min,
        max: s.max,
        slopePerHour: +s.slopePerHour.toFixed(2),
        deltaFromBaseline: +(s.mean - baseline[metric]).toFixed(2),
      });
    }
  }

  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    requestId: `req-${astronaut.id}-${now}`,
    requestedAt: new Date(now).toISOString(),
    astronaut: {
      id: astronaut.id,
      ageYears: astronaut.age,
      missionDay: astronaut.missionDay,
      missionTotalDays: astronaut.missionTotalDays,
    },
    baseline: { ...baseline },
    currentMetrics: {
      measuredAt: last ? new Date(last.ts).toISOString() : null,
      simulated: true,
      values,
      signalQuality,
    },
    trends,
    sleep: { lastNightHours: astronaut.sleep.totalHours, efficiencyPct: astronaut.sleep.efficiency },
    activeAlerts: alerts
      .filter((a) => a.active)
      .map((a) => ({ ruleId: a.ruleId, severity: a.severity, relatedMetric: a.relatedMetric, title: a.title })),
    latestAssessment: assessment
      ? {
          submittedAt: new Date(assessment.submittedAt).toISOString(),
          answers: assessment.answers,
          wellnessScore: assessment.score,
          escalation: assessment.escalation,
          flags: assessment.flags,
        }
      : null,
  };
}

export { latestValue };
