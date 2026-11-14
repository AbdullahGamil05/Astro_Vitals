const logoImageUrl =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/astrovitals_icon_transparent-2SDFho0CITsX6zzchUFBXXyH24Y7HG.png";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src={logoImageUrl}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="block shrink-0 rounded-full object-contain"
    />
  );
}

export function Wordmark({ showText = true }: { showText?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {showText ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-xl font-semibold tracking-tight text-ink">AstroVitals</span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-orbit-dim">NASA Health Command</span>
        </span>
      ) : null}
    </span>
  );
}
