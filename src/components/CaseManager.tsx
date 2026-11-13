import { CheckCheck, ChevronDown, NotebookPen } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { followUpLabel } from "@/components/AlertCard";
import type { FollowUpStatus, UnifiedAlert } from "@/data/monitoring";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/health";
import { useAlertCases, useLive } from "@/lib/liveData";
import { formatDateTime } from "@/lib/time";
import { useToast } from "@/lib/toast";

const MIN_NOTE = 3;
const MAX_NOTE = 500;
const followUpOptions: FollowUpStatus[] = ["none", "scheduled", "in_progress", "completed"];

export function CaseManager({ alert }: { alert: UnifiedAlert }) {
  const { user } = useAuth();
  const { acknowledgeAlert, setFollowUp, addNote } = useLive();
  const toast = useToast();
  const handled = useAlertCases()[alert.id];
  const notes = handled?.notes ?? [];
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const panelId = useId();
  const selectId = useId();
  const noteId = useId();

  if (!user) return null;
  const followUp = handled?.followUp ?? "none";

  const submitNote = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length < MIN_NOTE) {
      setError(`Write at least ${MIN_NOTE} characters.`);
      return;
    }
    addNote(alert.id, user.name, trimmed);
    setText("");
    setError(null);
    toast("Medical note added");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {handled?.acknowledgedAt ? (
          <p className="flex items-center gap-1.5 text-xs text-orbit-teal">
            <CheckCheck className="size-4" aria-hidden="true" />
            Acknowledged by {handled.acknowledgedBy} · {formatDateTime(handled.acknowledgedAt)}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => {
              acknowledgeAlert(alert.id, user.name);
              toast("Alert acknowledged", { detail: "Follow-up scheduled automatically." });
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-orbit-cyan px-3 text-sm font-semibold text-orbit-bg transition-colors hover:bg-orbit-cyan/90 active:scale-[0.98]"
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            Acknowledge
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm text-orbit-muted transition-colors hover:bg-white/5 hover:text-white"
        >
          <NotebookPen className="size-4" aria-hidden="true" />
          Follow-up and notes{notes.length ? ` (${notes.length})` : ""}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </div>

      {open ? (
        <div id={panelId} className="mt-3 space-y-4 rounded-lg bg-black/20 p-3">
          <div>
            <label htmlFor={selectId} className="mb-1.5 block text-xs font-medium text-orbit-muted">
              Follow-up status
            </label>
            <select
              id={selectId}
              value={followUp}
              onChange={(e) => {
                setFollowUp(alert.id, e.target.value as FollowUpStatus);
                toast("Follow-up updated", { detail: followUpLabel[e.target.value as FollowUpStatus] });
              }}
              className="h-9 w-full max-w-xs rounded-lg border border-white/10 bg-orbit-side px-3 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orbit-cyan"
            >
              {followUpOptions.map((o) => (
                <option key={o} value={o}>
                  {followUpLabel[o]}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-orbit-dim">Marking follow-up completed resolves the alert.</p>
          </div>

          <form onSubmit={submitNote} noValidate>
            <label htmlFor={noteId} className="mb-1.5 block text-xs font-medium text-orbit-muted">
              Add medical note
            </label>
            <textarea
              id={noteId}
              value={text}
              maxLength={MAX_NOTE}
              rows={3}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${noteId}-error` : undefined}
              placeholder="Observations, decisions or instructions for the crew member"
              className="w-full rounded-lg border border-white/10 bg-orbit-side px-3 py-2 text-sm text-white placeholder:text-orbit-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-orbit-cyan"
            />
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <p id={`${noteId}-error`} className="text-xs text-orbit-crit" role={error ? "alert" : undefined}>
                {error}
              </p>
              <span className="font-mono text-[11px] text-orbit-dim">
                {text.length}/{MAX_NOTE}
              </span>
            </div>
            <button
              type="submit"
              className="mt-2 inline-flex h-9 items-center rounded-lg border border-orbit-cyan/40 px-3 text-sm font-medium text-orbit-cyan transition-colors hover:bg-orbit-cyan/10 active:scale-[0.98]"
            >
              Save note
            </button>
          </form>

          <div>
            <p className="mb-2 text-xs font-medium text-orbit-muted">Notes</p>
            {notes.length === 0 ? (
              <p className="text-xs text-orbit-dim">No notes yet.</p>
            ) : (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-orbit-line p-2.5">
                    <p className="text-sm text-orbit-text">{n.text}</p>
                    <p className="mt-1 text-[11px] text-orbit-dim">
                      {n.author} · {formatDateTime(n.ts)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
