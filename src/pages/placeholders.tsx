import { Activity, BellRing, BrainCircuit, ClipboardCheck, FileBarChart, History, Medal } from "lucide-react";
import { AstronautProfileView } from "@/components/AstronautProfileView";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getAstronaut } from "@/data/astronauts";
import { useAuth } from "@/lib/auth";

export const MonitoringPage = () => (
  <PlaceholderPage
    icon={Activity}
    title="Live Monitoring"
    description="Continuous streaming of wearable sensor data with real-time waveforms, sensor status and signal quality."
    features={["Real-time heart rate and SpO2 waveforms", "Sensor connectivity and battery status", "Custom alert thresholds", "Exercise and rest mode detection"]}
  />
);

export const AiAnalysisPage = () => (
  <PlaceholderPage
    icon={BrainCircuit}
    title="AI Health Analysis"
    description="Personalised insights that explain trends in your vitals and flag patterns before they become problems."
    features={["Anomaly detection against personal baseline", "Plain-language explanations", "Recovery and sleep recommendations", "Early-warning risk scoring"]}
  />
);

export const AssessmentPage = () => (
  <PlaceholderPage
    icon={ClipboardCheck}
    title="Daily Assessment"
    description="A short guided check-in covering symptoms, mood, fatigue and sleep quality, shared with the medical team."
    features={["Symptom and mood questionnaire", "Fatigue and cognitive load scales", "Automatic points on completion", "Escalation to flight surgeon when needed"]}
  />
);

export const HistoryPage = () => (
  <PlaceholderPage
    icon={History}
    title="Health History"
    description="Browse past measurements, assessments and alerts across the whole mission timeline."
    features={["Mission-long trend explorer", "Filter by metric and date range", "Assessment archive", "Export for personal records"]}
  />
);

export const LeaderboardPage = () => (
  <PlaceholderPage
    icon={Medal}
    title="Crew Leaderboard"
    description="Friendly wellness competition that rewards consistent exercise, sleep and assessment habits."
    features={["Daily, weekly and mission rankings", "Streaks and badges", "Team challenges", "Privacy controls for shared metrics"]}
  />
);

export const MedicalAlertsPage = () => (
  <PlaceholderPage
    icon={BellRing}
    title="Medical Alerts"
    description="A triage workspace for every alert across the crew, with acknowledgement and escalation workflows."
    features={["Prioritised alert queue", "Acknowledge, assign and resolve", "Alert rule configuration", "Audit trail of decisions"]}
  />
);

export const ReportsPage = () => (
  <PlaceholderPage
    icon={FileBarChart}
    title="Health Reports"
    description="Generate mission-level and individual health reports for review, handover and post-flight analysis."
    features={["Weekly crew health summaries", "Individual astronaut reports", "PDF and CSV export", "Scheduled report delivery"]}
  />
);

export function OwnProfilePage() {
  const { user } = useAuth();
  const me = getAstronaut(user?.astronautId);
  if (!me) return null;
  return <AstronautProfileView astronaut={me} />;
}
