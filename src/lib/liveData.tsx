import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { astronauts as staticAstronauts } from "@/data/astronauts";
import { staticAlertMeta } from "@/data/alertMeta";
import { alerts as staticAlerts } from "@/data/operations";
import type {
  AssessmentAnswers,
  LiveAlert,
  Sample,
  ScenarioId,
  Session,
  SubmittedAssessment,
  TimeWindow,
  UnifiedAlert,
} from "@/data/monitoring";
import type { Assessment, Astronaut, HealthStatus, MetricKind } from "@/data/types";
import { alertForAssessment, assessmentSummary, buildAssessment, moodLabel } from "@/lib/assessment";
import { metricStatus } from "@/lib/health";
import { evaluateAlerts } from "@/lib/monitoring/alertEngine";
import { baselineFor } from "@/lib/monitoring/config";
import { latestValue, windowSamples } from "@/lib/monitoring/series";
import { nextSample, seedHistory, TICK_INTERVAL_MS } from "@/lib/monitoring/simulator";
import { formatDateTime, timeAgo } from "@/lib/time";

const STORAGE_KEY = "orbit.live.v1";
const MAX_LIVE_SAMPLES = 1200;
const DAY_MS = 86_400_000;

interface LiveState {
  anchor: number;
  samples: Record<string, Sample[]>;
  alerts: LiveAlert[];
  assessments: SubmittedAssessment[];
  sessions: Record<string, Session>;
}

type Action =
  | { type: "start"; id: string; now: number }
  | { type: "stop"; id: string; now: number }
  | { type: "scenario"; id: string; scenario: ScenarioId }
  | { type: "tick"; id: string; sample: Sample }
  | { type: "assessment"; assessment: SubmittedAssessment }
  | { type: "reset"; now: number };

const idleSession: Session = { running: false, scenario: "nominal", scenarioTick: 0, tick: 0 };

function load(): LiveState {
  const fresh: LiveState = { anchor: Date.now(), samples: {}, alerts: [], assessments: [], sessions: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw) as Partial<Pick<LiveState, "anchor" | "samples" | "alerts" | "assessments">>;
    if (typeof parsed.anchor !== "number") return fresh;
    const cutoff = Date.now() - DAY_MS;
    const samples: Record<string, Sample[]> = {};
    for (const [id, list] of Object.entries(parsed.samples ?? {})) {
      samples[id] = list.filter((s) => s.ts >= cutoff);
    }
    return {
      anchor: parsed.anchor,
      samples,
      alerts: parsed.alerts ?? [],
      assessments: parsed.assessments ?? [],
      sessions: {},
    };
  } catch {
    return fresh;
  }
}

function save(state: LiveState) {
  try {
    const { anchor, samples, alerts, assessments } = state;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ anchor, samples, alerts, assessments }));
  } catch {
    // Storage may be full or unavailable; the in-memory state continues to work.
  }
}

const seedCache = new Map<string, Sample[]>();
export function seedFor(astronautId: string, anchor: number): Sample[] {
  const key = `${astronautId}:${anchor}`;
  let seed = seedCache.get(key);
  if (!seed) {
    const base = staticAstronauts.find((a) => a.id === astronautId);
    seed = base ? seedHistory(astronautId, base.vitals, anchor) : [];
    seedCache.set(key, seed);
  }
  return seed;
}

function patchSession(state: LiveState, id: string, patch: Partial<Session>): LiveState {
  const current = state.sessions[id] ?? idleSession;
  return { ...state, sessions: { ...state.sessions, [id]: { ...current, ...patch } } };
}

