import type { AssessmentAnswers } from "@/data/monitoring";

export type ChatState = "running" | "ready" | "waiting" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  turn: number;
}

export interface StatusSnapshot {
  state: ChatState;
  messages: ChatMessage[];
  progressNote: string | null;
  canReply: boolean;
  needsResume: boolean;
  error: string | null;
}

export interface CreatedSession {
  sessionToken: string;
  sessionId: string;
  expiresAt: number;
}

export class ManusApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly retryAfterSec?: number,
  ) {
    super(message);
  }

  /** The session is gone for good; retrying the same request cannot help. */
  get isSessionLost() {
    return this.code === "session_invalid" || this.code === "session_not_found";
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, cache: "no-store" });
  } catch {
    throw new ManusApiError("You appear to be offline or the server could not be reached.", "network", 0);
  }
  const data = (await response.json().catch(() => null)) as
    | { ok: true }
    | { ok: false; error?: { code?: string; message?: string; retryAfterSec?: number } }
    | null;

  if (response.ok && data && data.ok) return data as T;

  const error = data && !data.ok ? data.error : undefined;
  throw new ManusApiError(
    error?.message ?? "The AI assistant is unavailable right now. Please try again.",
    error?.code ?? "upstream_error",
    response.status,
    error?.retryAfterSec,
  );
}

const jsonHeaders = { "Content-Type": "application/json" };

export function createAssessmentSession(input: { userId: string; submissionId: string; answers: AssessmentAnswers }) {
  return request<CreatedSession>("/api/manus/assessment", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export function sendChatMessage(input: {
  userId: string;
  sessionToken: string;
  clientMessageId: string;
  message?: string;
  kind?: "resume";
}) {
  return request<{ ok: true }>("/api/manus/message", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export function fetchStatus(userId: string, sessionToken: string) {
  return request<StatusSnapshot & { ok: true }>("/api/manus/status", {
    method: "GET",
    headers: { "x-user-id": userId, "x-session-token": sessionToken },
  });
}
