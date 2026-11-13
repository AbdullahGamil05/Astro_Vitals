export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#28C5D8" />
          <stop offset="100%" stopColor="#20C7A5" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="9" fill="none" stroke="url(#logo-grad)" strokeWidth="2.5" />
      <ellipse cx="16" cy="16" rx="14" ry="5.5" fill="none" stroke="#28C5D8" strokeOpacity="0.45" strokeWidth="1.2" transform="rotate(-24 16 16)" />
      <circle cx="26" cy="9.6" r="2.2" fill="#20C7A5" />
    </svg>
  );
}

export function Wordmark({ showText = true }: { showText?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {showText ? (
        <span className="flex flex-col leading-none">
          <span className="text-[17px] font-semibold tracking-[0.22em] text-white">ORBIT</span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-orbit-dim">Health Command</span>
        </span>
      ) : null}
    </span>
  );
}
