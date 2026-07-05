/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";
import { Wrench, X } from "lucide-react";

export type DevJump = "/" | "/setup" | "/game" | "/level-2" | "/complete";

export function useDev() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const stored = window.localStorage.getItem("knowem.dev") === "1";
    setOn(params.has("dev") || stored);
    if (params.has("dev")) {
      try {
        window.localStorage.setItem("knowem.dev", "1");
      } catch {
        /* ignore */
      }
    }
  }, []);
  return on;
}

interface Props {
  context: "level-1" | "level-2";
  onAutoAnswer?: () => void;
  onContinueLock?: () => void;
  onComplete?: () => void;
  onForceCategory?: (cat: string) => void;
  onJump?: (to: DevJump) => void;
}

const CATS = [
  { emoji: "🔥", name: "Growth & Challenges" },
  { emoji: "💗", name: "Family & Relationships" },
  { emoji: "🌅", name: "Future Plans" },
  { emoji: "🌿", name: "About Your Life" },
  { emoji: "💼", name: "Career & Finance" },
  { emoji: "✨", name: "Fun & Random" },
];

export function DevPanel(props: Props) {
  const on = useDev();
  const [open, setOpen] = useState(false);
  if (!on) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      {open ? (
        <div className="w-72 rounded-2xl bg-charcoal text-white shadow-2xl p-3 text-xs space-y-2 animate-rise">
          <div className="flex items-center justify-between">
            <span className="font-mono uppercase tracking-widest text-[10px] text-white/60">
              Dev · {props.context}
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close dev panel"
              className="text-white/60 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {props.onAutoAnswer ? (
            <button
              onClick={props.onAutoAnswer}
              className="w-full rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2 text-left"
            >
              ⚡ Auto-answer current
            </button>
          ) : null}
          {props.onContinueLock ? (
            <button
              onClick={props.onContinueLock}
              className="w-full rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2 text-left"
            >
              ⏭ Continue from lock
            </button>
          ) : null}
          {props.onComplete ? (
            <button
              onClick={props.onComplete}
              className="w-full rounded-lg bg-white/10 hover:bg-white/15 px-3 py-2 text-left"
            >
              ✅ Complete {props.context}
            </button>
          ) : null}

          {props.onForceCategory ? (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-white/50 px-1">
                Force category
              </div>
              <div className="grid grid-cols-2 gap-1">
                {CATS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => props.onForceCategory!(c.name)}
                    className="rounded-lg bg-white/5 hover:bg-white/15 px-2 py-1.5 text-left"
                  >
                    {c.emoji} {c.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {props.onJump ? (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-white/50 px-1">
                Jump to
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(["/", "/setup", "/game", "/level-2", "/complete"] as DevJump[]).map((to) => (
                  <button
                    key={to}
                    onClick={() => props.onJump!(to)}
                    className="rounded-lg bg-white/5 hover:bg-white/15 px-2 py-1.5 text-center font-mono"
                  >
                    {to}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open dev panel"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-charcoal text-white shadow-xl hover:scale-105 transition"
        >
          <Wrench className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
