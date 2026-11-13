import { Check, Rocket, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/primitives";

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
}

export function PlaceholderPage({ icon: Icon, title, description, features }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="orbit-grid-bg relative overflow-hidden p-8 sm:p-12" glow>
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-orbit-cyan/15 blur-3xl" />
        <div className="relative">
          <span className="flex size-14 items-center justify-center rounded-2xl border border-orbit-cyan/30 bg-orbit-cyan/10 text-orbit-cyan">
            <Icon className="size-7" aria-hidden="true" />
          </span>
          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-orbit-line bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-orbit-muted">
            <Rocket className="size-3.5 text-orbit-teal" aria-hidden="true" />
            Planned for Stage 2
          </span>
          <h2 className="mt-4 text-2xl font-semibold text-white text-balance">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-orbit-muted text-pretty">{description}</p>

          <h3 className="orbit-eyebrow mt-8">What this module will include</h3>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 rounded-lg border border-orbit-line bg-black/20 px-3 py-2.5 text-sm text-white/90">
                <Check className="mt-0.5 size-4 shrink-0 text-orbit-teal" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
