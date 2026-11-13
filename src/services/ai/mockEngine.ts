import type { LiveMetric } from "@/data/monitoring";
import { formatMetric, liveMetricMeta, liveMetricStatus } from "@/lib/monitoring/config";
import {
  ANALYSIS_SCHEMA_VERSION,
  type AnalysisRequest,
  type AnalysisResponse,
  type Deviation,
  type Insight,
  type InsightSeverity,
  type Recommendation,
} from "./schema";

export const DEMO_ENGINE = { id: "orbit-demo-rules-1", name: "Deterministic demo engine", kind: "deterministic-demo" } as const;

const DISCLAIMER =
  "Demonstration output generated from simulated data. It is not medical advice, a diagnosis or a substitute for the flight surgeon. If you feel unwell, contact the medical team immediately.";

const rank: Record<InsightSeverity, number> = { info: 0, warning: 1, critical: 2 };
const maxSeverity = (items: Array<{ severity: InsightSeverity }>): InsightSeverity =>
  items.reduce<InsightSeverity>((acc, i) => (rank[i.severity] > rank[acc] ? i.severity : acc), "info");

/** Deviation beyond which a metric is called out, even if it is still inside the generic status band. */
const noticeDelta: Record<LiveMetric, number> = {
  heartRate: 18,
  spo2: -2,
  temperature: 0.5,
  respiratoryRate: 4,
  activity: Infinity,
};

function deviationFor(req: AnalysisRequest, metric: LiveMetric): Deviation | null {
  const observed = req.currentMetrics.values[metric];
  if (observed === null || metric === "activity") return null;
  const baseline = req.baseline[metric];
  const delta = +(observed - baseline).toFixed(2);
  const status = liveMetricStatus(metric, observed);
  const notice = noticeDelta[metric];
  const beyondNotice = notice < 0 ? delta <= notice : Math.abs(delta) >= notice;
  if (status === "stable" && !beyondNotice) return null;

  const severity: InsightSeverity = status === "critical" ? "critical" : "warning";
  const { label, unit } = liveMetricMeta[metric];
  const dir = delta >= 0 ? "above" : "below";
  return {
    metric,
    observed,
    baseline,
    delta,
    severity,
    note: `${label} is ${formatMetric(metric, observed)} ${unit}, ${Math.abs(delta).toFixed(metric === "temperature" ? 1 : 0)} ${unit} ${dir} the personal baseline of ${formatMetric(metric, baseline)} ${unit}.`,
  };
}

