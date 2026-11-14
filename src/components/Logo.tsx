export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/brand/astro-vitals-logo.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className="shrink-0 object-contain"
      decoding="async"
    />
  );
}

export function Wordmark({ showText = true }: { showText?: boolean }) {
  return (
    <span className="flex items-center gap-2.5" aria-label={showText ? undefined : "AstroVitals"}>
      <LogoMark />
      {showText ? (
        <span className="flex flex-col leading-none">
          <span className="brand-wordmark text-xl text-ink">AstroVitals</span>
          <span className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-orbit-dim">NASA Health Command</span>
        </span>
      ) : null}
    </span>
  );
}
