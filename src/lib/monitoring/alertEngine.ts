import type { AlertMetric, LiveAlert, LiveMetric, Sample } from "@/data/monitoring";
import { formatMetric, liveMetricMeta, type Baseline } from "./config";

/** Number of consecutive readings a condition must hold before an alert is raised. */
const SUSTAIN = 3;
/** Number of consecutive normal readings before an alert is auto-resolved. */
const CLEAR_AFTER = 4;
const MISSING_WARNING = 3;
const MISSING_CRITICAL = 8;

type Level = 0 | 1 | 2;

interface RuleResult {
  title: string;
  explanation: string;
  recommendedAction: string;
}

interface Rule {
  id: string;
  metric: LiveMetric;
  level: (sample: Sample, baseline: Baseline) => Level;
  describe: (sample: Sample, baseline: Baseline, severity: "warning" | "critical") => RuleResult;
}

const CONTACT_NOW = "Contact the flight surgeon now and stop strenuous activity.";

const rules: Rule[] = [
  {
    id: "hr-deviation",
    metric: "heartRate",
    level: (s, b) => {
      if (s.heartRate === null) return 0;
      const delta = s.heartRate - b.heartRate;
      if (delta >= 40 || s.heartRate > 120 || s.heartRate < 45) return 2;
      if (delta >= 25 || delta <= -20) return 1;
      return 0;
    },
    describe: (s, b, severity) => {
      const hr = s.heartRate ?? 0;
      const delta = hr - b.heartRate;
      const direction = delta >= 0 ? "above" : "below";
      return {
        title: delta >= 0 ? "Heart rate above personal baseline" : "Heart rate below personal baseline",
        explanation: `Heart rate is ${hr} bpm, ${Math.abs(delta)} bpm ${direction} the personal baseline of ${b.heartRate} bpm for several consecutive readings. Exertion, stress, hydration or sensor fit can all contribute; this demo cannot determine the cause.`,
        recommendedAction:
          severity === "critical"
            ? `${CONTACT_NOW} Report any chest discomfort, dizziness or breathlessness immediately.`
            : "Rest for a few minutes, check the wrist sensor fit and re-check. Report symptoms such as dizziness or palpitations to the medical team.",
      };
    },
  },
  {
    id: "spo2-change",
    metric: "spo2",
    level: (s, b) => {
      if (s.spo2 === null) return 0;
      if (s.spo2 < 92) return 2;
      if (s.spo2 <= b.spo2 - 3) return 1;
      return 0;
    },
    describe: (s, b, severity) => ({
      title: severity === "critical" ? "Blood oxygen well below baseline" : "Unexpected blood oxygen change",
      explanation: `Blood oxygen saturation reads ${s.spo2 ?? "—"}% against a personal baseline of ${b.spo2}%. Ear-clip placement, circulation and cabin atmosphere can affect readings; this demo does not diagnose the cause.`,
      recommendedAction:
        severity === "critical"
          ? `${CONTACT_NOW} Check cabin atmosphere readouts and seek immediate help if breathing is difficult.`
          : "Re-seat the ear clip, review cabin atmosphere readouts and report the change to the flight surgeon if it persists.",
    }),
  },
  {
    id: "temp-elevated",
    metric: "temperature",
    level: (s) => {
      if (s.temperature === null) return 0;
      if (s.temperature >= 38) return 2;
      if (s.temperature >= 37.5) return 1;
      return 0;
    },
    describe: (s, b, severity) => ({
      title: "Elevated body temperature",
      explanation: `Skin temperature is ${(s.temperature ?? 0).toFixed(1)} °C, ${((s.temperature ?? 0) - b.temperature).toFixed(1)} °C above the personal baseline of ${b.temperature.toFixed(1)} °C. Exercise, cabin warmth or illness can raise temperature; the demo cannot tell which.`,
      recommendedAction:
        severity === "critical"
          ? "Notify the flight surgeon now, rest, hydrate and avoid exertion until advised."
          : "Rest, hydrate, check cabin temperature and take a manual reading. Report any feeling of being unwell.",
    }),
  },
  {
    id: "resp-rate",
    metric: "respiratoryRate",
    level: (s) => {
      if (s.respiratoryRate === null) return 0;
      if (s.respiratoryRate > 24 || s.respiratoryRate < 10) return 2;
      if (s.respiratoryRate > 20 || s.respiratoryRate < 11) return 1;
      return 0;
    },
    describe: (s, b, severity) => ({
      title: "Respiratory rate outside expected range",
      explanation: `Respiratory rate is ${s.respiratoryRate ?? "—"} breaths/min against a baseline of ${b.respiratoryRate}. Activity and stress commonly change breathing rate.`,
      recommendedAction:
        severity === "critical"
          ? `${CONTACT_NOW} Seek help immediately if breathing feels difficult.`
          : "Rest and slow your breathing. Report persistent changes to the medical team.",
    }),
  },
];

