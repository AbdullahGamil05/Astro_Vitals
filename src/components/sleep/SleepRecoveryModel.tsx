import { Activity, BrainCircuit, Loader2, Moon, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Astronaut } from "@/data/types";
import { Card, CardHeader } from "@/components/ui/primitives";
import {
  buildSleepRecoveryFeatures,
  describeSleepFeatures,
  initialSleepRecoveryValues,
  type SleepModelFeatures,
  type SleepRecoveryFormValues,
} from "@/services/sleepModel/features";

type Prediction = {
  prediction: 0 | 1 | 2;
  probabilities: Record<"0" | "1" | "2", number>;
  feature_count: number;
  model: string;
};

const classes = {
  0: { label: "Recover", hint: "y ≤ tier_lo · Recovery-focused load", color: "text-orbit-teal", border: "border-orbit-teal/35 bg-orbit-teal/10", bar: "bg-orbit-teal" },
  1: { label: "Normal", hint: "Typical training load", color: "text-orbit-cyan", border: "border-orbit-cyan/35 bg-orbit-cyan/10", bar: "bg-orbit-cyan" },
  2: { label: "Hard", hint: "y ≥ tier_hi · Higher-intensity load", color: "text-orbit-warn", border: "border-orbit-warn/35 bg-orbit-warn/10", bar: "bg-orbit-warn" },
} as const;

const inputClass = "mt-1 block min-h-10 w-full rounded-md border border-orbit-line bg-black/25 px-3 py-2 text-sm text-ink outline-none transition focus:border-orbit-cyan disabled:cursor-not-allowed disabled:opacity-50";

function NumberField({
  id,
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
  disabled = false,
  required = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="block text-xs font-medium text-orbit-muted">
      {label}{required ? <span aria-hidden="true"> *</span> : null}
      <span className="relative block">
        <input
          id={id}
          className={inputClass}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          disabled={disabled}
          required={required && !disabled}
        />
        {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-orbit-dim">{suffix}</span> : null}
      </span>
    </label>
  );
}

function TimeField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label htmlFor={id} className="block text-xs font-medium text-orbit-muted">
      {label}<span aria-hidden="true"> *</span>
      <input id={id} className={inputClass} type="text" inputMode="numeric" placeholder="23:00" pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]" value={value} onChange={(event) => onChange(event.currentTarget.value)} aria-describedby={`${id}-hint`} required />
      <span id={`${id}-hint`} className="mt-1 block text-[11px] font-normal text-orbit-dim">Use 24-hour HH:MM.</span>
    </label>
  );
}

async function requestPrediction(features: SleepModelFeatures): Promise<Prediction> {
  const response = await fetch("/api/sleep-prediction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features }),
  });
  const result = (await response.json()) as Prediction | { error?: string };
  if (!response.ok || !("prediction" in result)) {
    throw new Error("error" in result && result.error ? result.error : "The sleep model could not return a prediction.");
  }
  return result;
}

function FeatureSummary({ features }: { features: SleepModelFeatures }) {
  const summary = describeSleepFeatures(features);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Automatically calculated sleep metrics">
      {[
        ["Efficiency", summary.efficiency],
        ["Awake", summary.awakeMinutes],
        ["Deep sleep", summary.deepPercent],
        ["REM sleep", summary.remPercent],
        ["Light sleep", summary.lightMinutes],
        ["7-day sleep debt", summary.sleepDebt],
      ].map(([label, value]) => (
        <div key={label} className="rounded-md border border-orbit-line bg-black/20 px-3 py-2">
          <p className="text-[11px] text-orbit-dim">{label}</p>
          <p className="mt-1 font-mono text-sm tabular-nums text-ink">{value}</p>
        </div>
      ))}
    </div>
  );
}

