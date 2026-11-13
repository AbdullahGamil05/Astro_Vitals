import { ApiError } from "./errors.js";

// Sliding-window limiter held in memory. On serverless platforms each warm instance keeps its own
// counters, so this is a best-effort guard that complements (not replaces) Manus's own limits.
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number, message = "Too many requests. Please wait a moment and try again.") {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    buckets.set(key, recent);
    throw new ApiError(429, "rate_limited", message, retryAfterSec);
  }
  recent.push(now);
  buckets.set(key, recent);

  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
}

/** Keeps the result of an in-flight or recent operation so a retried request cannot run twice. */
export class IdempotencyCache<T> {
  private entries = new Map<string, { expires: number; promise: Promise<T> }>();

  constructor(private ttlMs: number) {}

  run(key: string, work: () => Promise<T>): Promise<T> {
    const now = Date.now();
    for (const [k, v] of this.entries) if (v.expires < now) this.entries.delete(k);

    const existing = this.entries.get(key);
    if (existing) return existing.promise;

    const promise = work();
    this.entries.set(key, { expires: now + this.ttlMs, promise });
    promise.catch(() => this.entries.delete(key));
    return promise;
  }
}
