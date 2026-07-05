import { useEffect, useRef, useState } from "react";

interface Item {
  id: string;
  back?: React.ReactNode;
}

interface Props<T extends Item> {
  items: T[];
  onPick: (item: T, idx: number) => void;
  /** Card back solid gradient. */
  gradient: string;
  /** Small icon rendered in the center of each card back. */
  centerIcon?: React.ReactNode;
  /** Optional label under the fan. */
  hint?: string;
}

/**
 * Circular arc / fan of face-down cards.
 *  - Cards laid along an arc; drag horizontally to rotate the arc.
 *  - Tap a card → immediate 3D flip animation → onPick fires as flip completes.
 *  - No dot indicators, no arrows, no "tap to flip" text.
 */
export function CircularArc<T extends Item>({
  items,
  onPick,
  gradient,
  centerIcon,
  hint,
}: Props<T>) {
  const [rotation, setRotation] = useState(0);
  const [flipping, setFlipping] = useState<string | null>(null);
  const dragRef = useRef<{ x: number; base: number } | null>(null);

  const N = Math.max(1, items.length);
  const SPREAD = Math.min(90, 14 * (N - 1)); // total degrees across the arc

  useEffect(() => {
    // Recenter arc when the item count shrinks.
    setRotation(0);
  }, [N]);

  function onDown(e: React.PointerEvent) {
    dragRef.current = { x: e.clientX, base: rotation };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    setRotation(dragRef.current.base + dx * 0.35);
  }
  function onUp() {
    dragRef.current = null;
  }

  function tap(item: T, idx: number) {
    if (flipping) return;
    setFlipping(item.id);
    try {
      (navigator as unknown as { vibrate?: (n: number) => void }).vibrate?.(8);
    } catch {
      /* noop */
    }
    setTimeout(() => onPick(item, idx), 360);
  }

  return (
    <div className="animate-rise">
      <div
        className="relative mx-auto touch-pan-y"
        style={{ width: "min(96vw, 380px)", height: 380, perspective: 1200 }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {items.map((item, i) => {
          const t = N === 1 ? 0 : i / (N - 1) - 0.5; // -0.5..0.5
          const arcRot = t * SPREAD + rotation * 0.6;
          const offsetX = t * 90;
          const offsetY = Math.abs(t) * 26;
          const isFlipping = flipping === item.id;
          return (
            <button
              key={item.id}
              onClick={() => tap(item, i)}
              aria-label="Draw card"
              className="absolute left-1/2 top-2 rounded-3xl active:scale-[0.98] border border-white/50 backdrop-blur-md shadow-card-lift transition"
              style={{
                transform: `translateX(-50%) translateX(${offsetX}px) translateY(${offsetY}px) rotate(${arcRot}deg) ${
                  isFlipping ? "rotateY(180deg) scale(1.1)" : ""
                }`,
                transformStyle: "preserve-3d",
                transition: "transform 360ms cubic-bezier(.2,.7,.2,1)",
                width: "min(58vw, 200px)",
                height: 280,
                background: gradient === "white" ? "rgba(255, 255, 255, 0.88)" : gradient,
                zIndex: 100 - Math.abs(i - Math.floor(N / 2)),
                opacity: isFlipping ? 0 : 1,
              }}
            >
              <div className="h-full w-full rounded-3xl p-4 flex flex-col items-center justify-center gap-2">
                {centerIcon ?? (
                  <span className="font-display text-7xl text-neutral-400 leading-none">?</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {hint ? <p className="mt-4 text-xs text-white/70 text-center">{hint}</p> : null}
    </div>
  );
}
