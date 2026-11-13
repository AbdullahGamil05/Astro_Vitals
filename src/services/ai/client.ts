import { runDemoEngine } from "./mockEngine";
import { isAnalysisResponse, type AnalysisRequest, type AnalysisResponse } from "./schema";

/**
 * The browser only knows the URL of YOUR backend route (VITE_AI_ANALYSIS_ENDPOINT).
 * Any model API key must live on that backend, in a variable without the VITE_ prefix,
 * so it is never bundled into client code. See server/ai-proxy.mjs for a reference.
 */
const endpoint = (import.meta.env.VITE_AI_ANALYSIS_ENDPOINT as string | undefined)?.trim() || undefined;
const REQUEST_TIMEOUT_MS = 20_000;

export type AnalysisSource = "demo-engine" | "remote-model" | "fallback";

export interface AnalysisResult {
  analysis: AnalysisResponse;
  source: AnalysisSource;
  /** Present when a remote call failed and the demo engine answered instead. */
  error?: string;
  latencyMs: number;
}

export const isRemoteConfigured = Boolean(endpoint);

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

export async function requestAnalysis(req: AnalysisRequest, signal?: AbortSignal): Promise<AnalysisResult> {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);

  if (!endpoint) {
    await wait(700, signal);
    return { analysis: runDemoEngine(req), source: "demo-engine", latencyMs: elapsed() };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  signal?.addEventListener("abort", () => controller.abort());

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Analysis service responded with status ${response.status}.`);
    const json: unknown = await response.json();
    if (!isAnalysisResponse(json)) throw new Error("Analysis service returned an unexpected response format.");
    return { analysis: json, source: "remote-model", latencyMs: elapsed() };
  } catch (err) {
    if (signal?.aborted) throw err;
    const message = controller.signal.aborted
      ? "The analysis service timed out."
      : err instanceof Error
        ? err.message
        : "The analysis service could not be reached.";
    return { analysis: runDemoEngine(req), source: "fallback", error: message, latencyMs: elapsed() };
  } finally {
    window.clearTimeout(timeout);
  }
}
