interface Props {
  remaining: number; // seconds remaining
  total: number; // total seconds
  size?: number;
}

export function CircularTimer({ remaining, total, size = 56 }: Props) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, remaining / total));
  const offset = c - pct * c;
  const urgent = remaining <= 5;
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={urgent ? "oklch(0.65 0.22 25)" : "url(#timer-gradient)"}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <defs>
          <linearGradient id="timer-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#B38ACB" />
            <stop offset="100%" stopColor="#A678C4" />
          </linearGradient>
        </defs>
      </svg>
      <span
        className={`absolute text-sm font-semibold tabular-nums ${urgent ? "text-destructive" : "text-charcoal"}`}
        aria-live="polite"
      >
        {Math.max(0, Math.ceil(remaining))}
      </span>
    </div>
  );
}
