import { ApiError } from "./errors.js";
import type { AssessmentAnswers } from "../../src/data/monitoring.js";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
export const MAX_MESSAGE_CHARS = 1000;

const yesNoKeys = ["exhaustion", "headaches", "musclePain"] as const;
const scaleKeys = ["energy", "sleepQuality", "mood", "stress", "isolation", "motivation"] as const;

const bad = (message: string) => new ApiError(400, "invalid_request", message);

export function parseId(value: unknown, label: string): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw bad(`${label} is missing or invalid.`);
  return value;
}

export function parseAnswers(value: unknown): AssessmentAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw bad("Assessment answers are missing.");
  const input = value as Record<string, unknown>;
  const allowed = new Set<string>([...yesNoKeys, ...scaleKeys]);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw bad("Assessment answers contain unknown fields.");

  const output: Record<string, boolean | number> = {};
  for (const key of yesNoKeys) {
    if (typeof input[key] !== "boolean") throw bad("Please answer every yes or no question.");
    output[key] = input[key];
  }
  for (const key of scaleKeys) {
    const answer = input[key];
    if (typeof answer !== "number" || !Number.isInteger(answer) || answer < 1 || answer > 5) {
      throw bad("Please answer every scale question with a value from 1 to 5.");
    }
    output[key] = answer;
  }
  return output as unknown as AssessmentAnswers;
}

export function parseChatMessage(value: unknown): string {
  if (typeof value !== "string") throw bad("Write a message first.");
  const text = value.replace(/\u0000/g, "").trim();
  if (!text) throw bad("Write a message first.");
  if (text.length > MAX_MESSAGE_CHARS) throw bad(`Messages can be up to ${MAX_MESSAGE_CHARS} characters.`);
  return text;
}
