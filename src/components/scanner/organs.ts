import type { Astronaut, HealthStatus } from "@/data/types";
import { metricStatus } from "@/lib/health";

export type OrganId = "brain" | "heart" | "lungs" | "metabolic" | "skeleton";

export const ORGAN_IDS: OrganId[] = ["brain", "heart", "lungs", "metabolic", "skeleton"];

export const SCAN_STATUS_LABEL: Record<HealthStatus, string> = {
  stable: "Optimal",
  warning: "Attention",
  critical: "Critical",
};

export interface ScanMetric {
  label: string;
  value: string;
  unit?: string;
  status: HealthStatus;
  /** True when the value is modelled rather than read from a live sensor. */
  simulated?: boolean;
}

export interface OrganReport {
  id: OrganId;
  name: string;
  region: string;
  status: HealthStatus;
  summary: string;
  metrics: ScanMetric[];
  countermeasures: string[];
  /** Heart rate (bpm) drives the heart animation. */
  bpm: number;
  /** Respiratory rate (breaths/min) drives the lung animation. */
  breathRate: number;
}

/** World-space layout, in metres, for a body normalised to 1.8 m tall facing +Z. */
export const BODY_HEIGHT = 1.8;

export const ORGAN_LAYOUT: Record<
  OrganId,
  { anchor: [number, number, number]; focus: [number, number, number]; distance: number }
> = {
  brain: { anchor: [0, 1.7, 0], focus: [0, 1.6, 0], distance: 1.15 },
  heart: { anchor: [0.035, 1.34, 0.04], focus: [0, 1.32, 0], distance: 1.25 },
  lungs: { anchor: [0.095, 1.4, 0.03], focus: [0, 1.36, 0], distance: 1.35 },
  metabolic: { anchor: [0.05, 1.13, 0.04], focus: [0, 1.1, 0], distance: 1.45 },
  skeleton: { anchor: [0, 1.22, -0.05], focus: [0, 0.95, 0], distance: 2.7 },
};

export const HOME_VIEW = { target: [0, 0.92, 0] as [number, number, number], distance: 4.3 };

const RANK: Record<HealthStatus, number> = { stable: 0, warning: 1, critical: 2 };

function worst(statuses: HealthStatus[]): HealthStatus {
  return statuses.reduce<HealthStatus>((acc, s) => (RANK[s] > RANK[acc] ? s : acc), "stable");
}

function seeded(id: string, salt: number) {
  let h = salt * 2654435761;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
}

function band(value: number, ok: [number, number], warn: [number, number]): HealthStatus {
  if (value >= ok[0] && value <= ok[1]) return "stable";
  if (value >= warn[0] && value <= warn[1]) return "warning";
  return "critical";
}