function reducer(state: LiveState, action: Action): LiveState {
  switch (action.type) {
    case "start":
      return patchSession(state, action.id, { running: true, startedAt: action.now, stoppedAt: undefined });
    case "stop":
      return patchSession(state, action.id, { running: false, stoppedAt: action.now });
    case "scenario":
      return patchSession(state, action.id, { scenario: action.scenario, scenarioTick: 0 });
    case "tick": {
      const session = state.sessions[action.id] ?? idleSession;
      if (!session.running) return state;
      const live = [...(state.samples[action.id] ?? []), action.sample].slice(-MAX_LIVE_SAMPLES);
      const alerts = evaluateAlerts(action.id, baselineFor(action.id), live.slice(-15), state.alerts);
      return {
        ...state,
        samples: { ...state.samples, [action.id]: live },
        alerts,
        sessions: {
          ...state.sessions,
          [action.id]: { ...session, tick: session.tick + 1, scenarioTick: session.scenarioTick + 1 },
        },
      };
    }
    case "assessment": {
      const alert = alertForAssessment(action.assessment);
      return {
        ...state,
        assessments: [action.assessment, ...state.assessments],
        alerts: alert ? [alert, ...state.alerts] : state.alerts,
      };
    }
    case "reset":
      return { anchor: action.now, samples: {}, alerts: [], assessments: [], sessions: {} };
  }
}

interface LiveContextValue {
  state: LiveState;
  start: (id: string) => void;
  stop: (id: string) => void;
  setScenario: (id: string, scenario: ScenarioId) => void;
  submitAssessment: (id: string, answers: AssessmentAnswers) => SubmittedAssessment;
  reset: () => void;
}

