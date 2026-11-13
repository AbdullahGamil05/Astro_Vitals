export type ApiErrorCode =
  | "invalid_request"
  | "payload_too_large"
  | "session_invalid"
  | "session_not_found"
  | "rate_limited"
  | "not_configured"
  | "upstream_auth"
  | "upstream_error"
  | "upstream_unreachable"
  | "internal";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly retryAfterSec?: number,
  ) {
    super(message);
  }
}