export function buildReports(a: Astronaut): Record<OrganId, OrganReport> {
  const { heartRate, spo2, respiratoryRate } = a.vitals;

  const systolic = Math.round(108 + (heartRate - 60) * 0.45);
  const diastolic = Math.round(70 + (heartRate - 60) * 0.25);
  const bpStatus = band(systolic, [90, 129], [130, 139]);
  const heartStatus = worst([metricStatus("heartRate", heartRate), bpStatus]);

  const lungStatus = worst([metricStatus("spo2", spo2), metricStatus("respiratoryRate", respiratoryRate)]);

  const sleepStatus = band(a.sleep.totalHours, [7, 10], [6, 6.99]);
  const radiation = +(0.52 + seeded(a.id, 1) * 0.22).toFixed(2);
  const radiationStatus = band(radiation, [0, 0.69], [0.7, 0.9]);
  const mood = a.assessments[0]?.mood ?? "Steady";
  const moodStatus: HealthStatus = /stress|low|anx|tired|fatigue|down/i.test(mood) ? "warning" : "stable";
  const brainStatus = worst([sleepStatus, radiationStatus, moodStatus]);

  const glucose = Math.round(84 + seeded(a.id, 2) * 14);
  const glucoseStatus = band(glucose, [70, 99], [100, 125]);
  const intake = Math.round(86 + seeded(a.id, 3) * 14);
  const intakeStatus = band(intake, [90, 110], [75, 89]);
  const metabolicStatus = worst([glucoseStatus, intakeStatus]);

  const boneDensity = +(100 - a.missionDay * 0.035).toFixed(1);
  const boneStatus = band(boneDensity, [97, 101], [93, 96.99]);
  const muscle = +(100 - a.missionDay * 0.022 - seeded(a.id, 4) * 1.4).toFixed(1);
  const muscleStatus = band(muscle, [97, 101], [93, 96.99]);
  const skeletonStatus = worst([boneStatus, muscleStatus]);

  const hr = String(heartRate);

  return {
    brain: {
      id: "brain",
      name: "Brain & Neuro",
      region: "Cranial region",
      status: brainStatus,
      summary: "Sleep quality, mood and cumulative radiation exposure.",
      metrics: [
        { label: "Sleep", value: a.sleep.totalHours.toFixed(1), unit: "h", status: sleepStatus },
        { label: "Mood", value: mood, status: moodStatus },
        { label: "Radiation stress", value: radiation.toFixed(2), unit: "mSv/day", status: radiationStatus, simulated: true },
      ],
      countermeasures: [
        "Hold the 22:30 sleep window and dim cabin lighting 60 minutes prior",
        "Log mood check-in after each work block",
        radiationStatus === "stable"
          ? "Continue routine dosimeter badge checks"
          : "Shelter in the shielded crew quarters during the next solar particle event",
      ],
      bpm: heartRate,
      breathRate: respiratoryRate,
    },
    heart: {
      id: "heart",
      name: "Cardiovascular",
      region: "Thoracic region",
      status: heartStatus,
      summary: "Resting heart rate and fluid-shift driven blood pressure.",
      metrics: [
        { label: "Heart rate", value: hr, unit: "bpm", status: metricStatus("heartRate", heartRate) },
        { label: "Blood pressure", value: `${systolic}/${diastolic}`, unit: "mmHg", status: bpStatus, simulated: true },
      ],
      countermeasures: [
        "Complete the 30 minute treadmill session with harness loading",
        "Maintain fluid and electrolyte loading before reentry prep",
        heartStatus === "stable"
          ? "Keep daily baseline ECG capture"
          : "Rest 15 minutes and re-measure; notify flight surgeon if sustained",
      ],
      bpm: heartRate,
      breathRate: respiratoryRate,
    },
    lungs: {
      id: "lungs",
      name: "Respiratory",
      region: "Thoracic region",
      status: lungStatus,
      summary: "Oxygen saturation and breathing cadence.",
      metrics: [
        { label: "SpO2", value: String(spo2), unit: "%", status: metricStatus("spo2", spo2) },
        { label: "Respiratory rate", value: String(respiratoryRate), unit: "br/min", status: metricStatus("respiratoryRate", respiratoryRate) },
      ],
      countermeasures: [
        "Run the guided breathing protocol for 5 minutes",
        "Check cabin CO2 scrubber status before the next sleep period",
        lungStatus === "stable"
          ? "No change to the current activity plan"
          : "Pause strenuous activity and repeat the SpO2 reading in 10 minutes",
      ],
      bpm: heartRate,
      breathRate: respiratoryRate,
    },
    metabolic: {
      id: "metabolic",
      name: "Metabolic Core",
      region: "Abdominal region",
      status: metabolicStatus,
      summary: "Glucose regulation and nutrition coverage.",
      metrics: [
        { label: "Blood sugar", value: String(glucose), unit: "mg/dL", status: glucoseStatus, simulated: true },
        { label: "Nutrition intake", value: String(intake), unit: "% of plan", status: intakeStatus, simulated: true },
      ],
      countermeasures: [
        "Log every meal in the galley tracker",
        "Add a protein-rich snack after resistance exercise",
        metabolicStatus === "stable"
          ? "Continue the current menu rotation"
          : "Schedule a dietitian review and a fasting glucose check",
      ],
      bpm: heartRate,
      breathRate: respiratoryRate,
    },
    skeleton: {
      id: "skeleton",
      name: "Spine & Skeleton",
      region: "Axial and lower limbs",
      status: skeletonStatus,
      summary: "Bone density and muscle mass versus pre-flight baseline.",
      metrics: [
        { label: "Bone density", value: boneDensity.toFixed(1), unit: "% baseline", status: boneStatus, simulated: true },
        { label: "Muscle mass", value: muscle.toFixed(1), unit: "% baseline", status: muscleStatus, simulated: true },
      ],
      countermeasures: [
        "Advanced resistive exercise device session, 6 days per week",
        "Take daily vitamin D and calcium per the nutrition plan",
        skeletonStatus === "stable"
          ? "Next DXA scan on the standard schedule"
          : "Increase resistive load and request an early DXA scan",
      ],
      bpm: heartRate,
      breathRate: respiratoryRate,
    },
  };
}
