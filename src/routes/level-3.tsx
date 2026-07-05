import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { ArrowRight, ChevronLeft, Flame, Heart, Layers, Sparkles, Upload } from "lucide-react";
import { Logo, PageBackdrop } from "@/components/Brand";
import { ExitConfirmationPopup } from "@/components/ExitConfirmationPopup";
import { SwipeCard } from "@/components/SwipeCard";
import { CircularArc } from "@/components/CircularArc";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { GAME_CONFIG } from "@/config/gameConfig";
import { loadPlay, updatePlay } from "@/lib/playSession";
import { L3_QUESTIONS, buildL3Deck } from "@/lib/level3.seed";
import { parseUploadedQuestions } from "@/lib/level3.upload";
import type { L3ConsentSide, L3Question, L3Tier } from "@/lib/types";
import {
  getSessionByCode,
  subscribeSession,
  updateSessionLevelAndMeta,
  type SessionRow,
} from "@/lib/session";
import { loadLastResult, getParticipant } from "@/lib/storage";

export const Route = createFileRoute("/level-3")({
  head: () => ({ meta: [{ title: "Level 3 — Deeper Connection" }] }),
  component: Level3,
});

const DECK_SIZE = 10;
const L3_ACCENT = "#A33B47";
const L3_DEEP = "#6d1f29";

type Source = "ai" | "upload" | "hybrid";

type Stage =
  | { kind: "consent" }
  | { kind: "consent-rejected" }
  | { kind: "source" }
  | { kind: "p2-source" }
  | { kind: "uploading" }
  | { kind: "wait-upload" }
  | { kind: "deck-summary"; deck: L3Question[] }
  | { kind: "carousel"; deck: L3Question[] }
  | { kind: "reveal"; deck: L3Question[]; q: L3Question }
  | { kind: "done" };

