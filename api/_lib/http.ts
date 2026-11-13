import { ApiError } from "./errors.js";

const baseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...baseHeaders, ...extra } });
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    const extra: Record<string, string> = error.retryAfterSec ? { "Retry-After": String(error.retryAfterSec) } : {};
    return json(
      { ok: false, error: { code: error.code, message: error.message, retryAfterSec: error.retryAfterSec } },
      error.status,
      extra,
    );
  }
  console.error("[manus-api] unexpected error:", error instanceof Error ? error.name : "unknown");
  return json({ ok: false, error: { code: "internal", message: "Something went wrong. Please try again." } }, 500);
}

export async function readJson(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    throw new ApiError(400, "invalid_request", "Requests must be sent as JSON.");
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new ApiError(413, "payload_too_large", "The request is too large.");
  const text = await request.text();
  if (text.length > maxBytes) throw new ApiError(413, "payload_too_large", "The request is too large.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError(400, "invalid_request", "The request body is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ApiError(400, "invalid_request", "The request body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function methodNotAllowed(allowed: string) {
  return json({ ok: false, error: { code: "invalid_request", message: "Method not allowed." } }, 405, { Allow: allowed });
}
