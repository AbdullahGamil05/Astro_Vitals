import type { AssessmentAnswers, EscalationLevel, LiveMetric, TimeWindow } from "@/data/monitoring";

export const ANALYSIS_SCHEMA_VERSION = "1.0" as const;

export type InsightSeverity = "info" | "warning" | "critical";

/** Payload sent to an analysis engine. It deliberately omits names and contact details. */
export interface AnalysisRequest {
  schemaVersion: typeof ANALYSIS_SCHEMA_VERSION;
  requestId: string;
  requestedAt: string;
  astronaut: { id: string; ageYears: number; missionDay: number; missionTotalDays: number };
  baseline: Record<LiveMetric, number>;
  currentMetrics: {
    measuredAt: string | null;
    simulated: true;
    values: Record<LiveMetric, number | null>;
    signalQuality: Record<LiveMetric, number | null>;
  };
  trends: Array<{
    metric: LiveMetric;
    window: TimeWindow;
    mean: number;
    min: number;
    max: number;
    slopePerHour: number;
    deltaFromBaseline: number;
  }>;
  sleep: { lastNightHours: number; efficiencyPct: number };
  activeAlerts: Array<{ ruleId: string; severity: "warning" | "critical"; relatedMetric: string; title: string }>;
  latestAssessment: null | {
    submittedAt: string;
    answers: AssessmentAnswers;
    wellnessScore: number;
    escalation: EscalationLevel;
    flags: string[];
  };
}

export interface Insight {
  id: string;
  title: string;
  detail: string;
  severity: InsightSeverity;
}

export interface Deviation {
  metric: LiveMetric;
  observed: number;
  baseline: number;
  delta: number;
  severity: InsightSeverity;
  note: string;
}

export interface Recommendation {
  id: string;
  text: string;
  priority: "routine" | "soon" | "urgent";
}

export interface AnalysisResponse {
  schemaVersion: typeof ANALYSIS_SCHEMA_VERSION;
  requestId: string;
  generatedAt: string;
  engine: { id: string; name: string; kind: "deterministic-demo" | "remote-model" };
  overall: { level: "stable" | "attention" | "concern"; headline: string; summary: string };
  physical: Insight[];
  psychological: Insight[];
  deviations: Deviation[];
  recommendations: Recommendation[];
  explanations: string[];
  escalation: { recommended: boolean; reason: string };
  dataUsed: string[];
  limitations: string[];
  disclaimer: string;
}

const severities = ["info", "warning", "critical"];

function isInsight(v: unknown): v is Insight {
  const o = v as Insight;
  return !!o && typeof o.id === "string" && typeof o.title === "string" && typeof o.detail === "string" && severities.includes(o.severity);
}

/** Runtime check for responses from a remote engine; anything failing it triggers the fallback path. */
export function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  const r = value as AnalysisResponse;
  if (!r || typeof r !== "object") return false;
  return (
    r.schemaVersion === ANALYSIS_SCHEMA_VERSION &&
    typeof r.generatedAt === "string" &&
    !!r.engine &&
    typeof r.engine.name === "string" &&
    !!r.overall &&
    ["stable", "attention", "concern"].includes(r.overall.level) &&
    typeof r.overall.headline === "string" &&
    typeof r.overall.summary === "string" &&
    Array.isArray(r.physical) &&
    r.physical.every(isInsight) &&
    Array.isArray(r.psychological) &&
    r.psychological.every(isInsight) &&
    Array.isArray(r.deviations) &&
    Array.isArray(r.recommendations) &&
    r.recommendations.every((x) => typeof x?.text === "string" && typeof x?.id === "string") &&
    Array.isArray(r.explanations) &&
    !!r.escalation &&
    typeof r.escalation.recommended === "boolean" &&
    Array.isArray(r.dataUsed) &&
    Array.isArray(r.limitations) &&
    typeof r.disclaimer === "string"
  );
}
