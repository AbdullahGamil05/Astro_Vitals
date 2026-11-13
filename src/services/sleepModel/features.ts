import type { Astronaut } from "@/data/types";

export interface SleepModelFeatures {
  minutes_asleep_vs_normal: number;
  efficiency_vs_normal: number;
  deep_pct_vs_normal: number;
  rem_pct_vs_normal: number;
  wake_count_vs_normal: number;
  resting_hr_vs_normal: number;
  bedtime_h_vs_normal: number;
  sleep_debt_7d: number;
  load_yday: number;
  load_logged_yday: number;
  active_min_yday: number;
  weekend: number;
  minutes_asleep: number;
  time_in_bed: number;
  efficiency: number;
  awake_min: number;
  wake_count: number;
  deep_min: number;
  rem_min: number;
  light_min: number;
  deep_pct: number;
  rem_pct: number;
  bedtime_h: number;
  wake_h: number;
  resting_hr: number | null;
  has_stages: number;
  resting_hr_missing: number;
}

export interface SleepRecoveryFormValues {
  minutesAsleep: string;
  timeInBed: string;
  wakeCount: string;
  bedtime: string;
  restingHr: string;
  hasStages: boolean;
  deepMinutes: string;
  remMinutes: string;
  typicalWakeCount: string;
  typicalBedtime: string;
  loadYesterday: string;
  loadLoggedYesterday: boolean;
  activeMinutesYesterday: string;
}

export type FeatureBuildResult = { features: SleepModelFeatures; error?: never } | { features?: never; error: string };