function trailing<T>(items: T[], n: number): T[] {
  return items.slice(Math.max(0, items.length - n));
}

function consecutiveMissing(samples: Sample[], metric: LiveMetric): number {
  let count = 0;
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i][metric] !== null) break;
    count++;
  }
  return count;
}

interface Evaluation {
  ruleId: string;
  metric: AlertMetric;
  severity: "warning" | "critical" | null;
  clear: boolean;
  result?: RuleResult;
}

function evaluate(samples: Sample[], baseline: Baseline): Evaluation[] {
  const latest = samples[samples.length - 1];
  const out: Evaluation[] = [];

  for (const rule of rules) {
    const sustained = trailing(samples, SUSTAIN);
    const levels = sustained.map((s) => rule.level(s, baseline));
    const minLevel = sustained.length === SUSTAIN ? (Math.min(...levels) as Level) : 0;
    const clearLevels = trailing(samples, CLEAR_AFTER).map((s) => rule.level(s, baseline));
    const clear = clearLevels.length === CLEAR_AFTER && clearLevels.every((l) => l === 0);
    const severity = minLevel === 2 ? "critical" : minLevel === 1 ? "warning" : null;
    out.push({
      ruleId: rule.id,
      metric: rule.metric,
      severity,
      clear,
      result: severity ? rule.describe(latest, baseline, severity) : undefined,
    });
  }

  for (const metric of ["heartRate", "spo2", "temperature", "respiratoryRate"] as const) {
    const missing = consecutiveMissing(samples, metric);
    const severity = missing >= MISSING_CRITICAL ? "critical" : missing >= MISSING_WARNING ? "warning" : null;
    const label = liveMetricMeta[metric].label;
    out.push({
      ruleId: `sensor-missing:${metric}`,
      metric,
      severity,
      clear: missing === 0 && samples.length >= 2,
      result: severity
        ? {
            title: `Missing sensor data: ${label}`,
            explanation: `No ${label.toLowerCase()} data has arrived from the ${liveMetricMeta[metric].sensor.toLowerCase()} for ${missing} consecutive readings. Health status for this metric cannot be assessed while data is missing.`,
            recommendedAction:
              severity === "critical"
                ? "Check the sensor connection and battery, then notify the medical team that this metric is unmonitored."
                : "Check the sensor fit and connection. Re-seat the sensor and wait for the signal to return.",
          }
        : undefined,
    });
  }
  return out;
}

/**
 * Applies the alert rules to the latest readings and returns the updated alert list.
 * Pure function: alert ids derive from the rule and the reading timestamp.
 */
export function evaluateAlerts(
  astronautId: string,
  baseline: Baseline,
  samples: Sample[],
  existing: LiveAlert[],
): LiveAlert[] {
  if (samples.length === 0) return existing;
  const now = samples[samples.length - 1].ts;
  let next = existing;

  for (const ev of evaluate(samples, baseline)) {
    const current = next.find((a) => a.astronautId === astronautId && a.ruleId === ev.ruleId && a.active);

    if (ev.severity && ev.result) {
      if (!current) {
        const created: LiveAlert = {
          id: `${astronautId}:${ev.ruleId}:${now}`,
          astronautId,
          ruleId: ev.ruleId,
          severity: ev.severity,
          title: ev.result.title,
          timestamp: now,
          relatedMetric: ev.metric,
          explanation: ev.result.explanation,
          recommendedAction: ev.result.recommendedAction,
          active: true,
          source: "monitoring",
        };
        next = [created, ...next];
      } else if (current.severity === "warning" && ev.severity === "critical") {
        next = next.map((a) =>
          a.id === current.id ? { ...a, severity: "critical", ...ev.result, timestamp: now } : a,
        );
      }
    } else if (current && ev.clear) {
      next = next.map((a) => (a.id === current.id ? { ...a, active: false, resolvedAt: now } : a));
    }
  }
  return next.length > 120 ? next.slice(0, 120) : next;
}

export { formatMetric };
