import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Bone, Brain, HeartPulse, RotateCcw, ScanLine, Utensils, Wind, X, type LucideIcon } from "lucide-react";
import { SimulatedTag } from "@/components/ui/primitives";
import type { Astronaut } from "@/data/types";
import { cn, statusColor, statusSoftBg, statusText } from "@/lib/health";
import { buildReports, ORGAN_IDS, SCAN_STATUS_LABEL, type OrganId } from "./organs";
import { SceneBoundary } from "./SceneBoundary";
import type { HudRefs } from "./Scene";

const Scene = lazy(() => import("./Scene"));

const ORGAN_ICON: Record<OrganId, LucideIcon> = {
  brain: Brain,
  heart: HeartPulse,
  lungs: Wind,
  metabolic: Utensils,
  skeleton: Bone,
};

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function BodyScanner({ astronaut }: { astronaut: Astronaut }) {
  const reports = useMemo(() => buildReports(astronaut), [astronaut]);
  const [selected, setSelected] = useState<OrganId | null>(null);
  const [modelMissing, setModelMissing] = useState(false);
  const [supported] = useState(() => webglAvailable());
  const reducedMotion = usePrefersReducedMotion();

  const hud: HudRefs = {
    container: useRef<HTMLDivElement>(null),
    card: useRef<HTMLElement>(null),
    svg: useRef<SVGSVGElement>(null),
    line: useRef<SVGPolylineElement>(null),
    dot: useRef<SVGCircleElement>(null),
    ring: useRef<SVGCircleElement>(null),
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const report = selected ? reports[selected] : null;
  const accent = report ? statusColor[report.status] : "#4cc9ff";

  return (
    <section
      aria-labelledby="scanner-heading"
      className="orbit-card relative overflow-hidden"
    >
      <div ref={hud.container} className="relative h-[640px] w-full md:h-[600px]">
        {supported ? (
          <SceneBoundary fallback={<ScannerUnavailable />}>
            <Suspense fallback={<ScannerLoading />}>
              <Scene
                reports={reports}
                selected={selected}
                onSelect={setSelected}
                onModelMissing={() => setModelMissing(true)}
                hud={hud}
                reducedMotion={reducedMotion}
              />
            </Suspense>
          </SceneBoundary>
        ) : (
          <ScannerUnavailable />
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(6,9,18,0.85)_100%)]"
        />

        <svg ref={hud.svg} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-200">
          <polyline ref={hud.line} fill="none" stroke={accent} strokeWidth="1.25" strokeOpacity="0.9" />
          <circle ref={hud.ring} r="9" fill="none" stroke={accent} strokeOpacity="0.55" />
          <circle ref={hud.dot} r="3.5" fill={accent} />
        </svg>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="orbit-eyebrow flex items-center gap-1.5">
                <ScanLine className="size-3.5 text-orbit-cyan" aria-hidden="true" />
                Biometric body scanner
              </p>
              <h2 id="scanner-heading" className="mt-1 text-lg font-semibold tracking-tight text-ink">
                {astronaut.name.split(" ")[0]}&apos;s holographic scan
              </h2>
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <SimulatedTag />
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-orbit-muted backdrop-blur transition-colors hover:text-ink"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Reset view
              </button>
            </div>
          </div>

          <div role="group" aria-label="Select organ system" className="pointer-events-auto -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {ORGAN_IDS.map((id) => {
              const r = reports[id];
              const Icon = ORGAN_ICON[id];
              const active = selected === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(active ? null : id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors",
                    active ? "border-white/40 bg-white/15 text-ink" : "border-white/12 bg-black/40 text-orbit-muted hover:text-ink",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {r.name}
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: statusColor[r.status] }} />
                  <span className="sr-only">{SCAN_STATUS_LABEL[r.status]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={cn(
            "pointer-events-none absolute bottom-4 left-4 flex-col gap-2 text-[11px] text-orbit-muted sm:left-5",
            selected ? "hidden md:flex" : "flex",
          )}
        >
          <p>Drag to orbit · scroll to zoom · click an organ to inspect</p>
          <ul className="flex flex-wrap items-center gap-3 font-mono uppercase tracking-wider">
            {(["stable", "warning", "critical"] as const).map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: statusColor[s] }} />
                {SCAN_STATUS_LABEL[s]}
              </li>
            ))}
          </ul>
          {modelMissing ? (
            <p className="max-w-xs text-orbit-warn">
              Showing a placeholder silhouette. Add your model at public/models/human-body.glb.
            </p>
          ) : null}
        </div>

        {report ? (
          <aside
            key={report.id}
            ref={hud.card}
            aria-live="polite"
            aria-label={`${report.name} telemetry`}
            className="absolute inset-x-3 bottom-3 max-h-[52%] animate-[hud-in_0.35s_ease-out] overflow-y-auto rounded-xl border bg-[#070b16]/90 p-4 shadow-2xl backdrop-blur-md md:inset-x-auto md:bottom-auto md:right-5 md:top-1/2 md:max-h-[84%] md:w-[310px] md:-translate-y-1/2"
            style={{ borderColor: `${accent}66`, boxShadow: `0 0 40px -12px ${accent}99` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-orbit-dim">{report.region}</p>
                <h3 className="mt-0.5 text-base font-semibold text-ink">{report.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
                    statusSoftBg[report.status],
                    statusText[report.status],
                  )}
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: accent }} />
                  {SCAN_STATUS_LABEL[report.status]}
                </span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close organ details"
                  className="rounded p-1 text-orbit-muted transition-colors hover:bg-white/10 hover:text-ink"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-orbit-muted">{report.summary}</p>

            <dl className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10 bg-black/30">
              {report.metrics.map((m) => (
                <div key={m.label} className="flex items-center justify-between gap-3 px-3 py-2">
                  <dt className="flex items-center gap-2 text-xs text-orbit-muted">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: statusColor[m.status] }} />
                    {m.label}
                    <span className="sr-only">, {SCAN_STATUS_LABEL[m.status]}</span>
                  </dt>
                  <dd className="text-right font-mono text-sm font-semibold text-ink">
                    {m.value}
                    {m.unit ? <span className="ml-1 text-[11px] font-normal text-orbit-dim">{m.unit}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-4">
              <p className="orbit-eyebrow">Countermeasures</p>
              <ol className="mt-2 space-y-2">
                {report.countermeasures.map((c, i) => (
                  <li key={c} className="flex gap-2.5 text-xs leading-relaxed text-ink/90">
                    <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full border border-white/20 font-mono text-[10px] text-orbit-muted">
                      {i + 1}
                    </span>
                    {c}
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function ScannerLoading() {
  return (
    <div role="status" className="flex h-full items-center justify-center gap-2 text-xs text-orbit-muted">
      <ScanLine className="size-4 animate-pulse text-orbit-cyan" aria-hidden="true" />
      Initialising scanner
    </div>
  );
}

function ScannerUnavailable() {
  return (
    <div role="alert" className="flex h-full items-center justify-center px-6 text-center text-sm text-orbit-muted">
      The 3D scanner needs WebGL, which isn&apos;t available in this browser. Use the organ buttons above to read each system&apos;s telemetry.
    </div>
  );
}