function PredictionResult({ result }: { result: Prediction }) {
  const selected = classes[result.prediction];
  return (
    <section className="rounded-lg border border-orbit-line bg-black/20 p-4 sm:p-5" aria-labelledby="sleep-prediction-result">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="orbit-eyebrow">Model prediction</p>
          <h3 id="sleep-prediction-result" className={`mt-1 text-2xl font-semibold ${selected.color}`}>{selected.label}</h3>
          <p className="mt-1 text-sm text-orbit-muted">{selected.hint}</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${selected.border}`}>
          <span className={`size-2 rounded-full ${selected.bar}`} aria-hidden="true" />
          Class {result.prediction}
        </span>
      </div>

      <div className="mt-5 space-y-3" aria-label="Class probabilities">
        {([0, 1, 2] as const).map((classId) => {
          const item = classes[classId];
          const probability = result.probabilities[String(classId) as "0" | "1" | "2"] ?? 0;
          return (
            <div key={classId}>
              <div className="mb-1 flex justify-between gap-3 text-xs">
                <span className="text-orbit-muted">{item.label}</span>
                <span className="font-mono tabular-nums text-ink">{(probability * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${item.label} probability`} aria-valuenow={Math.round(probability * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${Math.max(0, Math.min(100, probability * 100))}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-orbit-dim">Prediction uses all {result.feature_count} model features, including the bundled scaler and PCA transforms.</p>
    </section>
  );
}

export function SleepRecoveryModel({ astronaut }: { astronaut: Astronaut }) {
  const [values, setValues] = useState<SleepRecoveryFormValues>(() => initialSleepRecoveryValues(astronaut));
  const [features, setFeatures] = useState<SleepModelFeatures | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function update<K extends keyof SleepRecoveryFormValues>(key: K, value: SleepRecoveryFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const built = buildSleepRecoveryFeatures(values, astronaut);
    if ("error" in built) {
      setError(built.error ?? "Enter the required model inputs.");
      setPrediction(null);
      setFeatures(null);
      return;
    }

    setError(null);
    setIsLoading(true);
    setFeatures(built.features);
    setPrediction(null);
    try {
      setPrediction(await requestPrediction(built.features));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The sleep model could not return a prediction.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Sleep recovery model"
        subtitle="Uses last night’s sleep and yesterday’s workload to classify recovery readiness."
        action={<span className="inline-flex items-center gap-1.5 rounded-full border border-orbit-cyan/25 bg-orbit-cyan/10 px-2.5 py-1 text-[11px] font-medium text-orbit-cyan"><BrainCircuit aria-hidden="true" /> Classifier</span>}
      />

      <form className="space-y-6" onSubmit={(event) => void submit(event)}>
        <fieldset className="space-y-4">
          <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Moon aria-hidden="true" />Last night’s sleep</legend>
          <p className="-mt-2 text-xs leading-relaxed text-orbit-dim">Sleep duration and stages are prefilled from the astronaut profile when available. Check your tracker and adjust them before running the model.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField id="sleep-asleep" label="Minutes asleep" value={values.minutesAsleep} onChange={(value) => update("minutesAsleep", value)} max={1440} suffix="min" />
            <NumberField id="sleep-in-bed" label="Time in bed" value={values.timeInBed} onChange={(value) => update("timeInBed", value)} max={1440} suffix="min" />
            <NumberField id="sleep-wakes" label="Times awake" value={values.wakeCount} onChange={(value) => update("wakeCount", value)} max={100} />
            <TimeField id="sleep-bedtime" label="Bedtime" value={values.bedtime} onChange={(value) => update("bedtime", value)} />
            <div>
              <NumberField id="sleep-resting-hr" label="Resting heart rate" value={values.restingHr} onChange={(value) => update("restingHr", value)} min={25} max={220} suffix="bpm" required={false} />
              <p className="mt-1 text-[11px] text-orbit-dim">Optional; missing values use the model’s training-set imputation.</p>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-orbit-line bg-black/15 p-3 text-sm text-orbit-text">
            <input type="checkbox" checked={values.hasStages} onChange={(event) => update("hasStages", event.currentTarget.checked)} className="mt-0.5 size-4 accent-orbit-cyan" />
            <span><span className="font-medium text-ink">Sleep-stage data is available</span><span className="mt-0.5 block text-xs text-orbit-dim">When off, stage minutes and percentages are marked unavailable rather than estimated.</span></span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField id="sleep-deep" label="Deep sleep" value={values.deepMinutes} onChange={(value) => update("deepMinutes", value)} max={1440} suffix="min" disabled={!values.hasStages} />
            <NumberField id="sleep-rem" label="REM sleep" value={values.remMinutes} onChange={(value) => update("remMinutes", value)} max={1440} suffix="min" disabled={!values.hasStages} />
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-orbit-line pt-5">
          <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Activity aria-hidden="true" />Yesterday’s activity</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField id="sleep-active-minutes" label="Active minutes" value={values.activeMinutesYesterday} onChange={(value) => update("activeMinutesYesterday", value)} max={1440} suffix="min" />
            <label htmlFor="sleep-load" className="block text-xs font-medium text-orbit-muted">
              Training load
              <span className="relative block">
                <input id="sleep-load" className={inputClass} type="number" inputMode="decimal" min={0} step="any" value={values.loadYesterday} onChange={(event) => update("loadYesterday", event.currentTarget.value)} disabled={!values.loadLoggedYesterday} required={values.loadLoggedYesterday} />
              </span>
              <span className="mt-1 block text-[11px] font-normal text-orbit-dim">Use the same scale as the source training log.</span>
            </label>
            <label className="flex items-center gap-3 rounded-md border border-orbit-line bg-black/15 px-3 py-2 text-xs text-orbit-muted">
              <input type="checkbox" checked={values.loadLoggedYesterday} onChange={(event) => update("loadLoggedYesterday", event.currentTarget.checked)} className="size-4 accent-orbit-cyan" />
              <span>Training load was logged yesterday</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-orbit-line pt-5">
          <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Sparkles aria-hidden="true" />Personal baseline</legend>
          <p className="-mt-2 text-xs leading-relaxed text-orbit-dim">Sleep duration and resting-heart-rate baselines use the seven most recent profile days. Efficiency and stage-share baselines use the profile sleep summary. Seven-day sleep debt sums deficits from an 8-hour target; enter usual awakenings and bedtime, which are not recorded.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField id="sleep-normal-wakes" label="Usual times awake" value={values.typicalWakeCount} onChange={(value) => update("typicalWakeCount", value)} max={100} />
            <TimeField id="sleep-normal-bedtime" label="Usual bedtime" value={values.typicalBedtime} onChange={(value) => update("typicalBedtime", value)} />
          </div>
        </fieldset>

        <section aria-labelledby="sleep-derived-title" className="space-y-3 border-t border-orbit-line pt-5">
          <div>
            <h3 id="sleep-derived-title" className="text-sm font-semibold text-ink">Calculated features</h3>
            <p className="mt-1 text-xs text-orbit-dim">Efficiency, awake/light minutes, sleep-stage proportions, wake time, seven-day sleep debt (8-hour target) and baseline differences are derived before inference.</p>
          </div>
          {features ? <FeatureSummary features={features} /> : null}
        </section>

        {error ? <p role="alert" className="rounded-md border border-orbit-crit/30 bg-orbit-crit/10 px-3 py-2 text-sm text-orbit-crit">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-orbit-line pt-5">
          <button type="submit" disabled={isLoading} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-orbit-cyan px-4 py-2 text-sm font-semibold text-orbit-bg transition hover:bg-orbit-cyan/90 disabled:cursor-wait disabled:opacity-60">
            {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <BrainCircuit aria-hidden="true" />}
            {isLoading ? "Classifying…" : "Run sleep model"}
          </button>
          <p className="max-w-xl text-xs leading-relaxed text-orbit-dim">Classifier output is a training-readiness category, not a medical diagnosis or a substitute for your care team.</p>
        </div>
      </form>

      {prediction ? <div className="mt-6"><PredictionResult result={prediction} /></div> : null}
      {features ? (
        <details className="mt-4 rounded-md border border-orbit-line bg-black/15 p-3">
          <summary className="cursor-pointer text-xs font-medium text-orbit-muted">Review all model inputs ({prediction?.feature_count ?? 27})</summary>
          <pre className="mt-3 max-h-72 overflow-auto rounded bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-orbit-dim">{JSON.stringify(features, null, 2)}</pre>
        </details>
      ) : null}
    </Card>
  );
}
