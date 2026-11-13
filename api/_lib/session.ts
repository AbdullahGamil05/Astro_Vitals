import { ApiError } from "./errors.js";

/**
 * A session token binds one assessment session to one Manus task and one user id. It is signed
 * with HMAC-SHA256 so the browser can never swap in a different task id or user id: the server
 * only talks to Manus about tasks that it created and signed itself.
 */
export interface SessionClaims {
  sid: string;
  tid: string;
  uid: string;
  iat: number;
  exp: number;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();

function secret(): string {
  const value = process.env.MANUS_SESSION_SECRET?.trim() || process.env.MANUS_API_KEY?.trim();
  if (!value) {
    throw new ApiError(503, "not_configured", "The AI health assistant is not configured yet (MANUS_API_KEY is missing).");
  }
  return `manus-session-v1:${value}`;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(usage: "sign" | "verify") {
  return crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

export async function signSession(input: { sid: string; tid: string; uid: string }): Promise<{ token: string; claims: SessionClaims }> {
  const now = Date.now();
  const claims: SessionClaims = { ...input, iat: now, exp: now + SESSION_TTL_MS };
  const payload = toBase64Url(encoder.encode(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey("sign"), encoder.encode(payload));
  return { token: `${payload}.${toBase64Url(new Uint8Array(signature))}`, claims };
}

export async function verifySession(token: string | null | undefined, userId: string | null | undefined): Promise<SessionClaims> {
  const invalid = () => new ApiError(401, "session_invalid", "This assessment session is not available. Submit a new check-in to start another one.");
  if (!token || !userId || token.length > 1024) throw invalid();

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) throw invalid();

  let valid = false;
  try {
    valid = await crypto.subtle.verify("HMAC", await hmacKey("verify"), fromBase64Url(signature), encoder.encode(payload));
  } catch {
    throw invalid();
  }
  if (!valid) throw invalid();

  let claims: SessionClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as SessionClaims;
  } catch {
    throw invalid();
  }
  if (claims.uid !== userId || claims.exp < Date.now() || !claims.tid || !claims.sid) throw invalid();
  return claims;
}
