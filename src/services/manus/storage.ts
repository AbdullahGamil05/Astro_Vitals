export interface StoredSession {
  sessionToken: string;
  assessmentId: string;
  createdAt: number;
  expiresAt: number;
}

// Only an opaque signed token is kept. It lets the person reopen the same conversation after a reload.
const keyFor = (userId: string) => `orbit.manus.session.v1.${userId}`;

export function loadStoredSession(userId: string): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (typeof parsed.sessionToken !== "string" || typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) {
      window.localStorage.removeItem(keyFor(userId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredSession(userId: string, session: StoredSession) {
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(session));
  } catch {
    // Storage can be unavailable (private mode); the conversation still works for this visit.
  }
}

export function clearStoredSession(userId: string) {
  try {
    window.localStorage.removeItem(keyFor(userId));
  } catch {
    // ignore
  }
}
