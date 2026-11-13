import type { ManusMessage, ManusTaskStatus } from "./manus.js";
import { SESSION_MARKER, USER_CLOSE, USER_OPEN } from "./prompt.js";

export type ChatState = "running" | "ready" | "waiting" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /** 0 is the assessment analysis; each follow-up question starts a new turn. */
  turn: number;
}

export interface ChatSnapshot {
  state: ChatState;
  messages: ChatMessage[];
  progressNote: string | null;
  canReply: boolean;
  needsResume: boolean;
  error: string | null;
}

const transient = (kind: string | undefined) => kind === "opening" || kind === "progress";
const ASK_USER_TYPES = new Set(["messageAskUser", "cascadeAskUser"]);

function visibleUserText(raw: string): string | null {
  if (raw.includes(SESSION_MARKER)) return null;
  const start = raw.indexOf(USER_OPEN);
  const end = raw.lastIndexOf(USER_CLOSE);
  if (start !== -1 && end > start) return raw.slice(start + USER_OPEN.length, end).trim();
  return raw.trim();
}

export function buildSnapshot(events: ManusMessage[], status: ManusTaskStatus): ChatSnapshot {
  interface Reply {
    id: string;
    content: string;
    timestamp: number;
    kind?: string;
    turn: number;
  }
  const users: ChatMessage[] = [];
  const replies: Reply[] = [];
  let turn = -1;
  let errorText: string | null = null;
  let waitingType: string | null = null;

  for (const event of events) {
    if (event.type === "user_message" && event.user_message) {
      turn += 1;
      const text = visibleUserText(event.user_message.content ?? "");
      if (text) users.push({ id: event.id, role: "user", content: text, timestamp: event.timestamp, turn });
    } else if (event.type === "assistant_message" && event.assistant_message?.content?.trim()) {
      replies.push({
        id: event.id,
        content: event.assistant_message.content,
        timestamp: event.timestamp,
        kind: event.assistant_message.delivery_kind,
        turn: Math.max(turn, 0),
      });
    } else if (event.type === "error_message") {
      errorText = event.error_message?.content?.trim() || "The assistant ran into a problem.";
    } else if (event.type === "status_update") {
      const detail = event.status_update?.status_detail;
      waitingType = event.status_update?.agent_status === "waiting" ? (detail?.waiting_for_event_type ?? "unknown") : null;
    }
  }

  const lastTurn = Math.max(turn, 0);
  const lastTurnReplies = replies.filter((r) => r.turn === lastTurn);

  let state: ChatState;
  if (status === "error") state = "error";
  else if (status === "waiting") state = "waiting";
  else if (status === "running") state = "running";
  else state = lastTurnReplies.length > 0 ? "ready" : "running";

  const shown: ChatMessage[] = [];
  const turns = new Set(replies.map((r) => r.turn));
  for (const t of turns) {
    const group = replies.filter((r) => r.turn === t);
    const hasFinal = group.some((r) => !transient(r.kind));
    const dropTransient = hasFinal || (t === lastTurn && state === "running");
    for (const r of group) {
      if (dropTransient && transient(r.kind)) continue;
      shown.push({ id: r.id, role: "assistant", content: r.content, timestamp: r.timestamp, turn: r.turn });
    }
  }

  const progressReplies = lastTurnReplies.filter((r) => transient(r.kind));
  const progressNote = state === "running" && progressReplies.length ? progressReplies[progressReplies.length - 1].content : null;

  const messages = [...users, ...shown].sort((a, b) => a.timestamp - b.timestamp || (a.role === "user" ? -1 : 1));

  return {
    state,
    messages,
    progressNote,
    canReply: state === "ready" || state === "error" || (state === "waiting" && ASK_USER_TYPES.has(waitingType ?? "")),
    needsResume: state === "waiting" && !ASK_USER_TYPES.has(waitingType ?? ""),
    error: state === "error" ? (errorText ?? "The assistant could not finish this request.") : null,
  };
}
