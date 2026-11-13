import type { SubmittedAssessment } from "@/data/monitoring";
import type { StoredSession } from "@/services/manus/storage";
import { useManusConversation } from "@/services/manus/useManusConversation";
import { AiAnalysisCard } from "./AiAnalysisCard";
import { AssessmentChat } from "./AssessmentChat";

interface Props {
  userId: string;
  assessment?: SubmittedAssessment;
  resume?: StoredSession;
}

export function AiAssessmentSection({ userId, assessment, resume }: Props) {
  const convo = useManusConversation({ userId, assessment, resume });
  const analysis = convo.messages.filter((m) => m.role === "assistant" && m.turn === 0).map((m) => m.content).join("\n\n") || null;

  return (
    <div className="space-y-4">
      <AiAnalysisCard
        phase={convo.phase}
        snapshot={convo.snapshot}
        analysis={analysis}
        error={convo.error}
        timedOut={convo.timedOut}
        onRetryCreate={() => void convo.retryCreate()}
        onRefresh={convo.refresh}
      />
      <AssessmentChat
        phase={convo.phase}
        messages={convo.messages}
        snapshot={convo.snapshot}
        pending={convo.pending}
        sending={convo.sending}
        error={convo.error}
        onSend={convo.send}
        onRetrySend={convo.retrySend}
        onResume={convo.resumeAgent}
        onRefresh={convo.refresh}
      />
    </div>
  );
}
