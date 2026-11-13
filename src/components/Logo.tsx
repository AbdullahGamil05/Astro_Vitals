export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <clipPath id="logo-clip">
          <circle cx="20" cy="20" r="18" />
        </clipPath>
        <radialGradient id="logo-sky" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0%" stopColor="#1151b8" />
          <stop offset="100%" stopColor="#0b3d91" />
        </radialGradient>
      </defs>
      {/* White ring */}
      <circle cx="20" cy="20" r="19" fill="#fff" />
      {/* NASA blue sphere */}
      <circle cx="20" cy="20" r="18" fill="url(#logo-sky)" />
      {/* Stars inside */}
      <g clipPath="url(#logo-clip)">
        <circle cx="9" cy="10" r="0.9" fill="#fff" />
        <circle cx="14" cy="6.5" r="0.6" fill="#fff" />
        <circle cx="30" cy="9" r="0.8" fill="#fff" />
        <circle cx="33" cy="16" r="0.5" fill="#fff" />
        <circle cx="7" cy="22" r="0.6" fill="#fff" />
        <circle cx="26" cy="31" r="0.7" fill="#fff" />
        <circle cx="11" cy="28" r="0.5" fill="#fff" />
        {/* Red chevron (NASA swoosh) */}
        <path d="M-2 31 C 10 33, 22 24, 34 5 L 42 8 C 28 30, 12 40, -2 38 Z" fill="#fc3d21" />
      </g>
      {/* Orbital ellipse */}
      <ellipse cx="20" cy="20" rx="17" ry="6.2" fill="none" stroke="#fff" strokeWidth="1.5" transform="rotate(-24 20 20)" />
      {/* Small orbiting body */}
      <circle cx="33" cy="12.8" r="2" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ showText = true }: { showText?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {showText ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-xl font-semibold tracking-[0.2em] text-ink">ORBIT</span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-orbit-dim">NASA Health Command</span>
        </span>
      ) : null}
    </span>
  );
}
