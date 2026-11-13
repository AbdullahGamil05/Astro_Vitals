import { ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AiAssessmentSection } from "@/components/assessment/AiAssessmentSection";
import { Card, ProgressRing } from "@/components/ui/primitives";
import { loadStoredSession, type StoredSession } from "@/services/manus/storage";
import type { PartialAnswers, SubmittedAssessment } from "@/data/monitoring";
import { isComplete, isSectionComplete, moodLabel, questions, sections, type Question } from "@/lib/assessment";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/health";
import { useLatestAssessment, useLive } from "@/lib/liveData";
import { formatDateTime } from "@/lib/time";

function Choice({ q, value, onChange }: { q: Question; value: number | boolean | undefined; onChange: (v: number | boolean) => void }) {
  const options: { label: string; value: number | boolean }[] =
    q.kind === "yesno"
      ? [
          { label: "No", value: false },
          { label: "Yes", value: true },
        ]
      : [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }));

  return (
    <fieldset className="rounded-lg border border-orbit-line bg-black/15 p-4">
      <legend className="px-1 text-sm font-medium text-ink">{q.prompt}</legend>
      <div className={cn("mt-2 flex gap-2", q.kind === "yesno" && "max-w-xs")}>
        {options.map((o) => (
          <label key={String(o.value)} className="flex-1 cursor-pointer">
            <input
              type="radio"
              name={q.id}
              className="peer sr-only"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span className="flex h-11 items-center justify-center rounded-lg border border-white/10 text-sm font-medium text-orbit-muted transition-colors hover:text-ink peer-checked:border-orbit-cyan peer-checked:bg-orbit-cyan/15 peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-orbit-cyan">
              {o.label}
            </span>
          </label>
        ))}
      </div>
      {q.kind === "scale" ? (
        <div className="mt-1.5 flex justify-between text-[11px] text-orbit-muted">
          <span>1 = {q.low}</span>
          <span>5 = {q.high}</span>
        </div>
      ) : null}
    </fieldset>
  );
}

const escalationCopy = {
  none: { title: "Thank you. No concerns were flagged.", body: "Your check-in has been recorded and shared with the medical team.", tone: "text-orbit-teal", icon: CheckCircle2 },
  review: {
    title: "Your answers were flagged for review",
    body: "A flight surgeon will look at your check-in and may follow up with you. Nothing here is a diagnosis.",
    tone: "text-orbit-warn",
    icon: ShieldAlert,
  },
  urgent: {
    title: "Your answers need prompt medical review",
    body: "The medical team has been alerted. If you feel unwell right now, contact the flight surgeon directly instead of waiting.",
    tone: "text-orbit-crit",
    icon: ShieldAlert,
  },
} as const;