function Level3() {
  const navigate = useNavigate();
  const [localSession, setLocalSession] = useState<ReturnType<typeof loadPlay>>(null);
  const [dbSession, setDbSession] = useState<SessionRow | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "consent" });
  const [hydrated, setHydrated] = useState(false);
  const [uploaded, setUploaded] = useState<L3Question[]>([]);
  const [localP1Uploads, setLocalP1Uploads] = useState<L3Question[]>([]);
  const [localP1Mode, setLocalP1Mode] = useState<Source>("ai");
  const [conn, setConn] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [exitOpen, setExitOpen] = useState(false);
  const [allowTransition, setAllowTransition] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    if (stage.kind === "carousel") {
      setIsShuffling(true);
      const t = setTimeout(() => setIsShuffling(false), 1500);
      return () => clearTimeout(t);
    }
  }, [stage.kind]);

  const prefersReducedMotion = usePrefersReducedMotion();
  const lastResult = loadLastResult();
  const remoteCode = lastResult?.sessionCode;
  const isRemote = !!remoteCode;
  const mySlot = remoteCode ? getParticipant(remoteCode)?.slot : null;

  // Hydrate local session
  useEffect(() => {
    const s = loadPlay();
    setLocalSession(s);
    setHydrated(true);
    if (!s && !isRemote) {
      navigate({ to: "/" });
      return;
    }
    if (s && !isRemote && s.l3Stage) {
      setStage(s.l3Stage);
    } else if (s && !isRemote && s.l3DeckIds && s.l3DeckIds.length) {
      const map = new Map(L3_QUESTIONS.map((q) => [q.id, q]));
      const deck = s.l3DeckIds.map((id) => map.get(id)).filter((q): q is L3Question => Boolean(q));
      if (deck.length && s.l3Consent?.approved) {
        setStage({ kind: "carousel", deck });
      }
    }
  }, [navigate, isRemote]);

  useEffect(() => {
    if (!hydrated || !localSession || isRemote) return;
    updatePlay((current) => ({
      ...current,
      l3Stage: stage,
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
          if (s.meta?.l3Stage) {
            setStage(s.meta.l3Stage);
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
              if (next.meta?.l3Stage) {
                setStage(next.meta.l3Stage);
              }
            },
            () => {},
            (status) => setConn(status),
          );
        }
      } catch (e) {
        console.error("Failed to load/subscribe remote session in Level 3:", e);
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
      l3P1Done: dbSession.meta?.l3P1Done ?? [],
      l3P2Done: dbSession.meta?.l3P2Done ?? [],
      l3Turn: dbSession.meta?.l3Turn ?? 1,
      l3Consent: dbSession.meta?.l3Consent,
      l3DeckIds: dbSession.meta?.l3DeckIds ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }, [isRemote, localSession, dbSession]);

  const p1Done = useMemo(() => new Set(session?.l3P1Done ?? []), [session]);
  const p2Done = useMemo(() => new Set(session?.l3P2Done ?? []), [session]);
  const bothDone = useMemo(() => {
    const s = new Set<string>();
    p1Done.forEach((id) => {
      if (p2Done.has(id)) s.add(id);
    });
    return s;
  }, [p1Done, p2Done]);
  const currentTurn: 1 | 2 = session?.l3Turn ?? 1;

  if (!hydrated || !session)
    return (
      <PageBackdrop>
        <div className="min-h-dvh" />
      </PageBackdrop>
    );

  const playerDone = currentTurn === 1 ? p1Done : p2Done;
  const currentPlayerName = currentTurn === 1 ? session.p1.name : session.p2.name;
  const isCreator = mySlot === 1;
  const iAmReady =
    isRemote && dbSession
      ? isCreator
        ? !!dbSession.meta?.l3P1Ready
        : !!dbSession.meta?.l3P2Ready
      : false;

  /* ---------- Consent ---------- */
  function acceptConsent() {
    const side: L3ConsentSide = { entered: true, q1: true, q2: true, q3: true };
    const consent = { p1: side, p2: side, approved: true };

    if (isRemote && dbSession) {
      lastActivityRef.current = new Date().toISOString();
      void updateSessionLevelAndMeta(dbSession.id, 3, {
        ...dbSession.meta,
        level: 3,
        l3Consent: consent,
        l3Turn: dbSession.meta?.l3Turn ?? 1,
        l3Stage: { kind: "source" },
      });
    } else {
      const updated = updatePlay((s) => ({
        ...s,
        level: 3,
        l3Consent: consent,
        l3Turn: s.l3Turn ?? 1,
      }));
      if (updated) setLocalSession(updated);
      setStage({ kind: "source" });
    }
  }

  function rejectConsent() {
    if (isRemote && dbSession) {
      lastActivityRef.current = new Date().toISOString();
      void updateSessionLevelAndMeta(dbSession.id, 3, {
        ...dbSession.meta,
        l3Stage: { kind: "consent-rejected" },
      });
    } else {
      setStage({ kind: "consent-rejected" });
    }
  }

  /* ---------- Source ---------- */
  function chooseSource(src: Source, extras: L3Question[] = []) {
    if (isRemote && dbSession) {
      const isP1 = mySlot === 1;
      const keyUploads = isP1 ? "l3P1Uploads" : "l3P2Uploads";
      const keyReady = isP1 ? "l3P1Ready" : "l3P2Ready";
      const keyMode = isP1 ? "l3P1Mode" : "l3P2Mode";

      const nextMeta = {
        ...dbSession.meta,
        [keyUploads]: extras,
        [keyReady]: true,
        [keyMode]: src,
      };

      const partnerReady = isP1 ? !!nextMeta.l3P2Ready : !!nextMeta.l3P1Ready;

      lastActivityRef.current = new Date().toISOString();

      if (partnerReady) {
        // Both players are ready -> build the deck!
        const p1Ups = nextMeta.l3P1Uploads ?? [];
        const p2Ups = nextMeta.l3P2Uploads ?? [];
        const deckMode = nextMeta.l3P1Mode === "upload" || nextMeta.l3P2Mode === "upload"
          ? "upload"
          : (nextMeta.l3P1Mode === "hybrid" || nextMeta.l3P2Mode === "hybrid" ? "hybrid" : "ai");
        const deck = buildL3Deck(p1Ups, p2Ups, deckMode);

        void updateSessionLevelAndMeta(dbSession.id, 3, {
          ...nextMeta,
          level: 3,
          l3DeckIds: deck.map((d) => d.id),
          l3P1Done: [],
          l3P2Done: [],
          l3Turn: 1,
          l3Stage: { kind: "carousel", deck },
        });
      } else {
        // Wait for the partner
        void updateSessionLevelAndMeta(dbSession.id, 3, {
          ...nextMeta,
          l3Stage: { kind: "wait-upload" },
        });
      }
    } else {
      if (stage.kind === "source") {
        setLocalP1Uploads(extras);
        setLocalP1Mode(src);
        setStage({ kind: "p2-source" });
      } else if (stage.kind === "p2-source") {
        const deckMode = localP1Mode === "upload" || src === "upload"
          ? "upload"
          : (localP1Mode === "hybrid" || src === "hybrid" ? "hybrid" : "ai");
        const deck = buildL3Deck(localP1Uploads, extras, deckMode);
        const updated = updatePlay((s) => ({
          ...s,
          level: 3,
          l3DeckIds: deck.map((d) => d.id),
          l3P1Done: [],
          l3P2Done: [],
          l3Turn: 1,
        }));
        if (updated) setLocalSession(updated);
        setStage({ kind: "carousel", deck });
      }
    }
  }

  async function onUpload(file: File, mode: Source = "upload") {
    const originalKind = stage.kind;
    setStage({ kind: "uploading" });
    try {
      const qs = await parseUploadedQuestions(file);
      setUploaded(qs);
      if (qs.length === 0) {
        chooseSource("ai", []);
        return;
      }
      chooseSource(mode, qs);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to read file.");
      setStage({ kind: originalKind });
    }
  }

  /* ---------- Carousel ---------- */
  function drawCard(q: L3Question) {
    if (stage.kind !== "carousel") return;
    if (isRemote && dbSession) {
      lastActivityRef.current = new Date().toISOString();
      void updateSessionLevelAndMeta(dbSession.id, 3, {
        ...dbSession.meta,
        l3Stage: { kind: "reveal", deck: stage.deck, q },
      });
    } else {
      setStage({ kind: "reveal", deck: stage.deck, q });
    }
  }

  function finishCard(action: "skip" | "complete") {
    if (stage.kind !== "reveal") return;
    const qid = stage.q.id;

    if (isRemote && dbSession) {
      lastActivityRef.current = new Date().toISOString();

      if (action === "skip") {
        // Skips are immediate and apply to both players
        const p1DoneLocal = dbSession.meta?.l3P1Done ?? [];
        const p2DoneLocal = dbSession.meta?.l3P2Done ?? [];
        const nextP1 = p1DoneLocal.includes(qid) ? p1DoneLocal : [...p1DoneLocal, qid];
        const nextP2 = p2DoneLocal.includes(qid) ? p2DoneLocal : [...p2DoneLocal, qid];
        const nextTurn: 1 | 2 = currentTurn === 1 ? 2 : 1;

        const nextMeta = {
          ...dbSession.meta,
          l3P1Done: nextP1,
          l3P2Done: nextP2,
          l3Turn: nextTurn,
        };

        const p1 = new Set(nextP1);
        const p2 = new Set(nextP2);
        const allBothDone = stage.deck.every((c) => p1.has(c.id) && p2.has(c.id));

        void updateSessionLevelAndMeta(dbSession.id, 3, {
          ...nextMeta,
          l3Stage: allBothDone ? { kind: "done" } : { kind: "carousel", deck: stage.deck },
        });
      } else {
        // complete: only mark for current local player slot
        const key = mySlot === 1 ? "l3P1Done" : "l3P2Done";
        const prev = (dbSession.meta?.[key] ?? []) as string[];
        const next = prev.includes(qid) ? prev : [...prev, qid];

        const nextMeta = {
          ...dbSession.meta,
          [key]: next,
        };

        const p1DoneLocal = nextMeta.l3P1Done ?? [];
        const p2DoneLocal = nextMeta.l3P2Done ?? [];
        const cardCompletedByBoth = p1DoneLocal.includes(qid) && p2DoneLocal.includes(qid);

        if (cardCompletedByBoth) {
          const nextTurn: 1 | 2 = currentTurn === 1 ? 2 : 1;
          nextMeta.l3Turn = nextTurn;

          const p1 = new Set(p1DoneLocal);
          const p2 = new Set(p2DoneLocal);
          const allBothDone = stage.deck.every((c) => p1.has(c.id) && p2.has(c.id));

          void updateSessionLevelAndMeta(dbSession.id, 3, {
            ...nextMeta,
            l3Stage: allBothDone ? { kind: "done" } : { kind: "carousel", deck: stage.deck },
          });
        } else {
          // Stay on reveal stage, just save the updated player's progress
          void updateSessionLevelAndMeta(dbSession.id, 3, nextMeta);
        }
      }
    } else {
      // Local single-device play: immediately mark completed/skipped for both players
      const updated = updatePlay((s) => {
        const p1Prev = s.l3P1Done ?? [];
        const p2Prev = s.l3P2Done ?? [];
        const nextP1 = p1Prev.includes(qid) ? p1Prev : [...p1Prev, qid];
        const nextP2 = p2Prev.includes(qid) ? p2Prev : [...p2Prev, qid];
        const nextTurn: 1 | 2 = currentTurn === 1 ? 2 : 1;
        return { ...s, l3P1Done: nextP1, l3P2Done: nextP2, l3Turn: nextTurn };
      });
      if (updated) setLocalSession(updated);

      const p1 = new Set(updated?.l3P1Done ?? []);
      const p2 = new Set(updated?.l3P2Done ?? []);
      const allBothDone = stage.deck.every((c) => p1.has(c.id) && p2.has(c.id));
      if (allBothDone) {
        setStage({ kind: "done" });
        return;
      }
      setStage({ kind: "carousel", deck: stage.deck });
    }
  }

  const remainingForCurrent =
    stage.kind === "carousel" || stage.kind === "reveal"
      ? stage.deck.filter((c) => !playerDone.has(c.id) && !bothDone.has(c.id))
      : [];

  return (
    <PageBackdrop>
      <header
        className={`px-5 pt-5 flex items-center justify-between max-w-3xl mx-auto gap-3 transition-opacity duration-500 ${stage.kind === "reveal" ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <button
          onClick={() => setExitOpen(true)}
          className="inline-flex items-center gap-1 text-sm text-charcoal/70 hover:text-charcoal shrink-0 cursor-pointer bg-transparent border-none"
        >
          <ChevronLeft className="h-4 w-4" /> Exit
        </button>
        <div className="flex items-center gap-2 text-sm text-charcoal/80 font-display min-w-0">
          {isRemote && (
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                conn === "connected" ? "bg-green-500 animate-pulse" : "bg-amber-500 animate-ping"
              }`}
              title={conn === "connected" ? "Connected" : "Reconnecting..."}
            />
          )}
          <span
            className={`truncate max-w-[24vw] ${currentTurn === 1 ? "text-charcoal" : "text-charcoal/40"}`}
          >
            {session.p1.name}
          </span>
          <Heart className="h-3.5 w-3.5 text-primary shrink-0" fill="currentColor" />
          <span
            className={`truncate max-w-[24vw] ${currentTurn === 2 ? "text-charcoal" : "text-charcoal/40"}`}
          >
            {session.p2.name}
          </span>
        </div>
        <Logo size="sm" />
      </header>

      <section className="px-5 mt-4 max-w-2xl mx-auto">
        {stage.kind === "carousel" || stage.kind === "reveal" ? (
          <div
            className={`flex items-center justify-center transition-opacity duration-500 ${stage.kind === "reveal" ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-glow-purple"
              style={{ background: `linear-gradient(135deg, ${L3_ACCENT}, ${L3_DEEP})` }}
            >
              {currentPlayerName}'s turn
            </span>
          </div>
        ) : null}

        {stage.kind === "consent" ? (
          <ConsentCard onAccept={acceptConsent} onDecline={rejectConsent} />
        ) : null}

        {stage.kind === "consent-rejected" ? (
          <RejectedCard
            onContinue={() => {
              setAllowTransition(true);
              setTimeout(() => navigate({ to: "/complete" }), 0);
            }}
          />
        ) : null}

        {stage.kind === "source" || (stage.kind === "wait-upload" && isRemote && !iAmReady) ? (
          <SourceSelect onPick={(s) => chooseSource(s)} onUpload={onUpload} />
        ) : null}

        {stage.kind === "p2-source" ? (
          <div className="mt-8 animate-rise text-center">
            <div className="rounded-3xl glass-strong p-7 shadow-card">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white bg-primary-gradient mb-4">
                👤
              </span>
              <h2 className="font-display text-2xl text-charcoal">
                Pass the device to {session.p2.name}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground mb-6">
                It's your turn to choose or upload your custom questions for Level 3.
              </p>
              <SourceSelect onPick={(s) => chooseSource(s)} onUpload={onUpload} />
            </div>
          </div>
        ) : null}

        {stage.kind === "wait-upload" && isRemote && iAmReady ? (
          <div className="mt-8 animate-pulse text-center">
            <div className="rounded-3xl glass-strong p-7 shadow-card">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#A33B47] border-t-transparent" />
              <h2 className="mt-4 font-display text-xl text-charcoal">
                Waiting for partner...
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your questions are locked in. We'll start the game as soon as your partner has uploaded or chosen their deck options.
              </p>
            </div>
          </div>
        ) : null}

        {stage.kind === "uploading" ? (
          <div className="mt-6 glass-strong rounded-3xl p-7 text-center shadow-card animate-rise">
            <Upload className="h-7 w-7 mx-auto text-primary" />
            <p className="mt-3 font-display text-xl text-charcoal">Reading your questions…</p>
          </div>
        ) : null}

        {stage.kind === "carousel" || stage.kind === "reveal" ? (
          <div className="mt-6">
            <Level3DeckViewer
              items={remainingForCurrent}
              activeQuestion={stage.kind === "reveal" ? stage.q : null}
              onPick={drawCard}
              onSkip={() => finishCard("skip")}
              onComplete={() => finishCard("complete")}
              currentPlayerName={currentPlayerName}
              mySlot={mySlot}
              isRemote={isRemote}
              prefersReducedMotion={prefersReducedMotion}
            />
          </div>
        ) : null}

        {stage.kind === "done" ? (
          <DoneCard
            onContinue={() => {
              setAllowTransition(true);
              setTimeout(() => navigate({ to: "/complete" }), 0);
            }}
          />
        ) : null}
      </section>

      {/* Deck summary overlay (auto-dismisses locally via isShuffling) */}
      {isShuffling && stage.kind === "carousel" ? (
        <Overlay>
          <div className="w-full max-w-sm animate-rise text-center">
            <div className="rounded-3xl glass-strong p-6 shadow-card">
              <Flame className="h-6 w-6 mx-auto animate-pulse" style={{ color: L3_ACCENT }} />
              <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Your deck
              </p>
              <h2 className="mt-1 font-display text-xl text-charcoal">{stage.deck.length} cards</h2>
              <p className="mt-3 text-xs text-muted-foreground">Shuffling…</p>
            </div>
          </div>
        </Overlay>
      ) : null}

      <ExitConfirmationPopup
        isRemote={isRemote}
        dbSessionId={dbSession?.id}
        isOpen={exitOpen}
        setIsOpen={setExitOpen}
        shouldBlock={!allowTransition}
      />
    </PageBackdrop>
  );
}

/* ---------------- Pieces ---------------- */

function ConsentCard({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="mt-8 animate-rise">
      <div className="rounded-3xl glass-strong p-7 shadow-card text-center">
        <div
          className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full text-white"
          style={{ background: L3_ACCENT }}
        >
          <Flame className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-2xl text-charcoal">Level 3 goes somewhere deeper</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          These questions are personal, intimate, and sometimes bold. Only continue if you're both
          genuinely comfortable.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={onDecline}
            className="rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-charcoal hover:bg-muted"
          >
            Not Yet
          </button>
          <button
            onClick={onAccept}
            className="rounded-full px-5 py-3 text-sm font-semibold text-white shadow-glow-purple"
            style={{ background: `linear-gradient(135deg, ${L3_ACCENT}, ${L3_DEEP})` }}
          >
            We're Ready
          </button>
        </div>
      </div>
    </div>
  );
}

function SourceSelect({
  onPick,
  onUpload,
}: {
  onPick: (s: Source) => void;
  onUpload: (f: File, mode: Source) => void;
}) {
  const [activeMode, setActiveMode] = useState<"options" | "upload" | "hybrid">("options");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && activeMode !== "options") {
      onUpload(f, activeMode);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && activeMode !== "options") {
      onUpload(f, activeMode);
    }
  }

  if (activeMode !== "options") {
    return (
      <div className="mt-6 animate-rise text-center">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setActiveMode("options")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal/60 hover:text-charcoal transition cursor-pointer"
          >
            ← Back to Options
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
            {activeMode === "upload" ? "Upload Mode" : "Hybrid Mode"}
          </span>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-8 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer select-none
            ${
              isDragging
                ? "border-[#A33B47] bg-[#A33B47]/5 scale-[1.02] shadow-glow-purple"
                : "border-neutral-200 hover:border-[#A33B47] bg-white/70 hover:bg-white hover:shadow-soft"
            }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".txt,.csv,.json"
            className="sr-only"
            onChange={handleFileChange}
          />
          <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4 transition-transform hover:scale-110">
            <Upload className="h-6 w-6 text-[#A33B47]" />
          </div>
          <h3 className="font-display text-base font-semibold text-charcoal">
            Drag & drop your question file
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports .txt, .csv, or .json files (under {GAME_CONFIG.UPLOAD_MAX_SIZE_MB}MB)
          </p>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-[#A33B47] underline underline-offset-4">
            Or browse files
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 animate-rise">
      <h2 className="font-display text-xl text-charcoal">Choose your question source</h2>
      <p className="text-sm text-muted-foreground">Pick how your 10-card deck will be built.</p>
      <div className="mt-4 grid gap-3">
        <SourceCard
          icon={<Sparkles className="h-5 w-5" />}
          iconBg={L3_ACCENT}
          title="AI Generator"
          badge="Recommended"
          desc="A curated deck built from our deeper question library."
          onClick={() => onPick("ai")}
        />
        <SourceCard
          icon={<Upload className="h-5 w-5" />}
          iconBg="#E0A458"
          title="Upload Your Own"
          desc=".txt, .csv, or .json — one question per line. We'll build your deck from it."
          onClick={() => setActiveMode("upload")}
        />
        <SourceCard
          icon={<Layers className="h-5 w-5" />}
          iconBg={L3_DEEP}
          title="Hybrid Mode"
          badge="Best experience"
          desc="Your questions + ours, mixed together."
          onClick={() => setActiveMode("hybrid")}
        />
      </div>
    </div>
  );
}

function SourceCard({
  icon,
  iconBg,
  title,
  badge,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  badge?: string;
  desc: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl glass-strong border border-border p-4 hover:shadow-soft active:scale-[0.99] transition flex items-start gap-3"
    >
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display text-base font-semibold text-charcoal">{title}</span>
          {badge ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full bg-charcoal/10 px-2 py-0.5 text-charcoal">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}

function TierBadge({ tier }: { tier: L3Tier }) {
  if (tier === "wild") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold text-white"
        style={{ background: L3_ACCENT, boxShadow: `0 0 14px ${L3_ACCENT}88` }}
      >
        <Flame className="h-3 w-3" /> Wild
      </span>
    );
  }
  if (tier === "open") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
        style={{ background: "#E0A458" }}
      >
        Open-Minded
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
      style={{ background: "#7C7E94" }}
    >
      Regular
    </span>
  );
}

function RejectedCard({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mt-6 glass-strong rounded-3xl p-7 text-center shadow-card animate-rise">
      <h2 className="font-display text-2xl text-charcoal">No pressure.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Level 3 only happens with both of you on board. Let's wrap up what you've already
        discovered.
      </p>
      <button
        onClick={onContinue}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-romance px-6 py-3 text-sm font-semibold text-white shadow-glow-purple"
      >
        See your insights <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function DoneCard({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mt-8 glass-strong rounded-3xl p-8 text-center shadow-card animate-wrapped-rise">
      <div
        className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full text-3xl text-white"
        style={{ background: L3_ACCENT }}
      >
        🔥
      </div>
      <h2 className="mt-4 font-display text-3xl text-charcoal">That was the deep end.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Take this conversation to your insights screen.
      </p>
      <button
        onClick={onContinue}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
        style={{ background: `linear-gradient(135deg, ${L3_ACCENT}, ${L3_DEEP})` }}
      >
        See your insights <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-charcoal/85 backdrop-blur-md p-5"
    >
      <div className="w-full grid place-items-center">{children}</div>
    </div>
  );
}

interface Level3DeckViewerProps {
  items: L3Question[];
  activeQuestion: L3Question | null;
  onPick: (q: L3Question) => void;
  onSkip: () => void;
  onComplete: () => void;
  currentPlayerName: string;
  mySlot: 1 | 2 | null;
  isRemote: boolean;
  prefersReducedMotion?: boolean;
}

export function Level3DeckViewer({
  items,
  activeQuestion,
  onPick,
  onSkip,
  onComplete,
  currentPlayerName,
  mySlot,
  isRemote,
  prefersReducedMotion = false,
}: Level3DeckViewerProps) {
  const [rotation, setRotation] = useState(0);
  const dragRef = useRef<{ x: number; base: number } | null>(null);
  const [isStacked, setIsStacked] = useState(false);
  const drawingRef = useRef(false);

  useEffect(() => {
    // Show fanned out first for 1.2 seconds, then gather into single deck
    const t = setTimeout(() => setIsStacked(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const N = Math.max(1, items.length);
  const SPREAD = Math.min(90, 14 * (N - 1)); // total degrees across the arc

  // If a card is active, we find its index to apply centering styles
  const activeIdx = activeQuestion ? items.findIndex((item) => item.id === activeQuestion.id) : -1;

  function onDown(e: React.PointerEvent) {
    if (activeQuestion) return; // Disable drag during reveal
    dragRef.current = { x: e.clientX, base: rotation };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
    if (!dragRef.current || activeQuestion) return;
    const dx = e.clientX - dragRef.current.x;
    setRotation(dragRef.current.base + dx * 0.35);
  }

  function onUp() {
    dragRef.current = null;
  }

  function tap(item: L3Question) {
    if (activeQuestion || drawingRef.current) return;
    drawingRef.current = true;
    onPick(item);
    setTimeout(() => {
      drawingRef.current = false;
    }, 1000);
  }

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Deck Arc / Cards Area */}
      <div
        className="relative touch-pan-y flex items-center justify-center select-none"
        style={{ width: "min(96vw, 420px)", height: 420, perspective: 1500 }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {items.map((item, i) => {
          const t = N === 1 ? 0 : i / (N - 1) - 0.5; // -0.5..0.5

          // Reverse entrance animation: Fan out first (isStacked = false), then gather into single deck (isStacked = true)
          const fannedOffsetX = t * 95;
          const fannedOffsetY = Math.abs(t) * 28;
          const fannedRot = t * SPREAD;

          const stackedOffsetX = (i - Math.floor(N / 2)) * 1.5;
          const stackedOffsetY = (i - Math.floor(N / 2)) * -0.5;
          const stackedRot = (i - Math.floor(N / 2)) * 0.8;

          const offsetX = isStacked ? stackedOffsetX : fannedOffsetX;
          const offsetY = isStacked ? stackedOffsetY : fannedOffsetY;
          const arcRot = (isStacked ? stackedRot : fannedRot) + rotation * 0.6;

          const isActive = activeIdx === i;
          const hasActive = activeIdx !== -1;

          const cardStyle: React.CSSProperties = {
            width: "min(62vw, 216px)",
            height: 300,
            transition: prefersReducedMotion ? "none" : `all ${GAME_CONFIG.L3_CARD_FLIP_SPEED_MS}ms cubic-bezier(0.25, 1, 0.5, 1)`,
            transformStyle: "preserve-3d",
            zIndex: isActive ? 50 : 10 - Math.abs(i - Math.floor(N / 2)),
          };

          if (isActive) {
            // Move to center, scale up, and flip in place (180deg Y rotation)
            cardStyle.transform = `translateX(-50%) translateY(-50%) translate3d(0, -30px, 150px) scale(1.18) rotateY(180deg)`;
            cardStyle.left = "50%";
            cardStyle.top = "50%";
            cardStyle.position = "absolute";
          } else if (hasActive) {
            // Softly fade and blur other cards
            cardStyle.transform = `translateX(-50%) translateX(${offsetX}px) translateY(${offsetY}px) rotate(${arcRot}deg) scale(0.85) translateZ(-100px)`;
            cardStyle.left = "50%";
            cardStyle.top = "20px";
            cardStyle.position = "absolute";
            cardStyle.opacity = 0.05;
            cardStyle.filter = "blur(12px)";
            cardStyle.pointerEvents = "none";
          } else {
            // Normal fan state
            cardStyle.transform = `translateX(-50%) translateX(${offsetX}px) translateY(${offsetY}px) rotate(${arcRot}deg)`;
            cardStyle.left = "50%";
            cardStyle.top = "20px";
            cardStyle.position = "absolute";
            cardStyle.opacity = 1;
            cardStyle.filter = "none";
          }

          return (
            <div
              key={item.id}
              onClick={() => tap(item)}
              className={`absolute rounded-3xl ${!hasActive ? (prefersReducedMotion ? "" : "hover:scale-[1.03] hover:translate-y-[-8px]") : ""} ${prefersReducedMotion ? "" : "transition-all duration-300"}`}
              style={{
                ...cardStyle,
                cursor: hasActive ? "default" : "pointer",
              }}
            >
              {/* Card Container with preserve-3d */}
              <div
                className="relative w-full h-full rounded-3xl"
                style={{
                  transformStyle: "preserve-3d",
                  width: "100%",
                  height: "100%",
                }}
              >
                {/* 1. CARD BACK (Branded Back) */}
                <div
                  className="absolute inset-0 rounded-3xl p-[2px] bg-gradient-to-br from-amber-400/30 via-red-500/20 to-purple-600/30 shadow-card-lift"
                  style={{
                    transform: "rotateY(0deg)",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    zIndex: 2,
                  }}
                >
                  <div className="h-full w-full rounded-[22px] bg-gradient-to-br from-[#2D0B0F] to-[#120304] flex flex-col items-center justify-between p-6 border border-amber-500/20 shadow-inner">
                    <div className="w-full flex justify-between items-center opacity-30">
                      <span className="text-[8px] uppercase tracking-[0.2em] text-amber-200">
                        Level 3
                      </span>
                      <span className="text-[8px] uppercase tracking-[0.2em] text-amber-200">
                        Deeper
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center shadow-lg shadow-red-950/40">
                        <Flame className="h-5 w-5 text-neutral-900" />
                      </div>
                      <span className="font-display text-xl font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 drop-shadow-sm">
                        KnowEm
                      </span>
                    </div>

                    <div className="w-full flex justify-center opacity-20">
                      <Heart className="h-3 w-3 text-amber-200" fill="currentColor" />
                    </div>
                  </div>
                </div>

                {/* 2. CARD FRONT (Question & Actions) */}
                <div
                  className="absolute inset-0 rounded-3xl bg-white border border-neutral-100 p-6 flex flex-col justify-between shadow-2xl"
                  style={{
                    transform: "rotateY(180deg)",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    zIndex: 1,
                  }}
                >
                  <div className="flex items-center justify-between opacity-80">
                    <span className="text-[9px] uppercase tracking-[0.18em] text-neutral-400 font-medium">
                      Level 3 · Deeper
                    </span>
                    <Flame className="h-4 w-4 text-red-500 animate-pulse" />
                  </div>

                  <div className="flex-1 flex items-center justify-center py-2 px-1">
                    <h3 className="font-display text-base sm:text-lg font-semibold text-neutral-800 text-center leading-relaxed">
                      {item.title}
                    </h3>
                  </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSkip();
                        }}
                        className="flex-1 rounded-full border border-neutral-200 py-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 active:scale-95 transition"
                      >
                        Skip
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onComplete();
                        }}
                        className="flex-1 rounded-full bg-gradient-to-r from-[#A33B47] to-[#6d1f29] py-2 text-xs font-semibold text-white shadow-soft hover:opacity-95 active:scale-95 transition"
                      >
                        Discussed
                      </button>
                    </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cinematic hint / count at bottom */}
      {!activeQuestion && (
        <p className="mt-4 text-xs text-white/50 tracking-wider animate-pulse">
          {N} cards left for {currentPlayerName} · Drag to rotate
        </p>
      )}
    </div>
  );
}
