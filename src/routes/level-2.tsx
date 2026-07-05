import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { ArrowRight, ChevronLeft, Heart, Flame, Sparkles } from "lucide-react";
import { GAME_CONFIG } from "@/config/gameConfig";
import { Logo, PageBackdrop } from "@/components/Brand";
import { DevPanel } from "@/components/DevPanel";
import { ExitConfirmationPopup } from "@/components/ExitConfirmationPopup";
import { SwipeCard } from "@/components/SwipeCard";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { loadPlay, updatePlay } from "@/lib/playSession";
import { L2_CATEGORIES, type L2Category, type L2Question } from "@/lib/types";
import { L2_META, L2_QUESTIONS } from "@/lib/level2.seed";
import { CATEGORY_VISUALS } from "@/components/CategoryIllustrations";
import {
  getSessionByCode,
  subscribeSession,
  updateSessionLevelAndMeta,
  type SessionRow,
} from "@/lib/session";
import { loadLastResult, getParticipant } from "@/lib/storage";

export const CATEGORY_THEME_MAP = {
  "Growth & Challenges": {
    bgGradient: "from-[#FF6B6B] via-[#FFB347] to-[#FFE3D1]",
    accentColor: "#FF6B6B",
    icon: "🔥",
    cardStyle: "bg-white border-[#FFB347]/30 text-slate-800"
  },
  "Family & Relationships": {
    bgGradient: "from-[#FF6FA8] via-[#FFC1D6] to-[#FFE6EF]",
    accentColor: "#FF6FA8",
    icon: "🌸",
    cardStyle: "bg-white border-[#FFC1D6]/30 text-slate-800"
  },
  "About Your Life": {
    bgGradient: "from-[#7C6AED] via-[#B9A7FF] to-[#EDE9FE]",
    accentColor: "#7C6AED",
    icon: "🔮",
    cardStyle: "bg-white border-[#B9A7FF]/30 text-slate-800"
  },
  "Future Plans": {
    bgGradient: "from-[#34C38F] via-[#A7F3D0] to-[#E6FDF5]",
    accentColor: "#34C38F",
    icon: "🌱",
    cardStyle: "bg-white border-[#A7F3D0]/30 text-slate-800"
  },
  "Fun & Random": {
    bgGradient: "from-[#FF8020] via-[#FFD166] to-[#FFF1CC]",
    accentColor: "#FF8020",
    icon: "☀️",
    cardStyle: "bg-white border-[#FFD166]/30 text-slate-800"
  },
  "Career & Finance": {
    bgGradient: "from-[#4A90E2] via-[#A6C8FF] to-[#E8F1FF]",
    accentColor: "#4A90E2",
    icon: "💼",
    cardStyle: "bg-white border-[#A6C8FF]/30 text-slate-800"
  }
} as const;

export function getDeckGradient(category: L2Category): string {
  const map: Record<L2Category, string> = {
    "Growth & Challenges": "from-[#FF6B6B] to-[#FF8E53] border-white/20 text-white",
    "Family & Relationships": "from-[#FF6FA8] to-[#FF9EB5] border-white/20 text-white",
    "About Your Life": "from-[#7C6AED] to-[#9B8CFF] border-white/20 text-white",
    "Future Plans": "from-[#34C38F] to-[#5EEAD4] border-white/20 text-white",
    "Fun & Random": "from-[#FF8020] to-[#FBBF24] border-white/20 text-white",
    "Career & Finance": "from-[#4A90E2] to-[#60A5FA] border-white/20 text-white"
  };
  return map[category] || "from-[#7C6AED] to-[#9B8CFF] border-white/20 text-white";
}

export const Route = createFileRoute("/level-2")({
  head: () => ({ meta: [{ title: "Level 2 — Discovery" }] }),
  component: Level2,
});

type Stage =
  | { kind: "wheel-idle" }
  | { kind: "wheel-spinning"; target: L2Category }
  | { kind: "wheel-landed"; target: L2Category }
  | { kind: "carousel"; category: L2Category; cards: L2Question[] }
  | { kind: "discuss"; category: L2Category; questionId: string; startedAt?: number };

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Returns every question in a category (not just undrawn ones) so already-drawn
// cards can still appear in the carousel, greyed out, rather than disappearing
// (per user request). "bothDone" is not needed as a separate filter here — a
// card in bothDone is, by definition, already in this player's own done set too.
function allCategoryCards(cat: L2Category): L2Question[] {
  return shuffled(L2_QUESTIONS.filter((q) => q.category === cat));
}

function hasEligibleCard(cat: L2Category, playerDone: Set<string>): boolean {
  return L2_QUESTIONS.some((q) => q.category === cat && !playerDone.has(q.id));
}

