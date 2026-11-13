import { ApiError } from "./errors.js";

// Official Manus API v2 (https://open.manus.ai/docs/v2/introduction). The key stays on the server.
const DEFAULT_BASE_URL = "https://api.manus.ai";
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_ATTEMPTS = 3;

export type ManusTaskStatus = "running" | "stopped" | "waiting" | "error" | "deleted";

export interface ManusMessage {
  id: string;
  type: string;
  timestamp: number;
  user_message?: { content?: string };
  assistant_message?: {
    content?: string;
    delivery_kind?: string;
    question_expectation?: { options?: string[] };
  };
  error_message?: { error_type?: string; content?: string };
  status_update?: {
    agent_status?: string;
    status_detail?: { waiting_for_event_type?: string; waiting_description?: string };
  };
}

function config() {
  const key = process.env.MANUS_API_KEY?.trim();
  if (!key) {
    throw new ApiError(503, "not_configured", "The AI health assistant is not configured yet (MANUS_API_KEY is missing).");
  }
  // The base URL can only be overridden outside production (used to test against a local stand-in).
  const override = process.env.NODE_ENV !== "production" ? process.env.MANUS_API_BASE_URL?.trim() : undefined;
  return { key, baseUrl: (override || DEFAULT_BASE_URL).replace(/\/$/, "") };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Exponential backoff with jitter, capped so a single request never hangs the function. */
function backoffMs(attempt: number, retryAfterHeader?: string | null) {
  const headerSeconds = Number(retryAfterHeader);
  if (Number.isFinite(headerSeconds) && headerSeconds > 0) return Math.min(headerSeconds * 1000, 3000);
  const ceiling = Math.min(3000, 400 * 2 ** attempt);
  return ceiling / 2 + Math.random() * (ceiling / 2);
}

interface CallOptions {
  method: "GET" | "POST";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Safe to repeat after a network failure or 5xx (reads only). Writes are only retried on 429. */
  idempotent: boolean;
}

async function call<T>(path: string, options: CallOptions): Promise<T> {
  const { key, baseUrl } = config();
  const url = new URL(`${baseUrl}${path}`);
  for (const [name, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(name, String(value));
  }

  for (let attempt = 0; ; attempt++) {
    const last = attempt >= MAX_ATTEMPTS - 1;
    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method,
        headers: { "x-manus-api-key": key, "Content-Type": "application/json", Accept: "application/json" },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      if (options.idempotent && !last) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw new ApiError(502, "upstream_unreachable", "Could not reach the AI service. Please check your connection and try again.");
    }

    const data = (await response.json().catch(() => null)) as { ok?: boolean; request_id?: string; error?: { code?: string } } | null;

    const retryable = response.status === 429 || (options.idempotent && response.status >= 500);
    if (retryable && !last) {
      await sleep(backoffMs(attempt, response.headers.get("retry-after")));
      continue;
    }

    if (response.ok && data?.ok !== false) return data as T;

    console.error(`[manus-api] ${options.method} ${path} failed`, {
      status: response.status,
      code: data?.error?.code,
      requestId: data?.request_id,
    });

    if (response.status === 429) {
      throw new ApiError(429, "rate_limited", "The AI service is busy right now. Please try again in a moment.", 10);
    }
    if (response.status === 401 || response.status === 403 || data?.error?.code === "unauthenticated" || data?.error?.code === "permission_denied") {
      throw new ApiError(502, "upstream_auth", "The AI service rejected this server's credentials. Please contact the site administrator.");
    }
    if (response.status === 404 || data?.error?.code === "not_found") {
      throw new ApiError(404, "session_not_found", "This assessment conversation could not be found. Submit a new check-in to start another one.");
    }
    throw new ApiError(502, "upstream_error", "The AI service could not complete this request. Please try again.");
  }
}

const textContent = (text: string) => ({ content: [{ type: "text", text }] });

export async function createTask(text: string): Promise<{ taskId: string }> {
  const profile = process.env.MANUS_AGENT_PROFILE?.trim() || "lite";
  const result = await call<{ task_id?: string }>("/v2/task.create", {
    method: "POST",
    idempotent: false,
    body: {
      message: textContent(text),
      title: "Daily health assessment",
      hide_in_task_list: true,
      interactive_mode: false,
      locale: "en",
      agent_profile: profile,
    },
  });
  if (!result.task_id) throw new ApiError(502, "upstream_error", "The AI service did not return a task. Please try again.");
  return { taskId: result.task_id };
}

export async function sendTaskMessage(taskId: string, text: string): Promise<void> {
  await call("/v2/task.sendMessage", {
    method: "POST",
    idempotent: false,
    body: { task_id: taskId, message: textContent(text) },
  });
}

export async function getTaskDetail(taskId: string): Promise<{ status: ManusTaskStatus; hasBackgroundJobs: boolean }> {
  const result = await call<{ task?: { status?: ManusTaskStatus; has_running_background_jobs?: boolean } }>("/v2/task.detail", {
    method: "GET",
    idempotent: true,
    query: { task_id: taskId },
  });
  return { status: result.task?.status ?? "running", hasBackgroundJobs: Boolean(result.task?.has_running_background_jobs) };
}

/** Oldest-first event list, following the cursor for at most a few pages. */
export async function listTaskMessages(taskId: string, maxPages = 3): Promise<ManusMessage[]> {
  const messages: ManusMessage[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const result = await call<{ messages?: ManusMessage[]; has_more?: boolean; next_cursor?: string }>("/v2/task.listMessages", {
      method: "GET",
      idempotent: true,
      query: { task_id: taskId, order: "asc", limit: 200, cursor },
    });
    messages.push(...(result.messages ?? []));
    if (!result.has_more || !result.next_cursor) break;
    cursor = result.next_cursor;
  }
  return messages;
}
