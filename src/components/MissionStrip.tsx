import { useEffect, useState } from "react";

const MISSION_EPOCH = Date.UTC(2026, 0, 1, 0, 0, 0);

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = pad(Math.floor((total % 86400) / 3600));
  const m = pad(Math.floor((total % 3600) / 60));
  const s = pad(total % 60);
  return `${String(days).padStart(3, "0")}:${h}:${m}:${s}`;
}

export function MissionStrip() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-8 items-center justify-between gap-4 border-b border-orbit-line bg-nasa-blue/40 px-4 font-sans text-[10px] text-ink/80 backdrop-blur-md sm:px-6">
      <span className="flex min-w-0 items-center gap-2 truncate">
        <span className="size-1.5 shrink-0 rounded-full bg-orbit-cyan" aria-hidden="true" />
        <span className="brand-wordmark truncate text-xs normal-case text-ink">AstroVitals</span>
        <span className="hidden text-ink/40 md:inline">/</span>
        <span className="hidden text-ink/60 md:inline">Simulated telemetry</span>
      </span>
      <span className="shrink-0 font-mono" aria-label="Mission elapsed time">
        <span className="text-ink/50">MET </span>
        <span className="tabular-nums text-ink">{formatElapsed(now - MISSION_EPOCH)}</span>
      </span>
    </div>
  );
}
