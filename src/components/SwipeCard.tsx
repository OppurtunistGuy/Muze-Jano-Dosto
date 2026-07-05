import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { GAME_CONFIG } from "@/config/gameConfig";

interface Props {
  accentColor: string;
  duration?: number;
  label?: string;
  startedAt?: number;
  transparentBg?: boolean;
  onSkip: () => void;
  onComplete: () => void;
  children: React.ReactNode;
}

/**
 * Full-screen conversation card (v1.0 final):
 *  - The card IS the hero — children render the question full-bleed.
 *  - A subtle ring animates around the card border for `duration` seconds.
 *    It's visual only, not a countdown — it just prevents accidental right-swipes.
 *  - Skip (swipe-left or button) is always active.
 *  - Done (swipe-right or button) unlocks only after the ring completes.
 */
export function SwipeCard({
  accentColor,
  duration = GAME_CONFIG.L2_TIMER_SECONDS,
  label,
  startedAt,
  transparentBg = false,
  onSkip,
  onComplete,
  children,
}: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const startT = useRef<number>(0);
  const swiped = useRef(false);

  useEffect(() => {
    const initialElapsed = startedAt ? Math.min(duration, (Date.now() - startedAt) / 1000) : 0;
    setElapsed(initialElapsed);

    const start = performance.now() - initialElapsed * 1000;
    let raf = 0;
    const tick = (t: number) => {
      const e = Math.min(duration, (t - start) / 1000);
      setElapsed(e);
      if (e < duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, startedAt]);

  const timerDone = elapsed >= duration;

  function tryHaptic(ms: number) {
    try {
      (navigator as unknown as { vibrate?: (p: number) => void }).vibrate?.(ms);
    } catch {
      /* noop */
    }
  }

  function handleSwipeEnd(dx: number, dt: number) {
    if (swiped.current) return;
    const THRESH = 60;
    const velocity = Math.abs(dx) / Math.max(1, dt);
    const fast = velocity > 0.6;

    if (dx <= -THRESH || (dx < -20 && fast)) {
      swiped.current = true;
      tryHaptic(10);
      onSkip();
      return;
    }
    if (timerDone && (dx >= THRESH || (dx > 20 && fast))) {
      swiped.current = true;
      tryHaptic(10);
      onComplete();
      return;
    }
    setDragX(0);
  }
  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    startT.current = performance.now();
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    setDragX(dx > 0 && !timerDone ? dx * 0.3 : dx);
  }
  function onPointerUp(e: React.PointerEvent) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    const dt = performance.now() - startT.current;
    startX.current = null;
    handleSwipeEnd(dx, dt);
  }

  const tilt = Math.max(-8, Math.min(8, dragX * 0.05));
  const pct = Math.min(1, elapsed / duration);
  const showLeftHint = dragX < -20;
  const showRightHint = dragX > 20 && timerDone;
  const scale = 1 - Math.min(0.06, Math.abs(dragX) * 0.0003);

  return (
    <div className="w-full max-w-md mx-auto select-none">
      <div
        className="relative touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          startX.current = null;
          setDragX(0);
        }}
      >
        {/* Ring wrapper (opaque mode) / clipped border-progress wrapper (transparentBg mode) */}
        <div
          className={transparentBg ? "relative rounded-3xl overflow-hidden transition-transform" : "relative rounded-3xl p-[3px] transition-transform"}
          style={{
            transform: `translate3d(${dragX}px, 0, 0) rotate(${tilt}deg) scale(${scale})`,
            background: transparentBg ? undefined : `conic-gradient(${accentColor} ${pct * 360}deg, rgba(255,255,255,0.18) 0deg)`,
            willChange: "transform, opacity",
          }}
        >
          <div className={transparentBg ? "relative" : "rounded-[22px] bg-white/90 backdrop-blur-md border border-white/50 shadow-card-lift p-6 sm:p-8 min-h-[360px] flex flex-col justify-center"}>
            {children}
          </div>

          {/* Time-elapsed indicator as a clean border-side bar, not a corner wedge (per user feedback) */}
          {transparentBg && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 pointer-events-none">
              <div
                className="h-full rounded-r-full transition-[width] duration-100 ease-linear"
                style={{ width: `${pct * 100}%`, background: accentColor }}
              />
            </div>
          )}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 -left-2 grid place-items-center transition-opacity"
          style={{ opacity: showLeftHint ? Math.min(1, Math.abs(dragX) / 100) : 0 }}
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white shadow-soft">
            <X className="h-6 w-6" />
          </span>
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 -right-2 grid place-items-center transition-opacity"
          style={{ opacity: showRightHint ? Math.min(1, Math.abs(dragX) / 100) : 0 }}
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-soft">
            <Check className="h-6 w-6" />
          </span>
        </div>
      </div>

      {!transparentBg && (
        <>
          {label ? <p className="mt-3 text-[11px] text-white/70 text-center">{label}</p> : null}
          <p className="mt-2 text-[11px] text-white/60 text-center">
            ← skip · → done{timerDone ? "" : " after 10s"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                swiped.current = true;
                onSkip();
              }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-red-500/95 text-white px-4 py-3 shadow-soft active:scale-95 transition"
            >
              <X className="h-4 w-4" /> <span className="text-sm font-semibold">Skip</span>
            </button>
            <button
              onClick={() => {
                if (!timerDone) return;
                swiped.current = true;
                onComplete();
              }}
              disabled={!timerDone}
              className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 shadow-soft transition ${
                timerDone
                  ? "bg-green-500 text-white active:scale-95"
                  : "bg-white/30 text-white/60 cursor-not-allowed"
              }`}
            >
              <Check className="h-4 w-4" /> <span className="text-sm font-semibold">Done</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}