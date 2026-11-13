import type {
  AssessmentAnswers,
  EscalationLevel,
  LiveAlert,
  PartialAnswers,
  SubmittedAssessment,
} from "@/data/monitoring";

export type QuestionId = keyof AssessmentAnswers;

export interface Question {
  id: QuestionId;
  section: "physical" | "psychological";
  kind: "yesno" | "scale";
  prompt: string;
  low?: string;
  high?: string;
  /** For scales: true when a higher answer is more concerning. */
  higherIsWorse?: boolean;
}

export const questions: Question[] = [
  { id: "exhaustion", section: "physical", kind: "yesno", prompt: "Are you experiencing physical exhaustion?" },
  { id: "headaches", section: "physical", kind: "yesno", prompt: "Are you experiencing headaches?" },
  { id: "energy", section: "physical", kind: "scale", prompt: "Rate your energy level", low: "Very low", high: "Very high" },
  { id: "sleepQuality", section: "physical", kind: "scale", prompt: "Rate your sleep quality", low: "Poor", high: "Excellent" },
  { id: "musclePain", section: "physical", kind: "yesno", prompt: "Are you experiencing muscle pain?" },
  { id: "mood", section: "psychological", kind: "scale", prompt: "Rate your mood", low: "Very low", high: "Very good" },
  { id: "stress", section: "psychological", kind: "scale", prompt: "Rate your stress level", low: "Very low", high: "Very high", higherIsWorse: true },
  { id: "isolation", section: "psychological", kind: "scale", prompt: "Rate your feeling of isolation", low: "Not at all", high: "Very strong", higherIsWorse: true },
  { id: "motivation", section: "psychological", kind: "scale", prompt: "Rate your motivation", low: "Very low", high: "Very high" },
];

export const sections = [
  { id: "physical" as const, title: "Physical health", description: "How your body feels right now." },
  { id: "psychological" as const, title: "Psychological health", description: "How you are feeling mentally and emotionally." },
];

export function isSectionComplete(section: "physical" | "psychological", answers: PartialAnswers): boolean {
  return questions.filter((q) => q.section === section).every((q) => answers[q.id] !== undefined);
}

export function isComplete(answers: PartialAnswers): answers is AssessmentAnswers {
  return questions.every((q) => answers[q.id] !== undefined);
}

/** Wellness score 0-100. Each answer is normalised so 1 is the most favourable outcome. */
export function wellnessScore(a: AssessmentAnswers): number {
  const positive = (v: number) => (v - 1) / 4;
  const inverse = (v: number) => (5 - v) / 4;
  const parts = [
    a.exhaustion ? 0 : 1,
    a.headaches ? 0 : 1,
    a.musclePain ? 0 : 1,
    positive(a.energy),
    positive(a.sleepQuality),
    positive(a.mood),
    positive(a.motivation),
    inverse(a.stress),
    inverse(a.isolation),
  ];
  return Math.round((parts.reduce((s, p) => s + p, 0) / parts.length) * 100);
}

export function assessmentFlags(a: AssessmentAnswers): string[] {
  const flags: string[] = [];
  if (a.exhaustion) flags.push(a.energy <= 2 ? "Physical exhaustion with low energy" : "Physical exhaustion reported");
  if (a.headaches) flags.push("Headache reported");
  if (a.musclePain) flags.push("Muscle pain reported");
  if (a.energy <= 2 && !a.exhaustion) flags.push("Low energy level");
  if (a.sleepQuality <= 2) flags.push("Poor sleep quality");
  if (a.mood <= 2) flags.push("Low mood");
  if (a.stress >= 4) flags.push("High stress");
  if (a.isolation >= 4) flags.push("Strong feeling of isolation");
  if (a.motivation <= 2) flags.push("Low motivation");
  return flags;
}

export function escalationFor(a: AssessmentAnswers, flagCount: number): EscalationLevel {
  if (a.mood <= 1 || (a.stress >= 5 && a.isolation >= 4) || (a.headaches && a.exhaustion && a.energy <= 1) || flagCount >= 6) {
    return "urgent";
  }
  if (flagCount >= 3 || a.stress >= 4 || a.mood <= 2 || a.isolation >= 4 || (a.headaches && a.exhaustion)) {
    return "review";
  }
  return "none";
}

export function buildAssessment(astronautId: string, answers: AssessmentAnswers, now: number): SubmittedAssessment {
  const flags = assessmentFlags(answers);
  return {
    id: `asm-${astronautId}-${now}`,
    astronautId,
    submittedAt: now,
    answers,
    score: wellnessScore(answers),
    flags,
    escalation: escalationFor(answers, flags.length),
  };
}

export function moodLabel(mood: number): string {
  return ["Very low", "Low", "Neutral", "Good", "Very good"][Math.min(4, Math.max(0, mood - 1))];
}

export function assessmentSummary(s: SubmittedAssessment): string {
  const a = s.answers;
  const scales = `Energy ${a.energy}/5, sleep ${a.sleepQuality}/5, mood ${a.mood}/5, stress ${a.stress}/5, isolation ${a.isolation}/5, motivation ${a.motivation}/5.`;
  const flags = s.flags.length ? ` Noted: ${s.flags.join("; ").toLowerCase()}.` : " No concerns reported.";
  return scales + flags;
}

/** Self-reported answers that need attention become an alert visible to the medical team. */
export function alertForAssessment(s: SubmittedAssessment): LiveAlert | null {
  if (s.escalation === "none") return null;
  const urgent = s.escalation === "urgent";
  return {
    id: `alert-${s.id}`,
    astronautId: s.astronautId,
    ruleId: `assessment:${s.id}`,
    severity: urgent ? "critical" : "warning",
    title: urgent ? "Daily assessment needs prompt medical review" : "Daily assessment flagged for review",
    timestamp: s.submittedAt,
    relatedMetric: "assessment",
    explanation: `Self-reported responses were flagged: ${s.flags.join("; ").toLowerCase()}. These answers are subjective and are not a diagnosis.`,
    recommendedAction: urgent
      ? "The flight surgeon should contact the crew member promptly. If you feel unwell or unsafe, do not wait: request medical support immediately."
      : "The flight surgeon will review these responses. Contact the medical team sooner if symptoms worsen or you feel unwell.",
    active: true,
    source: "assessment",
  };
}
