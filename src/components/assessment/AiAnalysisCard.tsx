import { AlertTriangle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/primitives";
import type { ConversationError, Phase } from "@/services/manus/useManusConversation";
import type { StatusSnapshot } from "@/services/manus/api";
import { Markdown } from "./Markdown";

interface Props {
  phase: Phase;
  snapshot: StatusSnapshot | null;
  analysis: string | null;
  error: ConversationError | null;
  timedOut: boolean;
  onRetryCreate: () => void;
  onRefresh: () => void;
}

function ErrorBlock({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-orbit-warn/40 bg-orbit-warn/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-orbit-text">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orbit-warn" aria-hidden="true" />
        <span>{message}</span>
      </p>
      {children}
    </div>
  );
}

const retryButton =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm text-ink hover:bg-white/5";

export function AiAnalysisCard({ phase, snapshot, analysis, error, timedOut, onRetryCreate, onRefresh }: Props) {
  const failed = phase === "create_failed";
  const lost = phase === "session_lost";
  const taskFailed = snapshot?.state === "error" && !analysis;
  const waiting = !analysis && !failed && !lost && !taskFailed;

  return (
    <Card>
      <CardHeader title="AI health analysis" subtitle="Personalised wellness guidance based on this check-in. Not a diagnosis." action={<Sparkles className="size-4 text-orbit-cyan" aria-hidden="true" />} />

      {failed ? (
        <ErrorBlock message={`${error?.message ?? "The analysis could not be started."} Your check-in was saved and is not lost.`}>
          <button type="button" onClick={onRetryCreate} className={retryButton}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </button>
        </ErrorBlock>
      ) : null}

      {lost ? <ErrorBlock message={error?.message ?? "This analysis is no longer available. Submit a new check-in to get a fresh one."} /> : null}

      {taskFailed ? (
        <ErrorBlock message={snapshot?.error ?? "The assistant could not finish the analysis."}>
          <button type="button" onClick={onRefresh} className={retryButton}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Check again
          </button>
        </ErrorBlock>
      ) : null}

      {waiting ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-orbit-muted">
            <Loader2 className="size-4 animate-spin text-orbit-cyan" aria-hidden="true" />
            {phase === "creating" ? "Sending your check-in to the AI health assistant…" : "Analysing your check-in. This can take a minute."}
          </p>
          {snapshot?.progressNote ? <p className="text-xs text-orbit-dim">{snapshot.progressNote}</p> : null}
          {timedOut ? (
            <ErrorBlock message="This is taking longer than usual. The analysis may still arrive.">
              <button type="button" onClick={onRefresh} className={retryButton}>
                <RefreshCw className="size-4" aria-hidden="true" />
                Keep waiting
              </button>
            </ErrorBlock>
          ) : (
            <div className="space-y-2" aria-hidden="true">
              <div className="h-3 w-11/12 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-10/12 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-8/12 animate-pulse rounded bg-white/10" />
            </div>
          )}
        </div>
      ) : null}

      {analysis ? <Markdown>{analysis}</Markdown> : null}
    </Card>
  );
}
