import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/health";

type Tone = "success" | "info" | "warning";

interface ToastItem {
  id: number;
  message: string;
  detail?: string;
  tone: Tone;
}

type PushToast = (message: string, options?: { detail?: string; tone?: Tone }) => void;

const ToastContext = createContext<PushToast | null>(null);

const toneStyle: Record<Tone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "text-orbit-teal" },
  info: { icon: Info, className: "text-orbit-cyan" },
  warning: { icon: TriangleAlert, className: "text-orbit-warn" },
};

const VISIBLE_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback<PushToast>(
    (message, options) => {
      const id = nextId.current++;
      setItems((list) => [...list, { id, message, detail: options?.detail, tone: options?.tone ?? "success" }].slice(-4));
      window.setTimeout(() => dismiss(id), VISIBLE_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      >
        {items.map((t) => {
          const { icon: Icon, className } = toneStyle[t.tone];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 rounded-lg border border-orbit-line bg-orbit-side p-3 shadow-2xl shadow-black/50"
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", className)} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{t.message}</p>
                {t.detail ? <p className="mt-0.5 text-xs text-orbit-muted">{t.detail}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded p-1 text-orbit-dim hover:bg-white/5 hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): PushToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
