import { AlertTriangle, ChevronDown, ChevronUp, Loader2, RefreshCw, Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Card, CardHeader } from "@/components/ui/primitives";
import { cn } from "@/lib/health";
import type { ChatMessage } from "@/services/manus/api";
import type { PendingMessage, Phase } from "@/services/manus/useManusConversation";
import type { StatusSnapshot } from "@/services/manus/api";
import { Markdown } from "./Markdown";

const MAX_CHARS = 1000;

interface Props {
  phase: Phase;
  messages: ChatMessage[];
  snapshot: StatusSnapshot | null;
  pending: PendingMessage | null;
  sending: boolean;
  onSend: (text: string) => void;
  onRetrySend: () => void;
  onResume: () => void;
  onRefresh: () => void;
  error: { message: string } | null;
}

function Bubble({ message, collapsible }: { message: ChatMessage; collapsible?: boolean }) {
  const [expanded, setExpanded] = useState(!collapsible);
  const mine = message.role === "user";
  return (
    <li className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-xl border px-3.5 py-2.5 text-sm",
          mine ? "border-orbit-cyan/30 bg-orbit-cyan/15 text-ink" : "border-orbit-line bg-black/25",
        )}
      >
        <span className="sr-only">{mine ? "You said:" : "Assistant said:"}</span>
        {mine ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <>
            <div className={cn(!expanded && "max-h-20 overflow-hidden [mask-image:linear-gradient(to_bottom,black_50%,transparent)]")}>
              <Markdown>{message.content}</Markdown>
            </div>
            {collapsible ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-orbit-cyan hover:underline"
              >
                {expanded ? <ChevronUp className="size-3" aria-hidden="true" /> : <ChevronDown className="size-3" aria-hidden="true" />}
                {expanded ? "Show less" : "Show full analysis"}
              </button>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}

export function AssessmentChat({ phase, messages, snapshot, pending, sending, onSend, onRetrySend, onResume, onRefresh, error }: Props) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending?.id, pending?.failed, snapshot?.state]);

  const state = snapshot?.state ?? "running";
  const lost = phase === "session_lost";
  const failedStart = phase === "create_failed";
  const busy = sending || (state === "running" && !lost);
  const canType = !lost && !failedStart && !busy && !pending?.failed && (snapshot?.canReply ?? false);
  const firstAssistantId = messages.find((m) => m.role === "assistant")?.id;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || !canType) return;
    onSend(text);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    submit();
  };

  const placeholder = lost
    ? "This conversation has ended"
    : busy
      ? "The assistant is preparing a reply…"
      : state === "waiting" && !snapshot?.canReply
        ? "The assistant is waiting for you to continue"
        : "Ask a follow-up about your health…";

  return (
    <Card>
      <CardHeader title="Ask the health assistant" subtitle="Follow-up questions about this check-in, sleep, stress, recovery and more." />

      <ul ref={listRef} role="log" aria-live="polite" aria-label="Conversation" className="flex max-h-[26rem] min-h-24 flex-col gap-3 overflow-y-auto pr-1">
        {messages.length === 0 && !pending ? (
          <li className="py-6 text-center text-sm text-orbit-muted">Your conversation will appear here once the analysis is ready.</li>
        ) : null}
        {messages.map((m) => (
          <Bubble key={m.id} message={m} collapsible={m.id === firstAssistantId} />
        ))}
        {pending ? (
          <li className="flex justify-end">
            <div className={cn("max-w-[88%] rounded-xl border px-3.5 py-2.5 text-sm text-ink", pending.failed ? "border-orbit-crit/50 bg-orbit-crit/10" : "border-orbit-cyan/30 bg-orbit-cyan/10 opacity-80")}>
              <p className="whitespace-pre-wrap break-words">{pending.content}</p>
              {pending.failed ? (
                <p className="mt-1.5 flex items-center gap-2 text-xs text-orbit-crit" role="alert">
                  <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                  {pending.error ?? "Not delivered."}
                  <button type="button" onClick={onRetrySend} className="inline-flex items-center gap-1 text-orbit-cyan hover:underline">
                    <RefreshCw className="size-3" aria-hidden="true" />
                    Retry
                  </button>
                </p>
              ) : null}
            </div>
          </li>
        ) : null}
        {busy && messages.length > 0 ? (
          <li className="flex items-center gap-2 text-xs text-orbit-muted" role="status">
            <Loader2 className="size-3.5 animate-spin text-orbit-cyan" aria-hidden="true" />
            {snapshot?.progressNote ?? "The assistant is typing…"}
          </li>
        ) : null}
      </ul>

      {snapshot?.needsResume ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orbit-line bg-black/20 p-3 text-sm text-orbit-muted">
          The assistant paused and needs a go-ahead to continue.
          <button type="button" onClick={onResume} className="inline-flex h-9 items-center rounded-lg border border-white/15 px-3 text-ink hover:bg-white/5">
            Let it continue
          </button>
        </div>
      ) : null}

      {snapshot?.state === "error" && messages.length > 0 ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orbit-warn/40 bg-orbit-warn/10 p-3 text-sm text-orbit-text">
          {snapshot.error}
          <button type="button" onClick={onRefresh} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-ink hover:bg-white/5">
            <RefreshCw className="size-4" aria-hidden="true" />
            Check again
          </button>
        </div>
      ) : null}

      {error && !failedStart && !lost ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orbit-warn/40 bg-orbit-warn/10 p-3 text-sm text-orbit-text">
          {error.message}
          <button type="button" onClick={onRefresh} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-ink hover:bg-white/5">
            <RefreshCw className="size-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-4 flex items-end gap-2">
        <label htmlFor="assessment-chat-input" className="sr-only">
          Your message to the health assistant
        </label>
        <textarea
          id="assessment-chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={onKeyDown}
          disabled={!canType}
          rows={2}
          placeholder={placeholder}
          className="min-h-11 flex-1 resize-none rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-ink placeholder:text-orbit-dim focus-visible:outline-2 focus-visible:outline-orbit-cyan disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canType || !draft.trim()}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-orbit-cyan px-4 text-sm font-semibold text-orbit-bg hover:bg-orbit-cyan/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="size-4" aria-hidden="true" />
          Send
        </button>
      </form>
      <p className="mt-2 text-[11px] leading-relaxed text-orbit-dim">
        {draft.length > MAX_CHARS - 100 ? `${draft.length}/${MAX_CHARS} characters. ` : ""}
        General wellness information, not a medical diagnosis. For urgent or worsening symptoms contact the flight surgeon or local emergency services right away.
      </p>
    </Card>
  );
}
