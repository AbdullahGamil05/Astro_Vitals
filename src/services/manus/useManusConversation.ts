import { useCallback, useEffect, useRef, useState } from "react";
import type { SubmittedAssessment } from "@/data/monitoring";
import {
  createAssessmentSession,
  fetchStatus,
  ManusApiError,
  sendChatMessage,
  type ChatMessage,
  type StatusSnapshot,
} from "./api";
import { clearStoredSession, loadStoredSession, saveStoredSession, type StoredSession } from "./storage";

const POLL_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_CONSECUTIVE_FAILURES = 5;

export interface PendingMessage {
  id: string;
  content: string;
  baseline: number;
  failed: boolean;
  error?: string;
  resume?: boolean;
}

export interface ConversationError {
  message: string;
  code: string;
  retryAfterSec?: number;
}

export type Phase = "creating" | "active" | "create_failed" | "session_lost";

// Shared across mounts so React StrictMode or a quick remount cannot create two Manus tasks for one check-in.
const inflightCreates = new Map<string, Promise<StoredSession>>();

function createSession(userId: string, assessment: SubmittedAssessment): Promise<StoredSession> {
  const existing = inflightCreates.get(assessment.id);
  if (existing) return existing;
  const promise = createAssessmentSession({ userId, submissionId: assessment.id, answers: assessment.answers })
    .then((created) => {
      const stored: StoredSession = {
        sessionToken: created.sessionToken,
        assessmentId: assessment.id,
        createdAt: Date.now(),
        expiresAt: created.expiresAt,
      };
      saveStoredSession(userId, stored);
      return stored;
    })
    .finally(() => inflightCreates.delete(assessment.id));
  inflightCreates.set(assessment.id, promise);
  return promise;
}

const toError = (e: unknown): ConversationError =>
  e instanceof ManusApiError
    ? { message: e.message, code: e.code, retryAfterSec: e.retryAfterSec }
    : { message: "Something went wrong. Please try again.", code: "unknown" };

const jitter = (ms: number) => ms * (0.8 + Math.random() * 0.4);

interface Options {
  userId: string;
  /** A fresh check-in that needs a new analysis. */
  assessment?: SubmittedAssessment;
  /** An earlier session reopened from storage. */
  resume?: StoredSession;
}

export function useManusConversation({ userId, assessment, resume }: Options) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [phase, setPhase] = useState<Phase>("creating");
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(null);
  const [error, setError] = useState<ConversationError | null>(null);
  const [pending, setPending] = useState<PendingMessage | null>(null);
  const [pollNonce, setPollNonce] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const pendingRef = useRef<PendingMessage | null>(null);
  pendingRef.current = pending;

  const bootstrap = useCallback(async () => {
    setError(null);
    if (resume) {
      setSession(resume);
      setPhase("active");
      return;
    }
    if (!assessment) return;

    const stored = loadStoredSession(userId);
    if (stored && stored.assessmentId === assessment.id) {
      setSession(stored);
      setPhase("active");
      return;
    }

    setPhase("creating");
    try {
      setSession(await createSession(userId, assessment));
      setPhase("active");
    } catch (e) {
      setError(toError(e));
      setPhase("create_failed");
    }
  }, [assessment, resume, userId]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let failures = 0;
    const startedAt = Date.now();
    setTimedOut(false);

    const schedule = (ms: number) => {
      timer = setTimeout(() => void tick(), jitter(ms));
    };

    const tick = async () => {
      try {
        const status = await fetchStatus(userId, session.sessionToken);
        if (cancelled) return;
        failures = 0;
        setSnapshot(status);
        setError(null);

        const awaiting = pendingRef.current;
        const userCount = status.messages.filter((m) => m.role === "user").length;
        const stillWaitingForDelivery = Boolean(awaiting && !awaiting.failed && userCount <= awaiting.baseline);

        if (status.state === "running" || stillWaitingForDelivery) {
          if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
            setTimedOut(true);
            return;
          }
          attempt += 1;
          schedule(Math.min(10_000, 2_000 + attempt * 1_500));
        }
      } catch (e) {
        if (cancelled) return;
        const apiError = e instanceof ManusApiError ? e : null;
        if (apiError?.isSessionLost) {
          clearStoredSession(userId);
          setError(toError(e));
          setPhase("session_lost");
          return;
        }
        failures += 1;
        if (failures >= MAX_CONSECUTIVE_FAILURES) {
          setError(toError(e));
          return;
        }
        const base = apiError?.code === "rate_limited" ? Math.max(10_000, (apiError.retryAfterSec ?? 10) * 1000) : 3_000 * 2 ** (failures - 1);
        schedule(Math.min(30_000, base));
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [session, userId, pollNonce]);

  const refresh = useCallback(() => {
    setError(null);
    setPollNonce((n) => n + 1);
  }, []);

  const deliver = useCallback(
    async (message: PendingMessage) => {
      if (!session) return;
      setPending({ ...message, failed: false, error: undefined });
      try {
        await sendChatMessage({
          userId,
          sessionToken: session.sessionToken,
          clientMessageId: message.id,
          ...(message.resume ? { kind: "resume" as const } : { message: message.content }),
        });
        setPollNonce((n) => n + 1);
      } catch (e) {
        const failure = toError(e);
        if (e instanceof ManusApiError && e.isSessionLost) {
          clearStoredSession(userId);
          setPhase("session_lost");
        }
        setPending({ ...message, failed: true, error: failure.message });
      }
    },
    [session, userId],
  );

  const send = useCallback(
    (text: string) => {
      const userCount = snapshot?.messages.filter((m) => m.role === "user").length ?? 0;
      void deliver({ id: crypto.randomUUID(), content: text, baseline: userCount, failed: false });
    },
    [deliver, snapshot],
  );

  const resumeAgent = useCallback(() => {
    const userCount = snapshot?.messages.filter((m) => m.role === "user").length ?? 0;
    void deliver({ id: crypto.randomUUID(), content: "", baseline: userCount, failed: false, resume: true });
  }, [deliver, snapshot]);

  const retrySend = useCallback(() => {
    if (pending?.failed) void deliver(pending);
  }, [deliver, pending]);

  const messages: ChatMessage[] = snapshot?.messages ?? [];
  const deliveredUsers = messages.filter((m) => m.role === "user").length;
  const visiblePending = pending && !pending.resume && deliveredUsers <= pending.baseline ? pending : null;
  const sending = Boolean(pending && !pending.failed && deliveredUsers <= pending.baseline);

  return {
    phase,
    session,
    snapshot,
    messages,
    error,
    timedOut,
    pending: visiblePending,
    sending,
    retryCreate: bootstrap,
    refresh,
    send,
    retrySend,
    resumeAgent,
  };
}