export function runDemoEngine(req: AnalysisRequest): AnalysisResponse {
  const physical: Insight[] = [];
  const psychological: Insight[] = [];
  const explanations: string[] = [];
  const recommendations: Recommendation[] = [];
  const dataUsed: string[] = [];
  const limitations: string[] = ["All sensor values are simulated for this demo.", "Rules are fixed thresholds, not a trained clinical model."];

  const deviations = (["heartRate", "spo2", "temperature", "respiratoryRate"] as const)
    .map((m) => deviationFor(req, m))
    .filter((d): d is Deviation => d !== null);

  const hasMetrics = req.currentMetrics.measuredAt !== null;
  if (hasMetrics) dataUsed.push("Latest simulated vital signs and activity", "24-hour trend statistics");
  else limitations.push("No sensor readings were available, so vital-sign analysis was skipped.");

  for (const d of deviations) {
    const label = liveMetricMeta[d.metric].label;
    physical.push({ id: `dev-${d.metric}`, title: `${label} outside personal range`, detail: d.note, severity: d.severity });
    explanations.push(`${d.note} It was flagged because it differs from this astronaut's own baseline, not from a population average.`);
  }

  const missing = (["heartRate", "spo2", "temperature", "respiratoryRate"] as const).filter(
    (m) => hasMetrics && req.currentMetrics.values[m] === null,
  );
  for (const m of missing) {
    physical.push({
      id: `missing-${m}`,
      title: `${liveMetricMeta[m].label} not being measured`,
      detail: `The ${liveMetricMeta[m].sensor.toLowerCase()} is not delivering data, so this metric cannot be assessed.`,
      severity: "warning",
    });
    limitations.push(`${liveMetricMeta[m].label} data is missing.`);
  }

  for (const t of req.trends.filter((x) => x.window === "6h")) {
    if (t.metric === "heartRate" && t.deltaFromBaseline >= 12) {
      physical.push({
        id: "trend-hr",
        title: "Sustained heart-rate elevation",
        detail: `Average heart rate over the last 6 hours is ${t.mean.toFixed(0)} bpm, ${t.deltaFromBaseline.toFixed(0)} bpm above baseline.`,
        severity: "warning",
      });
      explanations.push("The 6-hour average, not just the latest reading, is elevated, which suggests the change is not a momentary spike.");
    }
    if (t.metric === "spo2" && t.deltaFromBaseline <= -2) {
      physical.push({
        id: "trend-spo2",
        title: "Blood oxygen trending lower",
        detail: `Average SpO2 over the last 6 hours is ${t.mean.toFixed(1)}%, below the ${req.baseline.spo2}% baseline.`,
        severity: "warning",
      });
    }
  }

  const sleepH = req.sleep.lastNightHours;
  dataUsed.push("Last night's sleep summary");
  if (sleepH < 6) {
    physical.push({ id: "sleep", title: "Short sleep last night", detail: `Only ${sleepH} hours of sleep were recorded (efficiency ${req.sleep.efficiencyPct}%). Sleep loss can affect heart rate, mood and concentration.`, severity: "warning" });
  } else if (sleepH < 7) {
    physical.push({ id: "sleep", title: "Slightly short sleep", detail: `${sleepH} hours of sleep were recorded, a little under the 7-hour target.`, severity: "info" });
  } else {
    physical.push({ id: "sleep", title: "Sleep within target", detail: `${sleepH} hours of sleep with ${req.sleep.efficiencyPct}% efficiency.`, severity: "info" });
  }

  const asm = req.latestAssessment;
  if (asm) {
    dataUsed.push("Most recent daily assessment");
    const a = asm.answers;
    if (a.exhaustion || a.energy <= 2) physical.push({ id: "asm-energy", title: "Low energy reported", detail: `Self-reported energy is ${a.energy}/5${a.exhaustion ? " with physical exhaustion" : ""}.`, severity: a.exhaustion && a.energy <= 2 ? "warning" : "info" });
    if (a.headaches) physical.push({ id: "asm-headache", title: "Headache reported", detail: "A headache was reported in the latest assessment. Combined with other changes it is worth mentioning to the medical team.", severity: "info" });
    if (a.musclePain) physical.push({ id: "asm-muscle", title: "Muscle pain reported", detail: "Muscle pain was reported, which can follow microgravity exercise or deconditioning.", severity: "info" });

    const stressSev: InsightSeverity = a.stress >= 4 ? "warning" : "info";
    psychological.push({ id: "mood", title: `Mood ${a.mood >= 4 ? "positive" : a.mood === 3 ? "neutral" : "low"}`, detail: `Self-reported mood is ${a.mood}/5 and motivation is ${a.motivation}/5.`, severity: a.mood <= 2 || a.motivation <= 2 ? "warning" : "info" });
    psychological.push({ id: "stress", title: a.stress >= 4 ? "High stress reported" : "Stress manageable", detail: `Stress is rated ${a.stress}/5 and feelings of isolation ${a.isolation}/5.`, severity: a.isolation >= 4 ? "warning" : stressSev });
    if (asm.escalation !== "none") explanations.push(`The latest assessment was flagged for ${asm.escalation === "urgent" ? "prompt" : "routine"} review: ${asm.flags.join("; ").toLowerCase()}.`);
  } else {
    psychological.push({ id: "no-assessment", title: "No assessment on record", detail: "Submit a daily assessment so psychological wellbeing can be included in this analysis.", severity: "info" });
    limitations.push("No daily assessment was available, so psychological insight is limited.");
  }

  const activeCritical = req.activeAlerts.some((a) => a.severity === "critical");
  const activeCount = req.activeAlerts.length;
  if (activeCount) {
    dataUsed.push("Active monitoring alerts");
    explanations.push(`${activeCount} monitoring alert${activeCount > 1 ? "s are" : " is"} currently active: ${req.activeAlerts.map((a) => a.title.toLowerCase()).join("; ")}.`);
  }

  const worstSeverity = maxSeverity([...physical, ...psychological]);
  const concern = worstSeverity === "critical" || activeCritical || asm?.escalation === "urgent";
  const attention = !concern && (worstSeverity === "warning" || activeCount > 0 || asm?.escalation === "review");
  const level = concern ? "concern" : attention ? "attention" : "stable";

  if (concern) {
    recommendations.push({ id: "r-contact", text: "Contact the flight surgeon now and avoid strenuous activity until you have been advised.", priority: "urgent" });
  }
  if (deviations.length && !concern) {
    recommendations.push({ id: "r-recheck", text: "Rest for 10 to 15 minutes, check sensor fit, and take another reading to confirm the change.", priority: "soon" });
  }
  if (missing.length) recommendations.push({ id: "r-sensor", text: "Re-seat or recharge the sensor that stopped reporting so monitoring can resume.", priority: "soon" });
  if (sleepH < 6.5) recommendations.push({ id: "r-sleep", text: "Protect your next sleep period: dim lights, limit stimulants and keep a consistent schedule.", priority: "soon" });
  if (asm && (asm.answers.stress >= 4 || asm.answers.isolation >= 4 || asm.answers.mood <= 2)) {
    recommendations.push({ id: "r-psych", text: "Schedule a private conversation with the crew psychologist or a family call; support is routine, not a sign of weakness.", priority: asm.escalation === "urgent" ? "urgent" : "soon" });
  }
  if (!asm) recommendations.push({ id: "r-assess", text: "Complete today's wellness assessment.", priority: "routine" });
  recommendations.push({ id: "r-continue", text: "Keep monitoring running and complete the daily assessment so trends stay current.", priority: "routine" });

  const headline = concern
    ? "Several readings need prompt medical attention"
    : attention
      ? "Some readings deserve attention"
      : "Health indicators look stable";
  const summary = concern
    ? "One or more measurements or responses are well outside this astronaut's personal range. The medical team should review them promptly."
    : attention
      ? "A few measurements or responses differ from the personal baseline. Monitor closely and follow the suggestions below."
      : "Vital signs are close to the personal baseline and no active alerts or concerning responses were found.";

  const escalationRecommended = concern || asm?.escalation === "review" || (attention && deviations.some((d) => d.severity === "warning") && activeCount > 0);
  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    requestId: req.requestId,
    generatedAt: new Date().toISOString(),
    engine: { ...DEMO_ENGINE },
    overall: { level, headline, summary },
    physical,
    psychological,
    deviations,
    recommendations,
    explanations: explanations.length ? explanations : ["No metric differs meaningfully from the personal baseline, so there is nothing further to explain."],
    escalation: {
      recommended: escalationRecommended,
      reason: escalationRecommended
        ? concern
          ? "Critical-range readings, an active critical alert or an urgent assessment were found."
          : "Reported symptoms or active alerts merit a clinician's review."
        : "No finding currently requires escalation.",
    },
    dataUsed,
    limitations,
    disclaimer: DISCLAIMER,
  };
}