function numberFrom(value: string): number | null {
  if (value.trim() === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function clockHour(value: string, bedtime = false): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const decimal = hour + minute / 60;
  return bedtime && hour < 12 ? decimal + 24 : decimal;
}

function average(values: number[]): number {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

export function buildSleepRecoveryFeatures(
  values: SleepRecoveryFormValues,
  astronaut: Astronaut,
  now = new Date(),
): FeatureBuildResult {
  const minutesAsleep = numberFrom(values.minutesAsleep);
  const timeInBed = numberFrom(values.timeInBed);
  const wakeCount = numberFrom(values.wakeCount);
  const typicalWakeCount = numberFrom(values.typicalWakeCount);
  const activeMinutesYesterday = numberFrom(values.activeMinutesYesterday);
  const deepMinutes = values.hasStages ? numberFrom(values.deepMinutes) : 0;
  const remMinutes = values.hasStages ? numberFrom(values.remMinutes) : 0;
  const bedtime = clockHour(values.bedtime, true);
  const typicalBedtime = clockHour(values.typicalBedtime, true);
  const loadYesterday = values.loadLoggedYesterday ? numberFrom(values.loadYesterday) : 0;
  const restingHr = numberFrom(values.restingHr);

  if (minutesAsleep === null || minutesAsleep <= 0) return { error: "Enter the minutes you were asleep." };
  if (timeInBed === null || timeInBed < minutesAsleep) return { error: "Time in bed must be at least as long as time asleep." };
  if (wakeCount === null || wakeCount < 0) return { error: "Enter a valid number of awakenings." };
  if (typicalWakeCount === null || typicalWakeCount < 0) return { error: "Enter your usual number of awakenings." };
  if (bedtime === null || typicalBedtime === null) return { error: "Enter both last night’s and your usual bedtime." };
  if (activeMinutesYesterday === null || activeMinutesYesterday < 0 || activeMinutesYesterday > 1440) {
    return { error: "Enter yesterday’s active minutes (0–1440)." };
  }
  if (values.loadLoggedYesterday && (loadYesterday === null || loadYesterday < 0)) {
    return { error: "Enter yesterday’s training load or mark it as not logged." };
  }
  if (values.hasStages && (deepMinutes === null || remMinutes === null || deepMinutes < 0 || remMinutes < 0)) {
    return { error: "Enter valid deep- and REM-sleep minutes, or turn off sleep-stage data." };
  }
  if (values.hasStages && ((deepMinutes ?? 0) + (remMinutes ?? 0) > minutesAsleep)) {
    return { error: "Deep and REM minutes cannot exceed total sleep; light sleep is calculated from the remainder." };
  }
  if (restingHr !== null && (restingHr < 25 || restingHr > 220)) return { error: "Resting heart rate must be between 25 and 220 bpm." };

  const deep = values.hasStages ? (deepMinutes ?? 0) : 0;
  const rem = values.hasStages ? (remMinutes ?? 0) : 0;
  const awakeMinutes = timeInBed - minutesAsleep;
  const efficiency = (minutesAsleep / timeInBed) * 100;
  const lightMinutes = values.hasStages ? minutesAsleep - deep - rem : 0;
  const deepPct = values.hasStages ? deep / minutesAsleep : 0;
  const remPct = values.hasStages ? rem / minutesAsleep : 0;

  const recent = astronaut.daily.slice(-7);
  const normalSleepMinutes = average(recent.map((point) => point.sleepHours * 60));
  const normalRestingHr = average(recent.map((point) => point.restingHeartRate));
  const normalDeepPct = astronaut.sleep.totalHours > 0 ? astronaut.sleep.deepHours / astronaut.sleep.totalHours : 0;
  const normalRemPct = astronaut.sleep.totalHours > 0 ? astronaut.sleep.remHours / astronaut.sleep.totalHours : 0;
  const sleepDebt7d = recent.reduce((total, point) => total + Math.max(0, 480 - point.sleepHours * 60), 0);
  const weekend = now.getDay() === 0 || now.getDay() === 6 ? 1 : 0;
  const wakeHour = (bedtime + timeInBed / 60) % 24;
  const missingRestingHr = restingHr === null;
  const baselineHr = normalRestingHr || astronaut.vitals.heartRate;

  return {
    features: {
      minutes_asleep_vs_normal: minutesAsleep - normalSleepMinutes,
      efficiency_vs_normal: efficiency - astronaut.sleep.efficiency,
      deep_pct_vs_normal: deepPct - normalDeepPct,
      rem_pct_vs_normal: remPct - normalRemPct,
      wake_count_vs_normal: wakeCount - typicalWakeCount,
      resting_hr_vs_normal: restingHr === null ? 0 : restingHr - baselineHr,
      bedtime_h_vs_normal: bedtime - typicalBedtime,
      sleep_debt_7d: sleepDebt7d,
      load_yday: values.loadLoggedYesterday ? loadYesterday! : 0,
      load_logged_yday: values.loadLoggedYesterday ? 1 : 0,
      active_min_yday: activeMinutesYesterday,
      weekend,
      minutes_asleep: minutesAsleep,
      time_in_bed: timeInBed,
      efficiency,
      awake_min: awakeMinutes,
      wake_count: wakeCount,
      deep_min: deep,
      rem_min: rem,
      light_min: lightMinutes,
      deep_pct: deepPct,
      rem_pct: remPct,
      bedtime_h: bedtime,
      wake_h: wakeHour,
      resting_hr: restingHr,
      has_stages: values.hasStages ? 1 : 0,
      resting_hr_missing: missingRestingHr ? 1 : 0,
    },
  };
}

export function initialSleepRecoveryValues(astronaut: Astronaut): SleepRecoveryFormValues {
  const minutesAsleep = Math.round(astronaut.sleep.totalHours * 60);
  const efficiency = Math.max(1, astronaut.sleep.efficiency);
  const deepMinutes = Math.round(astronaut.sleep.deepHours * 60);
  const remMinutes = Math.round(astronaut.sleep.remHours * 60);
  const latestRestingHr = astronaut.daily.at(-1)?.restingHeartRate;

  return {
    minutesAsleep: String(minutesAsleep),
    timeInBed: String(Math.round(minutesAsleep / (efficiency / 100))),
    wakeCount: "",
    bedtime: "",
    restingHr: latestRestingHr ? String(latestRestingHr) : "",
    hasStages: deepMinutes + remMinutes <= minutesAsleep,
    deepMinutes: String(deepMinutes),
    remMinutes: String(remMinutes),
    typicalWakeCount: "",
    typicalBedtime: "",
    loadYesterday: "",
    loadLoggedYesterday: false,
    activeMinutesYesterday: "",
  };
}

export function describeSleepFeatures(features: SleepModelFeatures) {
  return {
    efficiency: `${features.efficiency.toFixed(1)}%`,
    awakeMinutes: `${Math.round(features.awake_min)} min`,
    deepPercent: `${(features.deep_pct * 100).toFixed(1)}%`,
    remPercent: `${(features.rem_pct * 100).toFixed(1)}%`,
    lightMinutes: `${Math.round(features.light_min)} min`,
    sleepDebt: `${Math.round(features.sleep_debt_7d)} min`,
  };
}