function pickWeightedCategory(exclude: L2Category | null, eligible: L2Category[]): L2Category {
  const filtered =
    exclude && eligible.length > 1 ? eligible.filter((c) => c !== exclude) : eligible;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function Level2() {
  const navigate = useNavigate();
  const [localSession, setLocalSession] = useState<ReturnType<typeof loadPlay>>(null);
  const [dbSession, setDbSession] = useState<SessionRow | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "wheel-idle" });
  const [animationStep, setAnimationStep] = useState<
    "idle" | "winning-slice" | "category-pill" | "category-info" | "ready"
  >("idle");
  const [hydrated, setHydrated] = useState(false);
  const [lastCat, setLastCat] = useState<L2Category | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [allowTransition, setAllowTransition] = useState(false);
  const [conn, setConn] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [localStep, setLocalStep] = useState<"p1" | "p2" | "compare">("p1");
  const [localP1Choice, setLocalP1Choice] = useState<string | null>(null);
  const [localP2Choice, setLocalP2Choice] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [drawScale, setDrawScale] = useState("translate-y-[150px] scale-[0.75] opacity-0");

  useEffect(() => {
    if (stage.kind === "discuss") {
      setDrawScale("translate-y-[150px] scale-[0.75] opacity-0");
      const t = setTimeout(() => setDrawScale("translate-y-0 scale-100 opacity-100"), 50);
      return () => clearTimeout(t);
    } else {
      setDrawScale("translate-y-[150px] scale-[0.75] opacity-0");
    }
  }, [stage.kind, stage.kind === "discuss" ? stage.questionId : null]);

  useEffect(() => {
    if (stage.kind === "discuss") {
      setIsFlipped(false);
      const t = setTimeout(() => setIsFlipped(true), 300);
      return () => clearTimeout(t);
    } else {
      setIsFlipped(false);
    }
  }, [stage.kind, stage.kind === "discuss" ? stage.questionId : null]);

  const prefersReducedMotion = usePrefersReducedMotion();
  const lastResult = loadLastResult();
  const remoteCode = lastResult?.sessionCode;
  const isRemote = !!remoteCode;

  // Hydrate local session
  useEffect(() => {
    const s = loadPlay();
    setLocalSession(s);
    setHydrated(true);
    if (!s && !isRemote) {
      navigate({ to: "/setup" });
      return;
    }
    if (s && s.level !== 2 && !isRemote) {
      const updated = updatePlay((current) => ({
        ...current,
        level: 2,
        l2P1Done: current.l2P1Done ?? [],
        l2P2Done: current.l2P2Done ?? [],
        l2Turn: current.l2Turn ?? 1,
      }));
      if (updated) setLocalSession(updated);
    }
    if (s && s.l2Stage && !isRemote) {
      setStage(s.l2Stage);
    }
  }, [navigate, isRemote]);

  useEffect(() => {
    if (!hydrated || !localSession || isRemote) return;
    updatePlay((current) => ({
      ...current,
      l2Stage: stage,
    }));
  }, [stage, hydrated, localSession, isRemote]);

  const lastActivityRef = useRef<string | null>(null);

  // Subscribe to Remote Session
  useEffect(() => {
    if (!remoteCode) return;
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const s = await getSessionByCode(remoteCode);
        if (s) {
          setDbSession(s);
          lastActivityRef.current = s.last_activity_at;
          if (s.meta?.l2Stage) {
            setStage(s.meta.l2Stage);
          }
          unsub = subscribeSession(
            s.id,
            (next) => {
              if (
                lastActivityRef.current &&
                next.last_activity_at &&
                next.last_activity_at < lastActivityRef.current
              ) {
                return;
              }
              lastActivityRef.current = next.last_activity_at;
              setDbSession(next);
              if (next.meta?.l2Stage) {
                setStage(next.meta.l2Stage);
              }
            },
            () => {},
            (status) => setConn(status),
          );
        }
      } catch (e) {
        console.error("Failed to load/subscribe remote session in Level 2:", e);
      }
    })();
    return () => unsub?.();
  }, [remoteCode]);

  const session = useMemo(() => {
    if (!isRemote) return localSession;
    if (!dbSession) return null;
    return {
      p1: { name: dbSession.creator_name, gender: dbSession.creator_gender },
      p2: {
        name: dbSession.partner_name ?? "Partner",
        gender: dbSession.partner_gender ?? "Other",
      },
      l2P1Done: dbSession.meta?.l2P1Done ?? [],
      l2P2Done: dbSession.meta?.l2P2Done ?? [],
      l2Turn: dbSession.meta?.l2Turn ?? 1,
      l2Category: dbSession.meta?.l2Category ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }, [isRemote, localSession, dbSession]);

  const p1Done = useMemo(() => new Set(session?.l2P1Done ?? []), [session]);
  const p2Done = useMemo(() => new Set(session?.l2P2Done ?? []), [session]);

  const exploredCategoriesCount = useMemo(() => {
    return L2_CATEGORIES.filter((cat) => {
      const qids = L2_QUESTIONS.filter((q) => q.category === cat).map((q) => q.id);
      return qids.some((id) => p1Done.has(id) || p2Done.has(id));
    }).length;
  }, [p1Done, p2Done]);

  // Per-player category coverage (CR-006 Item 3/4): each player must independently
  // draw from all 6 categories before Level 3 unlocks. This replaces the old
  // combined "somethingCompleted" (1-question) and "10-12 cards" thresholds.
  const p1CategoriesDone = useMemo(() => {
    return new Set(
      L2_CATEGORIES.filter((cat) =>
        L2_QUESTIONS.some((q) => q.category === cat && p1Done.has(q.id)),
      ),
    );
  }, [p1Done]);
  const p2CategoriesDone = useMemo(() => {
    return new Set(
      L2_CATEGORIES.filter((cat) =>
        L2_QUESTIONS.some((q) => q.category === cat && p2Done.has(q.id)),
      ),
    );
  }, [p2Done]);
  const isLevel3Unlocked = p1CategoriesDone.size === 6 && p2CategoriesDone.size === 6;
  const currentTurn: 1 | 2 = session?.l2Turn ?? 1;
  const somethingCompleted = p1Done.size + p2Done.size > 0;
  const mySlot = remoteCode ? getParticipant(remoteCode)?.slot : null;
  const playerDone = currentTurn === 1 ? p1Done : p2Done;
  const currentPlayerName = session ? (currentTurn === 1 ? session.p1.name : session.p2.name) : "";

  // Stage transitions: spotlight → landed → carousel.
  useEffect(() => {
    if (stage.kind === "wheel-spinning") {
      const t = setTimeout(() => {
        if (isRemote && dbSession) {
          if (mySlot === 1) {
            lastActivityRef.current = new Date().toISOString();
            void updateSessionLevelAndMeta(dbSession.id, 2, {
              ...dbSession.meta,
              l2Stage: { kind: "wheel-landed", target: stage.target },
            });
          }
        } else {
          setStage({ kind: "wheel-landed", target: stage.target });
        }
      }, 2400);
      return () => clearTimeout(t);
    }
  }, [stage, isRemote, dbSession, mySlot]);

  // Cascade animation steps
  useEffect(() => {
    if (prefersReducedMotion) {
      if (stage.kind === "wheel-landed") {
        setAnimationStep("ready");
      }
      return;
    }

    if (stage.kind === "wheel-landed") {
      setAnimationStep("winning-slice");
    } else if (stage.kind === "wheel-idle") {
      setAnimationStep("idle");
    }
  }, [stage.kind, prefersReducedMotion]);

  useEffect(() => {
    if (animationStep === "idle" || prefersReducedMotion) return;

    let t: any;
    if (animationStep === "winning-slice") {
      t = setTimeout(() => setAnimationStep("category-pill"), 400);
    } else if (animationStep === "category-pill") {
      t = setTimeout(() => setAnimationStep("category-info"), 400);
    } else if (animationStep === "category-info") {
      // Skip the separate deck-materialize/cards-fan/cards-stack ceremony —
      // the carousel itself now handles card presentation. Go straight to ready.
      t = setTimeout(() => setAnimationStep("ready"), 900);
    }

    return () => clearTimeout(t);
  }, [animationStep, prefersReducedMotion]);

  // Handle transition to carousel once animation is complete
  useEffect(() => {
    if (stage.kind !== "wheel-landed") return;
    if (animationStep !== "ready") return;

    if (!hasEligibleCard(stage.target, playerDone)) {
      // Defensive fallback — spin() already filters to eligible categories,
      // so this should be unreachable in normal play.
      if (isRemote && dbSession) {
        if (mySlot === 1) {
          lastActivityRef.current = new Date().toISOString();
          void updateSessionLevelAndMeta(dbSession.id, 2, {
            ...dbSession.meta,
            l2Stage: { kind: "wheel-idle" },
          });
        }
      } else {
        setStage({ kind: "wheel-idle" });
      }
      return;
    }

    const cards = allCategoryCards(stage.target);
    setLastCat(stage.target);
    if (isRemote && dbSession) {
      if (mySlot === 1) {
        lastActivityRef.current = new Date().toISOString();
        void updateSessionLevelAndMeta(dbSession.id, 2, {
          ...dbSession.meta,
          l2Stage: { kind: "carousel", category: stage.target, cards },
          l2Category: stage.target,
        });
      }
    } else {
      setStage({ kind: "carousel", category: stage.target, cards });
    }
  }, [stage, animationStep, playerDone, isRemote, dbSession, mySlot]);

  if (!hydrated || !session)
    return (
      <PageBackdrop>
        <div className="min-h-dvh" />
      </PageBackdrop>
    );

  function spin() {
    const eligible = L2_CATEGORIES.filter((c) => hasEligibleCard(c, playerDone));
    if (eligible.length === 0) {
      if (isRemote && dbSession) {
        lastActivityRef.current = new Date().toISOString();
        void updateSessionLevelAndMeta(dbSession.id, 2, { ...dbSession.meta, level: 2 });
      }
      setAllowTransition(true);
      setTimeout(() => navigate({ to: "/result" }), 0);
      return;
    }
    const target = pickWeightedCategory(lastCat, eligible);

    if (prefersReducedMotion) {
      const cards = allCategoryCards(target);
      setLastCat(target);
      if (isRemote && dbSession) {
        if (mySlot === 1) {
          lastActivityRef.current = new Date().toISOString();
          void updateSessionLevelAndMeta(dbSession.id, 2, {
            ...dbSession.meta,
            l2Stage: { kind: "carousel", category: target, cards },
            l2Category: target,
          });
        }
      } else {
        setStage({ kind: "carousel", category: target, cards });
      }
      return;
    }

    if (isRemote && dbSession) {
      lastActivityRef.current = new Date().toISOString();
      void updateSessionLevelAndMeta(dbSession.id, 2, {
        ...dbSession.meta,
        l2Stage: { kind: "wheel-spinning", target },
        l2Category: target,
      });
    } else {
      setStage({ kind: "wheel-spinning", target });
    }
  }

  function openCard(q: L2Question) {
    if (stage.kind !== "carousel") return;
    // Independent per-player draws (CR-005 Item 4): this card belongs solely to the
    // current turn's player. No cross-player "waiting for partner to also answer" step.
    setLocalStep("p1");
    setLocalP1Choice(null);
    setLocalP2Choice(null);
    if (isRemote && dbSession) {
      lastActivityRef.current = new Date().toISOString();
      void updateSessionLevelAndMeta(dbSession.id, 2, {
        ...dbSession.meta,
        l2P1Choice: null,
        l2P2Choice: null,
        l2Step: "p1",
        l2Stage: {
          kind: "discuss",
          category: stage.category,
          questionId: q.id,
          startedAt: Date.now(),
        },
      });
    } else {
      setStage({ kind: "discuss", category: stage.category, questionId: q.id, startedAt: Date.now() });
    }
  }

  // Tapping an answer choice records it briefly for visual feedback, then
  // immediately ends the turn — this is the fix for "swipe-right was the only
  // way to end the turn" (CR-006 Item 7). Swipe-right remains available as an
  // optional alternate gesture (via SwipeCard's own 10s freeze), but is no
  // longer required.
  function makeChoice(choice: string) {
    if (stage.kind !== "discuss") return;
    if (isRemote && dbSession) {
      lastActivityRef.current = new Date().toISOString();
      void updateSessionLevelAndMeta(dbSession.id, 2, {
        ...dbSession.meta,
        l2P1Choice: choice,
        l2Step: "compare",
      });
    } else {
      setLocalP1Choice(choice);
      setLocalStep("compare");
    }
    setTimeout(() => finishCard("complete"), 550);
  }

  function finishCard(_action: "skip" | "complete") {
    void _action;
    if (stage.kind !== "discuss") return;
    const qid = stage.questionId;

    if (isRemote && dbSession) {
      const key = currentTurn === 1 ? "l2P1Done" : "l2P2Done";
      const prev = (dbSession.meta?.[key] ?? []) as string[];
      const next = prev.includes(qid) ? prev : [...prev, qid];
      const nextTurn: 1 | 2 = currentTurn === 1 ? 2 : 1;
      const nextStartStep = nextTurn === 1 ? "p2" : "p1";

      lastActivityRef.current = new Date().toISOString();
      void updateSessionLevelAndMeta(dbSession.id, 2, {
        ...dbSession.meta,
        level: 2,
        [key]: next,
        l2Turn: nextTurn,
        l2P1Choice: null,
        l2P2Choice: null,
        l2Step: nextStartStep,
        l2Stage: { kind: "wheel-idle" },
      });
    } else {
      const nextTurn: 1 | 2 = currentTurn === 1 ? 2 : 1;
      const nextStartStep = nextTurn === 1 ? "p2" : "p1";
      const updated = updatePlay((s) => {
        const key = currentTurn === 1 ? "l2P1Done" : "l2P2Done";
        const prev = (s[key] ?? []) as string[];
        const next = prev.includes(qid) ? prev : [...prev, qid];
        return { ...s, level: 2, [key]: next, l2Turn: nextTurn };
      });
      if (updated) setLocalSession(updated);
      setLocalP1Choice(null);
      setLocalP2Choice(null);
      setLocalStep(nextStartStep);
      setStage({ kind: "wheel-idle" });
    }
  }

  const currentQ: L2Question | null =
    stage.kind === "discuss" ? (L2_QUESTIONS.find((q) => q.id === stage.questionId) ?? null) : null;

  const activeCategory = stage.kind === "discuss" || stage.kind === "carousel"
    ? stage.category
    : (stage.kind === "wheel-landed" ? stage.target : null);

  const currentTheme = activeCategory ? CATEGORY_THEME_MAP[activeCategory] : null;

  return (
    <div className={`w-full min-h-screen transition-all duration-700 bg-gradient-to-br ${currentTheme?.bgGradient || "from-[#FAF8FF] via-[#F3EDFF] to-[#FAF8FF]"}`}>
      <header className="px-6 pt-6 flex items-center justify-between max-w-3xl mx-auto w-full">
        <button
          onClick={() => setExitOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal/70 hover:text-charcoal bg-transparent border-none cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" /> Exit
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-widest">
            <span className={currentTurn === 1 ? "text-charcoal font-bold" : "text-charcoal/40"}>
              {session.p1.name}
            </span>
            <Heart className="h-3.5 w-3.5 text-pink-500 fill-current shrink-0" />
            <span className={currentTurn === 2 ? "text-charcoal font-bold" : "text-charcoal/40"}>
              {session.p2.name}
            </span>
          </div>
          <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wider mt-1 block">
            {currentPlayerName}'s Turn
          </span>
        </div>

        <button
          onClick={() => {
            if (stage.kind === "carousel") {
              setStage({ kind: "wheel-idle" });
            } else if (stage.kind === "discuss") {
              finishCard("skip");
            }
          }}
          className="text-xs font-semibold text-charcoal/70 hover:text-charcoal bg-transparent border-none cursor-pointer"
        >
          Skip
        </button>
      </header>

      <section className="px-5 mt-5 max-w-3xl mx-auto">
        {/* Category Pill under active player turn */}
        {((stage.kind === "wheel-landed" && animationStep !== "winning-slice") || stage.kind === "carousel" || stage.kind === "discuss") && (
          <div className="flex items-center justify-center mt-2 animate-fade-in">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold text-charcoal shadow-sm border border-neutral-100"
              style={{
                background: CATEGORY_VISUALS[stage.kind === "discuss" ? stage.category : (stage as any).target || (stage as any).category]?.lightBg || "white"
              }}
            >
              <span className="text-sm select-none">
                {CATEGORY_VISUALS[stage.kind === "discuss" ? stage.category : (stage as any).target || (stage as any).category]?.emoji}
              </span>
              <span>
                {CATEGORY_VISUALS[stage.kind === "discuss" ? stage.category : (stage as any).target || (stage as any).category]?.name}
              </span>
            </span>
          </div>
        )}

        {(stage.kind === "wheel-idle" || stage.kind === "wheel-spinning" || stage.kind === "wheel-landed") ? (
          <SpotlightWheel
            stage={stage}
            onSpin={spin}
            p1CategoriesDone={p1CategoriesDone.size}
            p2CategoriesDone={p2CategoriesDone.size}
            p1Name={session.p1.name}
            p2Name={session.p2.name}
            isLevel3Unlocked={isLevel3Unlocked}
            onViewResults={() => {
              setAllowTransition(true);
              setTimeout(() => navigate({ to: "/result" }), 0);
            }}
          />
        ) : null}

        {stage.kind === "carousel" ? (
          <div className="mt-4 flex flex-col items-center">
            <Level2DeckViewer
              items={stage.cards}
              category={stage.category}
              onPick={openCard}
              prefersReducedMotion={prefersReducedMotion}
              drawnIds={playerDone}
            />

            <div className="mt-4 text-center">
              <button
                onClick={() => setStage({ kind: "wheel-idle" })}
                className="text-[11px] font-semibold text-charcoal/50 hover:text-charcoal transition"
              >
                🔄 Spin another category
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* Category Info Card Overlay — themed gradient card, matching deck style (CR-006 Item 1) */}
      {stage.kind === "wheel-landed" && animationStep === "category-info" && (
        <Overlay>
          <div
            className={`w-full max-w-sm animate-rise text-center rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 bg-gradient-to-br ${getDeckGradient(stage.target)} text-white`}
            style={{ boxShadow: `0 20px 50px -10px ${CATEGORY_VISUALS[stage.target].themeColor}55` }}
          >
            <div className="rounded-2xl p-4 flex items-center justify-center bg-white/15">
              {CATEGORY_VISUALS[stage.target].renderIllustration()}
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              {CATEGORY_VISUALS[stage.target].name}
            </h2>
            <p className="text-sm text-white/85 leading-relaxed">
              {CATEGORY_VISUALS[stage.target].desc}
            </p>
          </div>
        </Overlay>
      )}

      {/* Deck presentation now happens directly in the carousel stage (see Level2DeckViewer below) —
          the separate deck-materialize/fan/stack pre-animation was removed per CR-005/CR-006
          to fix the reversed-feeling ceremony and speed up time-to-interaction. */}

      {/* Discuss overlay — full-screen card (CR-003 Overhaul) */}
      {stage.kind === "discuss" && currentQ && (() => {
        // Independent per-player draws (CR-005 Item 4): this card belongs to
        // currentTurn's player alone. No cross-player waiting/compare step.
        const myChoice = isRemote && dbSession ? (dbSession.meta?.l2P1Choice ?? null) : localP1Choice;
        const hasChosen = myChoice !== null;

        return (
          <Overlay>
            <div className={`w-full max-w-[260px] mx-auto transition-all duration-500 transform ${drawScale}`}>
              <SwipeCard
                accentColor={currentTheme?.accentColor || "#FF6B6B"}
                duration={GAME_CONFIG.L2_TIMER_SECONDS}
                startedAt={stage.startedAt}
                transparentBg={true}
                onSkip={() => finishCard("skip")}
                onComplete={() => finishCard("complete")}
                label={hasChosen ? "Nice — moving on..." : `${currentPlayerName}'s Turn`}
              >
                {/* Outer perspective shell with fixed size for clean centered flip */}
                <div className="relative w-[240px] h-[330px] mx-auto" style={{ perspective: "1000px" }}>
                  {/* 3D animated card wrapper */}
                  <div
                    className="w-full h-full relative"
                    style={{
                       transformStyle: "preserve-3d",
                       transition: "transform 800ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                       transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    }}
                  >
                  {/* 1. CARD BACK (Branded Category Back) */}
                  <div
                    className={`absolute inset-0 rounded-3xl p-6 bg-gradient-to-br ${getDeckGradient(stage.category)} shadow-card-lift flex flex-col items-center justify-between text-center select-none text-white`}
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(0deg)",
                      zIndex: 2,
                    }}
                  >
                    <div className="w-full flex justify-between items-center opacity-40 text-white text-[8px] uppercase tracking-widest">
                      <span>LEVEL 2</span>
                      <span>DISCOVERY</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center py-2">
                      {CATEGORY_VISUALS[stage.category].renderIllustration("h-36 w-36")}
                    </div>
                    <span className="font-display text-xs font-bold text-white mb-2">
                      {CATEGORY_VISUALS[stage.category].name}
                    </span>
                    <div className="w-full flex justify-center opacity-30 text-white">
                      <Heart className="h-3.5 w-3.5" fill="currentColor" />
                    </div>
                  </div>

                  {/* 2. CARD FRONT (Active Question Content) */}
                  <div
                    className="absolute inset-0 rounded-3xl p-6 flex flex-col justify-between shadow-2xl transition-all duration-300"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      zIndex: 1,
                      backgroundColor: CATEGORY_VISUALS[stage.category].lightBg,
                      border: `2px solid ${CATEGORY_VISUALS[stage.category].themeColor}44`,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-2xl leading-none">{CATEGORY_VISUALS[stage.category].emoji}</span>
                      <span
                        className="text-[10px] uppercase tracking-[0.22em] font-semibold"
                        style={{ color: CATEGORY_VISUALS[stage.category].themeColor }}
                      >
                        {currentPlayerName}'s Turn
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-center min-h-0">
                      <h2 className="font-display text-lg sm:text-xl font-semibold text-charcoal text-center leading-snug">
                        {currentQ.title}
                      </h2>

                      <div className="mt-4 flex flex-col gap-2 w-full max-h-[180px] overflow-y-auto pr-1">
                        {currentQ.options.map((opt) => {
                          const isChosen = myChoice === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => !hasChosen && makeChoice(opt)}
                              disabled={hasChosen}
                              className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-sm transition duration-200 focus-visible:ring-2 focus-visible:ring-purple-500 ${
                                isChosen
                                  ? "bg-green-50 border-green-500 text-green-700"
                                  : hasChosen
                                    ? "bg-white/40 text-charcoal/40 cursor-default"
                                    : "bg-white/70 hover:bg-white text-charcoal hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                              }`}
                              style={!hasChosen ? { borderColor: CATEGORY_VISUALS[stage.category].themeColor + "33" } : undefined}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Centered Heart Icon Footer for brand consistency */}
                    <div className="w-full flex justify-center text-neutral-200 mt-2 shrink-0">
                      <Heart className="h-4 w-4" fill="currentColor" />
                    </div>
                  </div>
                </div>
              </div>
            </SwipeCard>
          </div>
        </Overlay>
        );
      })()}

      {/* DevPanel controls */}

      <DevPanel
        context="level-2"
        onAutoAnswer={() => {
          if (stage.kind === "wheel-idle") spin();
          else if (stage.kind === "carousel" && stage.cards.length > 0) openCard(stage.cards[0]);
          else if (stage.kind === "discuss") finishCard("complete");
        }}
        onComplete={() => {
          setAllowTransition(true);
          setTimeout(() => navigate({ to: "/level-3" }), 0);
        }}
        onForceCategory={() => spin()}
        onJump={(to) => {
          setAllowTransition(true);
          setTimeout(() => navigate({ to: to as never }), 0);
        }}
      />
      <ExitConfirmationPopup
        isRemote={isRemote}
        dbSessionId={dbSession?.id}
        isOpen={exitOpen}
        setIsOpen={setExitOpen}
        shouldBlock={!allowTransition}
      />
    </div>
  );
}

function darken(hex: string): string {
  // Simple darken: interpret hex, reduce by ~30%.
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 60);
  const g = Math.max(0, ((n >> 8) & 0xff) - 60);
  const b = Math.max(0, (n & 0xff) - 60);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/* ---------------- Spotlight Wheel ---------------- */

function SpotlightWheel({
  stage,
  onSpin,
  p1CategoriesDone = 0,
  p2CategoriesDone = 0,
  p1Name = "Player 1",
  p2Name = "Player 2",
  isLevel3Unlocked = false,
  onViewResults,
}: {
  stage: Extract<Stage, { kind: "wheel-idle" | "wheel-spinning" | "wheel-landed" }>;
  onSpin: () => void;
  p1CategoriesDone?: number;
  p2CategoriesDone?: number;
  p1Name?: string;
  p2Name?: string;
  isLevel3Unlocked?: boolean;
  onViewResults: () => void;
}) {
  const spinning = stage.kind === "wheel-spinning";
  const landed = stage.kind === "wheel-landed";
  const target = spinning || landed ? stage.target : null;

  return (
    <div className="mt-6 flex flex-col items-center gap-3 animate-rise">
      <Wheel
        spinning={spinning}
        landed={landed}
        target={target}
        onTap={!spinning && !landed ? onSpin : undefined}
      />
      {landed && target ? (
        <p className="mt-4 font-display text-xl text-charcoal animate-rise">
          {L2_META[target].emoji} {target}
        </p>
      ) : null}
      {!spinning && !landed ? (
        <div className="flex flex-col items-center gap-3 mt-4">
          <span className="text-[11px] font-semibold text-neutral-500 bg-[#F1EEF9] px-3 py-1 rounded-full animate-fade-in">
            {p1Name}: {p1CategoriesDone}/6 categories · {p2Name}: {p2CategoriesDone}/6 categories
          </span>

          <div className="flex flex-col items-center gap-2.5 mt-1.5">
            <button
              onClick={onSpin}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-romance px-7 py-3.5 text-sm font-semibold text-white shadow-glow-purple hover:scale-[1.02] transition"
            >
              Spin
            </button>

            {isLevel3Unlocked ? (
              <button
                onClick={onViewResults}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-purple-300 bg-white px-5 py-2.5 text-xs font-semibold text-purple-700 shadow-sm hover:bg-purple-50 active:scale-95 transition animate-fade-in"
              >
                ✨ View Alignment &amp; Results <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Wheel({
  spinning,
  landed,
  target,
  onTap,
}: {
  spinning: boolean;
  landed: boolean;
  target: L2Category | null;
  onTap?: () => void;
}) {
  const SIZE = 280;
  const R = 130;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const N = L2_CATEGORIES.length;
  const SLICE = 360 / N;

  const [spotIdx, setSpotIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!spinning) {
      setSpotIdx(landed && target ? L2_CATEGORIES.indexOf(target) : null);
      return;
    }
    let cancelled = false;
    const targetIdx = target ? L2_CATEGORIES.indexOf(target) : 0;
    // Build a schedule: ~2400ms total, decelerating
    const schedule: number[] = [];
    let acc = 0;
    while (acc < 1400) {
      schedule.push(70);
      acc += 70;
    }
    while (acc < 2000) {
      schedule.push(140);
      acc += 140;
    }
    while (acc < 2400) {
      schedule.push(220);
      acc += 220;
    }
    let i = 0;
    let cur = Math.floor(Math.random() * N);
    setSpotIdx(cur);
    function step() {
      if (cancelled) return;
      const remaining = schedule.length - i;
      cur = remaining <= 3 ? (targetIdx - remaining + 1 + N * 3) % N : (cur + 1) % N;
      setSpotIdx(cur);
      const wait = schedule[i] ?? 200;
      i++;
      if (i < schedule.length) setTimeout(step, wait);
      else setSpotIdx(targetIdx);
    }
    setTimeout(step, 60);
    return () => {
      cancelled = true;
    };
  }, [spinning, landed, target, N]);

  function arcPath(idx: number) {
    const s = (idx * SLICE - 90) * (Math.PI / 180);
    const e = ((idx + 1) * SLICE - 90) * (Math.PI / 180);
    const x1 = CX + R * Math.cos(s),
      y1 = CY + R * Math.sin(s);
    const x2 = CX + R * Math.cos(e),
      y2 = CY + R * Math.sin(e);
    return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
  }
  function labelPos(idx: number) {
    const a = (idx * SLICE + SLICE / 2 - 90) * (Math.PI / 180);
    const rr = R * 0.62;
    return { x: CX + rr * Math.cos(a), y: CY + rr * Math.sin(a) };
  }

  return (
    <div
      className="relative"
      style={{ width: SIZE, height: SIZE, cursor: onTap ? "pointer" : "default" }}
      onClick={onTap}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Category wheel"
      >
        <defs>
          <radialGradient id="wheel-bg-v2" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r={R + 14} fill="url(#wheel-bg-v2)" />
        {L2_CATEGORIES.map((cat, idx) => {
          const meta = L2_META[cat];
          const isSpot = spotIdx === idx;
          return (
            <path
              key={cat}
              d={arcPath(idx)}
              fill={meta.color}
              stroke="white"
              strokeWidth={3}
              opacity={spinning || landed ? (isSpot ? 1.0 : 0.85) : 0.95}
              style={{
                filter: isSpot
                  ? "brightness(1.3) contrast(1.15) drop-shadow(0 0 14px rgba(255,255,255,0.95))"
                  : "none",
                transition: "opacity 90ms ease-out, filter 90ms ease-out",
              }}
            />
          );
        })}
        <circle cx={CX} cy={CY} r={26} fill="white" stroke="rgba(0,0,0,0.06)" />
      </svg>
      {L2_CATEGORIES.map((cat, idx) => {
        const lp = labelPos(idx);
        return (
          <div
            key={cat}
            className="absolute text-2xl leading-none pointer-events-none"
            style={{ left: lp.x - 14, top: lp.y - 14, width: 28, height: 28, textAlign: "center" }}
          >
            {L2_META[cat].emoji}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Overlay ---------------- */

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-charcoal/75 backdrop-blur-md p-5"
    >
      <div className="w-full grid place-items-center">{children}</div>
    </div>
  );
}

interface Level2DeckViewerProps {
  items: L2Question[];
  category: L2Category;
  onPick: (q: L2Question) => void;
  prefersReducedMotion?: boolean;
  /** IDs the current player has already drawn — rendered greyed out & disabled,
   * but still visible and still browsable, per user request. A card stays
   * selectable by the *other* player independently (each player's drawn set
   * is tracked separately — see p1Done/p2Done in the parent component). */
  drawnIds?: Set<string>;
}

/**
 * Browsable card carousel (CR-006 Item 6) — replaces the old auto fan-then-stack
 * animation, which felt "reversed" and added ~3s of unskippable ceremony before
 * a player could even see how many cards remained. Center card is active/large;
 * adjacent cards peek from both sides. Players browse via drag, arrow buttons,
 * or tapping a dot/side-card, then commit with the explicit "Reveal this card"
 * button (or by tapping the centered card itself) — there is no ambiguous
 * swipe-to-draw gesture, matching the reference interaction.
 */
export function Level2DeckViewer({
  items,
  category,
  onPick,
  prefersReducedMotion = false,
  drawnIds,
}: Level2DeckViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const dragRef = useRef<{ x: number } | null>(null);
  const drawingRef = useRef(false);
  const N = items.length;

  useEffect(() => {
    // Reset to the first card whenever a fresh set of cards arrives
    // (e.g. after spinning into a new category).
    setActiveIndex(0);
  }, [items]);

  function clampIndex(i: number) {
    return Math.max(0, Math.min(N - 1, i));
  }

  function onDown(e: React.PointerEvent) {
    dragRef.current = { x: e.clientX };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    setDragOffset(e.clientX - dragRef.current.x);
  }
  function onUp() {
    if (!dragRef.current) return;
    const THRESH = 55;
    if (dragOffset <= -THRESH) setActiveIndex((i) => clampIndex(i + 1));
    else if (dragOffset >= THRESH) setActiveIndex((i) => clampIndex(i - 1));
    dragRef.current = null;
    setDragOffset(0);
  }

  function reveal(idx: number) {
    if (drawingRef.current) return;
    if (drawnIds?.has(items[idx].id)) return; // already drawn by this player — not selectable
    drawingRef.current = true;
    onPick(items[idx]);
    setTimeout(() => {
      drawingRef.current = false;
    }, 1000);
  }

  if (N === 0) return null;

  const activeIsDrawn = !!drawnIds?.has(items[activeIndex]?.id);

  return (
    <div className="relative w-full flex flex-col items-center">
      <p className="text-[11px] text-charcoal/50 font-medium mb-1">
        Browse with the sides · question hidden until you pick
      </p>

      <div
        className="relative touch-pan-y flex items-center justify-center select-none animate-rise"
        style={{ width: "min(96vw, 420px)", height: 320, perspective: 1000 }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {items.map((item, i) => {
          const delta = i - activeIndex;
          if (Math.abs(delta) > 2) return null; // only render nearby cards

          const isDrawn = !!drawnIds?.has(item.id);
          const dragNudge = delta === 0 ? dragOffset : 0;
          const offsetX = delta * 92 + dragNudge;
          const scale = 1 - Math.min(0.3, Math.abs(delta) * 0.14);
          const rot = delta * -12;
          const baseOpacity = Math.abs(delta) > 2 ? 0 : 1 - Math.abs(delta) * 0.32;
          const opacity = isDrawn ? baseOpacity * 0.55 : baseOpacity;
          const isCenter = delta === 0;

          const cardStyle: React.CSSProperties = {
            width: "min(62vw, 200px)",
            height: 280,
            transition:
              prefersReducedMotion || dragRef.current
                ? "none"
                : "all 400ms cubic-bezier(0.25, 1, 0.5, 1)",
            transformStyle: "preserve-3d",
            zIndex: 10 - Math.abs(delta),
            transform: `translateX(-50%) translateX(${offsetX}px) rotateY(${rot}deg) scale(${scale})`,
            opacity,
            filter: isDrawn ? "grayscale(0.7)" : "none",
            left: "50%",
            top: "0px",
            position: "absolute",
          };

          return (
            <button
              key={item.id}
              onClick={() => (isCenter ? reveal(i) : setActiveIndex(i))}
              className={`rounded-3xl border border-amber-500/20 shadow-card-lift transition ${isDrawn ? "cursor-not-allowed" : "active:scale-[0.98]"}`}
              style={cardStyle}
              aria-disabled={isDrawn}
            >
              <div
                className={`h-full w-full rounded-3xl p-5 bg-gradient-to-br ${getDeckGradient(category)} flex flex-col items-center justify-between text-white`}
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  boxShadow: `0 8px 24px -6px ${CATEGORY_VISUALS[category].themeColor}44`,
                }}
              >
                <div className="w-full flex justify-between items-center opacity-70 text-white text-[9px] font-bold uppercase tracking-widest">
                  <span>#{i + 1}</span>
                  <span className="opacity-70">{isDrawn ? "Already answered" : "Hidden until picked"}</span>
                </div>

                <div className="flex-1 flex items-center justify-center py-2">
                  {CATEGORY_VISUALS[category].renderIllustration("h-24 w-24")}
                </div>

                {isDrawn ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-black/25 rounded-full px-3 py-1">
                    ✓ Done
                  </span>
                ) : isCenter ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 rounded-full px-3 py-1">
                    Tap to reveal
                  </span>
                ) : (
                  <div className="w-full flex justify-center opacity-30 text-white">
                    <Heart className="h-3 w-3" fill="currentColor" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Prev/Next arrows for non-touch browsing */}
      <div className="flex items-center gap-4 mt-2">
        <button
          onClick={() => setActiveIndex((i) => clampIndex(i - 1))}
          disabled={activeIndex === 0}
          className="h-8 w-8 rounded-full flex items-center justify-center border border-neutral-200 bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-50 transition"
          aria-label="Previous card"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Dot pagination — dimmed for already-drawn cards */}
        <div className="flex items-center gap-1.5">
          {items.map((item, idx) => {
            const dotDrawn = !!drawnIds?.has(item.id);
            return (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                aria-label={`Go to card ${idx + 1}${dotDrawn ? " (already answered)" : ""}`}
                className={`rounded-full transition-all duration-300 ${
                  idx === activeIndex
                    ? "h-2 w-5 bg-purple-600"
                    : dotDrawn
                      ? "h-2 w-2 bg-neutral-150 opacity-40"
                      : "h-2 w-2 bg-neutral-200 hover:bg-neutral-300"
                }`}
              />
            );
          })}
        </div>

        <button
          onClick={() => setActiveIndex((i) => clampIndex(i + 1))}
          disabled={activeIndex === N - 1}
          className="h-8 w-8 rounded-full flex items-center justify-center border border-neutral-200 bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-50 transition"
          aria-label="Next card"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <button
        onClick={() => reveal(activeIndex)}
        disabled={activeIsDrawn}
        className={`mt-5 px-6 py-3 rounded-full font-bold text-xs shadow-md transition duration-200 ${
          activeIsDrawn
            ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
            : "bg-gradient-to-r from-purple-650 to-pink-500 text-white hover:scale-[1.01] active:scale-[0.99]"
        }`}
      >
        {activeIsDrawn ? "Already answered" : "Reveal this card"}
      </button>
    </div>
  );
}