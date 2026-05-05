import { useEffect, useState } from "react";

const TOTAL_MS = 48 * 3600 * 1000;

/** Circular progress ring around an avatar showing remaining time before expiry. */
export function ExpiryRing({
  expiresAt, size = 48, stroke = 2.5, children,
}: { expiresAt: string; size?: number; stroke?: number; children: React.ReactNode }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const ratio = Math.min(1, Math.max(0, remaining / TOTAL_MS));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * ratio;
  const hours = remaining / 3600_000;
  const color = hours <= 6 ? "hsl(0 84% 60%)" : hours <= 12 ? "hsl(28 92% 55%)" : "hsl(var(--primary))";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-[3px] overflow-hidden rounded-full">{children}</div>
    </div>
  );
}