const LiveContext = createContext<LiveContextValue | null>(null);

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const stateRef = useRef(state);
  stateRef.current = state;

  const anyRunning = Object.values(state.sessions).some((s) => s.running);

  useEffect(() => {
    if (!anyRunning) return;
    const timer = window.setInterval(() => {
      const current = stateRef.current;
      const ts = Date.now();
      for (const [id, session] of Object.entries(current.sessions)) {
        if (!session.running) continue;
        const live = current.samples[id];
        const prev = live?.length ? live[live.length - 1] : seedFor(id, current.anchor).at(-1);
        const sample = nextSample(prev, {
          baseline: baselineFor(id),
          scenario: session.scenario,
          scenarioTick: session.scenarioTick,
          ts,
        });
        dispatch({ type: "tick", id, sample });
      }
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [anyRunning]);

  useEffect(() => {
    const timer = window.setTimeout(() => save(state), 800);
    return () => window.clearTimeout(timer);
  }, [state]);

  const start = useCallback((id: string) => dispatch({ type: "start", id, now: Date.now() }), []);
  const stop = useCallback((id: string) => dispatch({ type: "stop", id, now: Date.now() }), []);
  const setScenario = useCallback((id: string, scenario: ScenarioId) => dispatch({ type: "scenario", id, scenario }), []);
  const reset = useCallback(() => dispatch({ type: "reset", now: Date.now() }), []);
  const submitAssessment = useCallback((id: string, answers: AssessmentAnswers) => {
    const assessment = buildAssessment(id, answers, Date.now());
    dispatch({ type: "assessment", assessment });
    return assessment;
  }, []);

  const value = useMemo(
    () => ({ state, start, stop, setScenario, submitAssessment, reset }),
    [state, start, stop, setScenario, submitAssessment, reset],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used within LiveDataProvider");
  return ctx;
}

export function useSession(astronautId: string | undefined): Session {
  const { state } = useLive();
  return (astronautId && state.sessions[astronautId]) || idleSession;
}

/** Seeded 24h history followed by live samples, restricted to the chosen window. */
export function useHistory(astronautId: string | undefined, window: TimeWindow): Sample[] {
  const { state } = useLive();
  const live = astronautId ? state.samples[astronautId] : undefined;
  return useMemo(() => {
    if (!astronautId) return [];
    const merged = [...seedFor(astronautId, state.anchor), ...(live ?? [])];
    return windowSamples(merged, window, Date.now());
    // `live` changes on every tick, which refreshes the window's right edge.
  }, [astronautId, state.anchor, live, window]);
}

const statusRank: Record<HealthStatus, number> = { stable: 0, warning: 1, critical: 2 };
const worst = (a: HealthStatus, b: HealthStatus): HealthStatus => (statusRank[a] >= statusRank[b] ? a : b);

function toAssessment(s: SubmittedAssessment): Assessment {
  return {
    id: s.id,
    date: formatDateTime(s.submittedAt),
    type: "Daily Wellness Check",
    score: s.score,
    mood: moodLabel(s.answers.mood),
    summary: assessmentSummary(s),
  };
}

const vitalKeys: MetricKind[] = ["heartRate", "spo2", "temperature", "respiratoryRate"];

function resolveAstronaut(base: Astronaut, state: LiveState): Astronaut {
  let result = base;
  const live = state.samples[base.id] ?? [];
  const activeAlerts = state.alerts.filter((a) => a.astronautId === base.id && a.active);
  const alertStatus: HealthStatus = activeAlerts.some((a) => a.severity === "critical")
    ? "critical"
    : activeAlerts.length
      ? "warning"
      : "stable";

  if (live.length) {
    const vitals = { ...base.vitals };
    let vitalStatus: HealthStatus = "stable";
    for (const key of vitalKeys) {
      vitals[key] = latestValue(live, key)?.value ?? base.vitals[key];
      vitalStatus = worst(vitalStatus, metricStatus(key, vitals[key]));
    }
    result = { ...result, vitals, status: worst(vitalStatus, alertStatus), lastMeasurement: timeAgo(live[live.length - 1].ts) };
  } else {
    result = { ...result, status: worst(base.status, alertStatus) };
  }

  const mine = state.assessments.filter((a) => a.astronautId === base.id);
  if (mine.length) {
    result = {
      ...result,
      assessments: [...mine.map(toAssessment), ...base.assessments],
      lastAssessment: formatDateTime(mine[0].submittedAt),
    };
  }
  return result;
}

/** Crew records with live monitoring data and submitted assessments applied. */
export function useAstronauts(): Astronaut[] {
  const { state } = useLive();
  return useMemo(() => staticAstronauts.map((a) => resolveAstronaut(a, state)), [state]);
}

export function useAstronaut(id: string | undefined): Astronaut | undefined {
  const all = useAstronauts();
  return all.find((a) => a.id === id);
}

export function useLatestAssessment(id: string | undefined): SubmittedAssessment | undefined {
  const { state } = useLive();
  return state.assessments.find((a) => a.astronautId === id);
}

const severityRank = { critical: 0, warning: 1, info: 2 } as const;

export function useUnifiedAlerts(astronautId?: string): UnifiedAlert[] {
  const { state } = useLive();
  return useMemo(() => {
    const live: UnifiedAlert[] = state.alerts.map((a) => ({
      id: a.id,
      astronautId: a.astronautId,
      severity: a.severity,
      title: a.title,
      relatedMetric: a.relatedMetric,
      explanation: a.explanation,
      recommendedAction: a.recommendedAction,
      timeLabel: formatDateTime(a.timestamp),
      timestamp: a.timestamp,
      active: a.active,
      live: true,
    }));
    const fixed: UnifiedAlert[] = staticAlerts.map((a) => ({
      id: a.id,
      astronautId: a.astronautId,
      severity: a.severity,
      title: a.title,
      relatedMetric: staticAlertMeta[a.id]?.relatedMetric ?? "environment",
      explanation: a.message,
      recommendedAction: staticAlertMeta[a.id]?.recommendedAction ?? "Review with the flight surgeon.",
      timeLabel: a.time,
      active: a.active,
      live: false,
    }));
    return [...live, ...fixed]
      .filter((a) => !astronautId || a.astronautId === astronautId)
      .map((a, index) => ({ a, index }))
      .sort((x, y) => {
        if (x.a.active !== y.a.active) return x.a.active ? -1 : 1;
        if (x.a.severity !== y.a.severity) return severityRank[x.a.severity] - severityRank[y.a.severity];
        if (x.a.live !== y.a.live) return x.a.live ? -1 : 1;
        return (y.a.timestamp ?? 0) - (x.a.timestamp ?? 0) || x.index - y.index;
      })
      .map((x) => x.a);
  }, [state.alerts, astronautId]);
}