function Confirmation({ result, onAgain }: { result: SubmittedAssessment; onAgain: () => void }) {
  const copy = escalationCopy[result.escalation];
  const Icon = copy.icon;
  return (
    <Card glow className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <ProgressRing value={result.score}>
          <span className="font-mono text-2xl font-semibold text-ink">{result.score}</span>
          <span className="text-[10px] uppercase tracking-wider text-orbit-muted">Wellness</span>
        </ProgressRing>
        <div>
          <h2 className={cn("flex items-center justify-center gap-2 text-lg font-semibold sm:justify-start", copy.tone)} role="status">
            <Icon className="size-5" aria-hidden="true" />
            {copy.title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-orbit-muted">{copy.body}</p>
          <p className="mt-2 text-xs text-orbit-muted">Mood reported: {moodLabel(result.answers.mood)}. Submitted {formatDateTime(result.submittedAt)}.</p>
        </div>
      </div>

      {result.flags.length > 0 ? (
        <div className="mt-5 rounded-lg border border-orbit-line bg-black/20 p-4">
          <p className="orbit-eyebrow">What was flagged</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-orbit-text marker:text-orbit-dim">
            {result.flags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/astronaut/ai-analysis" className="inline-flex h-10 items-center rounded-lg bg-orbit-cyan px-4 text-sm font-semibold text-orbit-bg hover:bg-orbit-cyan/90">
          Run AI analysis
        </Link>
        <Link to="/astronaut/history" className="inline-flex h-10 items-center rounded-lg border border-white/15 px-4 text-sm text-ink hover:bg-white/5">
          View health history
        </Link>
        <button type="button" onClick={onAgain} className="inline-flex h-10 items-center rounded-lg px-3 text-sm text-orbit-muted hover:text-ink">
          Submit another check-in
        </button>
      </div>
    </Card>
  );
}

export function AssessmentPage() {
  const { user } = useAuth();
  const id = user?.astronautId;
  const { submitAssessment } = useLive();
  const previous = useLatestAssessment(id);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<PartialAnswers>({});
  const [result, setResult] = useState<SubmittedAssessment | null>(null);
  const [resumeSession, setResumeSession] = useState<StoredSession | null>(null);
  const storedSession = id ? loadStoredSession(id) : null;

  if (!id) return null;
  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Confirmation
          result={result}
          onAgain={() => {
            setResult(null);
            setAnswers({});
            setStep(0);
          }}
        />
        <AiAssessmentSection key={result.id} userId={id} assessment={result} />
      </div>
    );
  }
  if (resumeSession) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <button type="button" onClick={() => setResumeSession(null)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm text-ink hover:bg-white/5">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to check-in
        </button>
        <AiAssessmentSection userId={id} resume={resumeSession} />
      </div>
    );
  }

  const section = sections[step];
  const sectionQuestions = questions.filter((q) => q.section === section.id);
  const canContinue = isSectionComplete(section.id, answers);
  const isLast = step === sections.length - 1;

  const submit = () => {
    if (isComplete(answers)) setResult(submitAssessment(id, answers));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <ol className="flex items-center gap-2" aria-label="Progress">
        {sections.map((s, i) => (
          <li key={s.id} className="flex flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                i < step ? "border-orbit-teal bg-orbit-teal/20 text-orbit-teal" : i === step ? "border-orbit-cyan text-orbit-cyan" : "border-white/15 text-orbit-muted",
              )}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span className={cn("text-sm", i === step ? "text-ink" : "text-orbit-muted")}>{s.title}</span>
            {i < sections.length - 1 ? <span className="h-px flex-1 bg-white/10" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>

      <Card>
        <h2 className="text-base font-semibold text-ink">{section.title}</h2>
        <p className="mt-0.5 text-sm text-orbit-muted">{section.description}</p>
        {previous ? <p className="mt-2 text-xs text-orbit-dim">Last check-in: {formatDateTime(previous.submittedAt)}</p> : null}

        <div className="mt-4 space-y-3">
          {sectionQuestions.map((q) => (
            <Choice key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm text-ink transition-colors hover:bg-white/5 disabled:invisible"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={submit}
              disabled={!isComplete(answers)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-orbit-cyan px-5 text-sm font-semibold text-orbit-bg transition-colors hover:bg-orbit-cyan/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit check-in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canContinue}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-orbit-cyan px-5 text-sm font-semibold text-orbit-bg transition-colors hover:bg-orbit-cyan/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {!canContinue || (isLast && !isComplete(answers)) ? (
          <p className="mt-2 text-right text-xs text-orbit-muted">Answer every question to continue.</p>
        ) : null}
      </Card>

      {storedSession ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orbit-line bg-black/15 px-4 py-3">
          <p className="text-sm text-orbit-muted">
            Your latest AI health analysis from {formatDateTime(storedSession.createdAt)} is still available.
          </p>
          <button
            type="button"
            onClick={() => setResumeSession(storedSession)}
            className="inline-flex h-9 items-center rounded-lg border border-white/15 px-3 text-sm text-ink hover:bg-white/5"
          >
            Open analysis
          </button>
        </div>
      ) : null}
    </div>
  );
}
