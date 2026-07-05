import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  Heart,
  SkipForward,
  Sparkles,
  X,
  Clock,
  Loader2,
} from "lucide-react";
import { DevPanel } from "@/components/DevPanel";
import { ExitConfirmationPopup } from "@/components/ExitConfirmationPopup";
import { Logo, PageBackdrop } from "@/components/Brand";
import { CircularTimer } from "@/components/CircularTimer";
import { GAME_CONFIG } from "@/config/gameConfig";
import { clearPlay, loadPlay, updatePlay } from "@/lib/playSession";
import { loadQuestions, saveLastResult } from "@/lib/storage";
import { computeCompatibility } from "@/lib/compatibility";
import type { Question, Answer } from "@/lib/types";

export const Route = createFileRoute("/game")({
  head: () => ({ meta: [{ title: "Level 1 — Discover Your Vibe" }] }),
  component: PlayLevel1,
});

const TIMER_SECONDS = GAME_CONFIG.L1_TIMER_SECONDS;
const MAX_SKIPS = 3;

type Choice = "A" | "B" | "SKIP" | "TIMEOUT";

type Phase =
  | { kind: "pass"; idx: number; who: 1 | 2 }
  | { kind: "answer"; idx: number; who: 1 | 2; startedAt: number }
  | { kind: "locked"; idx: number; who: 1 | 2 } // brief flash before pass/store
  | { kind: "complete" }
  | { kind: "request-pass" } // P1 sent invite, pass to P2
  | { kind: "request-decision" } // P2 decides
  | { kind: "insight" }
  | { kind: "abandoned" };

function PlayLevel1() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ReturnType<typeof loadPlay>>(null);
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>(() => ({ kind: "pass", idx: 0, who: 1 }));
  const [tempP1, setTempP1] = useState<Choice | null>(null);
  const [skips, setSkips] = useState({ p1: MAX_SKIPS, p2: MAX_SKIPS });
  const [streak, setStreak] = useState({ p1: 0, p2: 0 });
  const [now, setNow] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [allowTransition, setAllowTransition] = useState(false);
  const timeoutFiredRef = useRef<string>("");

  useEffect(() => {
    const s = loadPlay();
    setSession(s);
    setHydrated(true);
    if (!s) {
      navigate({ to: "/setup" });
    } else if (s.l1Phase) {
      setPhase(s.l1Phase);
    }
  }, [navigate]);

  useEffect(() => {
    if (!hydrated || !session) return;
    updatePlay((current) => ({
      ...current,
      l1Phase: phase,
    }));
  }, [phase, hydrated, session]);

  const allQs = useMemo(() => loadQuestions(), []);
  const byId = useMemo(() => new Map(allQs.map((q) => [q.id, q])), [allQs]);
  const cards = useMemo<Question[]>(() => {
    if (!session) return [];
    return session.l1QuestionIds.map((id) => byId.get(id)).filter(Boolean) as Question[];
  }, [session, byId]);

  // Resume to complete if already answered all
  useEffect(() => {
    if (!session) return;
    if (
      cards.length > 0 &&
      session.l1Answers.length >= cards.length &&
      phase.kind === "pass" &&
      phase.idx === 0
    ) {
      setPhase({ kind: "complete" });
    } else if (
      session.l1Answers.length > 0 &&
      phase.kind === "pass" &&
      phase.idx === 0 &&
      phase.who === 1 &&
      !session.l1Phase
    ) {
      // Resume mid-game
      setPhase({ kind: "pass", idx: session.l1Answers.length, who: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length]);

  // Tick clock during answer phase
  useEffect(() => {
    if (phase.kind !== "answer") return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [phase.kind]);

  // Manual Continue from locked state (Pass Device flow)
  function continueFromLock() {
    if (phase.kind !== "locked") return;
    setIsSubmitting(false);
    if (phase.who === 1) {
      // hand off to P2 answering same question
      setNow(Date.now());
      setPhase({ kind: "answer", idx: phase.idx, who: 2, startedAt: Date.now() });
      return;
    }
    // who === 2: round already stored in submitChoiceP2; advance
    const nextIdx = phase.idx + 1;
    if (nextIdx >= cards.length) {
      const allAnswers: Answer[] = session.l1Answers.map((ans) => ({
        questionId: ans.questionId,
        p1: ans.p1,
        p2: ans.p2,
      }));
      const result = computeCompatibility(session.p1, session.p2, cards, allAnswers);
      saveLastResult({ ...result, p1Name: session.p1.name, p2Name: session.p2.name });
      setAllowTransition(true);
      setTimeout(() => navigate({ to: "/level-1-complete" }), 0);
    } else {
      setTempP1(null);
      setPhase({ kind: "pass", idx: nextIdx, who: 1 });
    }
  }

  // Timer expiry
  const remaining =
    phase.kind === "answer"
      ? Math.max(0, TIMER_SECONDS - (now - phase.startedAt) / 1000)
      : TIMER_SECONDS;

  useEffect(() => {
    if (phase.kind !== "answer") return;
    if (remaining > 0) return;
    const key = `${phase.idx}:${phase.who}`;
    if (timeoutFiredRef.current === key) return;
    timeoutFiredRef.current = key;
    submitChoice("TIMEOUT");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  if (!hydrated || !session)
    return (
      <PageBackdrop>
        <div className="min-h-dvh" />
      </PageBackdrop>
    );

  const total = cards.length;
  const answeredCount = Math.min(session.l1Answers.length, total);

  function submitChoice(choice: Choice) {
    if (phase.kind !== "answer" || isSubmitting) return;
    setIsSubmitting(true);
    // Update skips/streak
    if (choice === "TIMEOUT") {
      setStreak((s) => ({
        ...s,
        [phase.who === 1 ? "p1" : "p2"]: s[phase.who === 1 ? "p1" : "p2"] + 1,
      }));
    } else {
      setStreak((s) => ({ ...s, [phase.who === 1 ? "p1" : "p2"]: 0 }));
      if (choice === "SKIP") {
        setSkips((s) => ({
          ...s,
          [phase.who === 1 ? "p1" : "p2"]: Math.max(0, s[phase.who === 1 ? "p1" : "p2"] - 1),
        }));
      }
    }
    if (phase.who === 1) {
      setTempP1(choice);
    }
    setPhase({ kind: "locked", idx: phase.idx, who: phase.who });
  }

  // Cleaner: dedicated P2 submit
  function submitChoiceP2(choice: Choice) {
    if (phase.kind !== "answer" || phase.who !== 2 || isSubmitting) return;
    setIsSubmitting(true);
    // Idempotency guard: prevent double-store on the same question
    if (session && session.l1Answers.length > phase.idx) {
      setPhase({ kind: "locked", idx: phase.idx, who: 2 });
      setIsSubmitting(false);
      return;
    }
    if (choice === "TIMEOUT") {
      setStreak((s) => ({ ...s, p2: s.p2 + 1 }));
    } else {
      setStreak((s) => ({ ...s, p2: 0 }));
      if (choice === "SKIP") setSkips((s) => ({ ...s, p2: Math.max(0, s.p2 - 1) }));
    }

    const p1 = tempP1 ?? "TIMEOUT";
    const card = cards[phase.idx];

    // Store actual choice: A, B, or SKIP (TIMEOUT collapses to SKIP for storage/insights)
    const norm = (c: Choice): "A" | "B" | "SKIP" => (c === "A" || c === "B" ? c : "SKIP");
    const updated = updatePlay((s) => ({
      ...s,
      l1Answers: [...s.l1Answers, { questionId: card.id, p1: norm(p1), p2: norm(choice) }],
    }));
    setSession(updated);

    // Inactivity check using next-streak values
    const newStreakP1 = p1 === "TIMEOUT" ? streak.p1 + 1 : 0;
    const newStreakP2 = choice === "TIMEOUT" ? streak.p2 + 1 : 0;
    if (newStreakP1 >= 2 || newStreakP2 >= 2) {
      setPhase({ kind: "abandoned" });
      setIsSubmitting(false);
      return;
    }

    // Transition to locked so the user taps Continue to advance
    setPhase({ kind: "locked", idx: phase.idx, who: 2 });
  }

  function handleChoose(c: Choice) {
    if (phase.kind !== "answer" || isSubmitting) return;
    if (phase.who === 1) submitChoice(c);
    else submitChoiceP2(c);
  }

  function handleAcceptLevel2() {
    if (!session) return;
    const allAnswers: Answer[] = session.l1Answers.map((ans) => ({
      questionId: ans.questionId,
      p1: ans.p1,
      p2: ans.p2,
    }));
    const result = computeCompatibility(session.p1, session.p2, cards, allAnswers);
    saveLastResult({ ...result, p1Name: session.p1.name, p2Name: session.p2.name });
    setPhase({ kind: "insight" });
  }

  const current =
    phase.kind === "answer" || phase.kind === "pass" || phase.kind === "locked"
      ? cards[phase.idx]
      : null;
  const currentWho =
    phase.kind === "answer" || phase.kind === "pass" || phase.kind === "locked" ? phase.who : null;

  return (
    <PageBackdrop>
      <header className="px-5 pt-5 flex items-center justify-between max-w-3xl mx-auto gap-3">
        <button
          onClick={() => setExitOpen(true)}
          className="inline-flex items-center gap-1 text-sm text-charcoal/70 hover:text-charcoal shrink-0 cursor-pointer bg-transparent border-none"
        >
          <ChevronLeft className="h-4 w-4" /> Exit
        </button>
        <PresenceChips
          p1={session.p1.name}
          p2={session.p2.name}
          activeWho={currentWho}
          locked={phase.kind === "locked"}
        />
        <Logo size="sm" />
      </header>

      <section className="px-5 mt-5 max-w-2xl mx-auto">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Level 1
            </p>
            <h1 className="font-display text-2xl sm:text-3xl text-charcoal">Discover Your Vibe</h1>
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {answeredCount} / {total}
          </span>
        </div>

        <DiscoveryProgress n={answeredCount} total={total} />

        {/* Question area */}
        {current && (phase.kind === "answer" || phase.kind === "locked") ? (
          <QuestionCard
            key={`${phase.idx}:${phase.who}:${phase.kind === "locked" ? "L" : "A"}`}
            q={current}
            playerName={currentWho === 1 ? session.p1.name : session.p2.name}
            nextPlayerName={
              phase.kind === "locked"
                ? phase.who === 1
                  ? session.p2.name
                  : phase.idx + 1 < total
                    ? session.p1.name
                    : ""
                : ""
            }
            isFinalRound={phase.kind === "locked" && phase.who === 2 && phase.idx + 1 >= total}
            skipsLeft={currentWho === 1 ? skips.p1 : skips.p2}
            remaining={phase.kind === "answer" ? remaining : 0}
            locked={phase.kind === "locked"}
            submitting={isSubmitting}
            onChoose={handleChoose}
            onContinue={continueFromLock}
            indexLabel={`Discovery ${phase.idx + 1} of ${total}`}
          />
        ) : null}
        <DevPanel
          context="level-1"
          onAutoAnswer={() =>
            phase.kind === "answer" && handleChoose(Math.random() < 0.5 ? "A" : "B")
          }
          onContinueLock={() => phase.kind === "locked" && continueFromLock()}
          onComplete={() => setPhase({ kind: "complete" })}
          onJump={(to) => navigate({ to: to as never })}
        />
      </section>

      {/* Pass-the-device overlay */}
      {phase.kind === "pass" && current ? (
        <PassOverlay
          name={phase.who === 1 ? session.p1.name : session.p2.name}
          subtitle={`Question ${phase.idx + 1} of ${total}`}
          onReady={() => {
            setNow(Date.now());
            setPhase({ kind: "answer", idx: phase.idx, who: phase.who, startedAt: Date.now() });
          }}
        />
      ) : null}

      {phase.kind === "complete" ? (
        <CompleteOverlay
          p1={session.p1.name}
          onSend={() => setPhase({ kind: "request-pass" })}
          onSkipL2={() => {
            setAllowTransition(true);
            setTimeout(() => navigate({ to: "/level-1-complete" }), 0);
          }}
        />
      ) : null}

      {phase.kind === "request-pass" ? (
        <PassOverlay
          name={session.p2.name}
          subtitle="A message from your partner"
          onReady={() => setPhase({ kind: "request-decision" })}
        />
      ) : null}

      {phase.kind === "request-decision" ? (
        <RequestDecisionOverlay
          p1={session.p1.name}
          onAccept={handleAcceptLevel2}
          onDecline={() => {
            setAllowTransition(true);
            setTimeout(() => navigate({ to: "/level-1-complete" }), 0);
          }}
        />
      ) : null}

      {phase.kind === "insight" ? (
        <InsightOverlay
          session={session}
          cards={cards}
          onContinue={() => {
            setAllowTransition(true);
            setTimeout(() => navigate({ to: "/level-1-complete" }), 0);
          }}
        />
      ) : null}

      {phase.kind === "abandoned" ? (
        <AbandonedOverlay
          onRestart={() => {
            clearPlay();
            navigate({ to: "/setup" });
          }}
        />
      ) : null}

      <ExitConfirmationPopup
        isRemote={false}
        isOpen={exitOpen}
        setIsOpen={setExitOpen}
        shouldBlock={!allowTransition}
      />
    </PageBackdrop>
  );
}

// Approved short chips per category (≤ 5 words, premium voice)
const CHIP_BY_CATEGORY: Record<string, string> = {
  Lifestyle: "Lifestyle Indicator",
  Travel: "Adventure Pulse",
  Food: "Comfort Habit",
  Entertainment: "Downtime Style",
  Personality: "Inner Wiring",
  Values: "What Matters",
  Finance: "Money Mindset",
  Family: "Roots & Future",
  Relationships: "Communication Style",
};
function hintChip(category: string, hint: string): string {
  return CHIP_BY_CATEGORY[category] ?? hint.split(/\s+/).slice(0, 3).join(" ");
}

/* ---------------- UI parts ---------------- */

function PresenceChips({
  p1,
  p2,
  activeWho,
  locked,
}: {
  p1: string;
  p2: string;
  activeWho: 1 | 2 | null;
  locked: boolean;
}) {
  const p1State =
    activeWho === 1 && !locked
      ? "answering"
      : activeWho === 2 || (activeWho === 1 && locked)
        ? "answered"
        : "waiting";
  const p2State =
    activeWho === 2 && !locked
      ? "answering"
      : activeWho === 2 && locked
        ? "answered"
        : activeWho === 1
          ? "waiting"
          : "waiting";

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
      <Chip name={p1} state={p1State} />
      <span className="text-charcoal/40 text-xs">→</span>
      <Chip name={p2} state={p2State} />
    </div>
  );
}

function Chip({ name, state }: { name: string; state: "answering" | "answered" | "waiting" }) {
  const dot =
    state === "answered" ? (
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
    ) : state === "answering" ? (
      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
    ) : (
      <span className="h-2 w-2 rounded-full bg-charcoal/25" />
    );
  const label = state === "answered" ? "Answered" : state === "answering" ? "Answering" : "Waiting";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full glass px-2.5 py-1 text-[11px] font-medium text-charcoal/85 max-w-[42vw]">
      {dot}
      <span className="truncate">{name}</span>
      <span className="text-charcoal/50">· {label}</span>
    </span>
  );
}

function DiscoveryProgress({ n, total }: { n: number; total: number }) {
  return (
    <div className="mt-4 glass rounded-2xl px-4 py-2.5 flex items-center gap-3">
      <Heart className="h-4 w-4 text-primary shrink-0" fill="currentColor" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Discovery
          </span>
          <span className="text-xs font-medium text-charcoal/80 tabular-nums">
            {n} / {total}
          </span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-white/70 overflow-hidden">
          <div
            className="h-full bg-primary-gradient transition-all duration-500"
            style={{ width: `${(n / Math.max(1, total)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  q,
  playerName,
  nextPlayerName,
  isFinalRound,
  skipsLeft,
  remaining,
  locked,
  submitting,
  onChoose,
  onContinue,
  indexLabel,
}: {
  q: Question;
  playerName: string;
  nextPlayerName: string;
  isFinalRound: boolean;
  skipsLeft: number;
  remaining: number;
  locked: boolean;
  submitting?: boolean;
  onChoose: (c: Choice) => void;
  onContinue: () => void;
  indexLabel: string;
}) {
  const skipDisabled = skipsLeft <= 0 || locked || submitting;
  return (
    <div className="mt-5 glass-strong rounded-3xl p-6 sm:p-8 animate-rise shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {indexLabel}
          </p>
          <h2 className="mt-1.5 font-display text-2xl sm:text-3xl text-charcoal">{q.title}</h2>
          {q.hint ? (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary/70 px-3 py-1 text-[11px] font-medium text-charcoal/80">
              <Sparkles className="h-3 w-3 text-primary" />
              💡 {hintChip(q.category, q.hint)}
            </span>
          ) : null}
        </div>
        {!locked ? (
          <CircularTimer remaining={remaining} total={TIMER_SECONDS} />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Answer Locked
          </span>
        )}
      </div>

      {locked ? (
        <div className="mt-7 text-center animate-lock">
          <p className="font-display text-2xl text-charcoal">✓ Answer Locked</p>
          {isFinalRound ? (
            <p className="mt-2 text-sm text-muted-foreground">You've completed all discoveries.</p>
          ) : nextPlayerName ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Pass the device to <span className="font-medium text-charcoal">{nextPlayerName}</span>
            </p>
          ) : null}
          <button
            onClick={onContinue}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-6 py-3 text-sm font-semibold text-white shadow-soft"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3">
            <ChoiceButton
              label={q.optionA.label}
              onClick={() => onChoose("A")}
              disabled={submitting}
            />
            <Divider />
            <ChoiceButton
              label={q.optionB.label}
              onClick={() => onChoose("B")}
              disabled={submitting}
            />
          </div>
          <div className="mt-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Clock className="h-3 w-3" /> {playerName} answering
            </span>
            <button
              onClick={() => onChoose("SKIP")}
              disabled={skipDisabled}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-charcoal/70 hover:text-charcoal disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip · {skipsLeft}/{MAX_SKIPS} left
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ChoiceButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl px-5 py-4 text-left text-base font-medium border transition ${
        disabled
          ? "bg-white/50 text-charcoal/50 border-border cursor-not-allowed opacity-70"
          : "bg-white text-charcoal border-border hover:border-primary/40 hover:shadow-soft active:scale-[0.98] duration-150"
      }`}
    >
      <span className="flex items-center justify-between">
        <span>{label}</span>
        {disabled && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </span>
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        or
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function PassOverlay({
  name,
  subtitle,
  onReady,
}: {
  name: string;
  subtitle?: string;
  onReady: () => void;
}) {
  return (
    <Overlay>
      <div className="text-center max-w-sm animate-rise">
        {subtitle ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
            {subtitle}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
          Pass the device to
        </p>
        <h2 className="mt-3 font-display text-5xl font-semibold text-white">{name}</h2>
        <button
          onClick={onReady}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-charcoal shadow-soft"
        >
          I'm {name}, ready <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </Overlay>
  );
}

function CompleteOverlay({
  p1,
  onSend,
  onSkipL2,
}: {
  p1: string;
  onSend: () => void;
  onSkipL2: () => void;
}) {
  return (
    <Overlay>
      <div className="w-full max-w-md text-center animate-rise">
        <div className="rounded-3xl glass-strong p-7 shadow-card">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-gradient px-3 py-1 text-xs font-medium text-white">
            <Sparkles className="h-3.5 w-3.5" /> Level 1 Complete
          </span>
          <h2 className="mt-4 font-display text-3xl text-charcoal">Beautifully done.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            That was the warm-up. {p1}, would you like to invite your partner deeper?
          </p>
          <div className="mt-6 grid gap-2">
            <button
              onClick={onSend}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-5 py-3 text-sm font-semibold text-white shadow-soft"
            >
              Send Level 2 invite <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onSkipL2}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-charcoal hover:bg-muted"
            >
              Maybe later — wrap up here
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

function RequestDecisionOverlay({
  p1,
  onAccept,
  onDecline,
}: {
  p1: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Overlay>
      <div className="w-full max-w-md text-center animate-rise">
        <div className="rounded-3xl glass-strong p-7 shadow-card">
          <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium text-charcoal/70">
            <Heart className="h-3.5 w-3.5 text-primary" fill="currentColor" /> A message
          </span>
          <h2 className="mt-4 font-display text-2xl text-charcoal">
            <span className="text-primary-gradient">{p1}</span> wants to continue exploring.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Only continue if you're up for going a little deeper.
          </p>
          <div className="mt-6 grid gap-2">
            <button
              onClick={onAccept}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-5 py-3 text-sm font-semibold text-white shadow-soft"
            >
              Continue together <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onDecline}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-charcoal hover:bg-muted"
            >
              Not right now
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

function AbandonedOverlay({ onRestart }: { onRestart: () => void }) {
  return (
    <Overlay>
      <div className="w-full max-w-md text-center animate-rise">
        <div className="rounded-3xl glass-strong p-7 shadow-card">
          <h2 className="font-display text-2xl text-charcoal">A pause in the conversation.</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            It looks like your partner stepped away before the conversation was completed.
          </p>
          <div className="mt-6 grid gap-2">
            <button
              onClick={onRestart}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-5 py-3 text-sm font-semibold text-white shadow-soft"
            >
              Start a new session <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-charcoal hover:bg-muted"
            >
              Back home
            </Link>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-charcoal/70 backdrop-blur-md p-5"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full grid place-items-center">
        {children}
      </div>
      {onClose ? (
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-soft"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function InsightOverlay({
  session,
  cards,
  onContinue,
}: {
  session: NonNullable<ReturnType<typeof loadPlay>>;
  cards: Question[];
  onContinue: () => void;
}) {
  const result = useMemo(() => {
    const allAnswers: Answer[] = session.l1Answers.map((ans) => ({
      questionId: ans.questionId,
      p1: ans.p1,
      p2: ans.p2,
    }));
    return computeCompatibility(session.p1, session.p2, cards, allAnswers);
  }, [session, cards]);

  return (
    <Overlay>
      <div className="w-full max-w-md text-center animate-rise">
        <div className="rounded-3xl glass-strong p-7 sm:p-8 shadow-card flex flex-col items-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-gradient px-3 py-1 text-xs font-medium text-white">
            <Sparkles className="h-3.5 w-3.5" /> Level 1 Results
          </span>

          <h2 className="mt-4 font-display text-2xl text-charcoal">Your compatibility is in</h2>

          {/* Animated Compatibility Ring */}
          <div className="my-6">
            <ScoreRing score={result.score} />
          </div>

          {/* Relationship Tag */}
          <p className="font-display text-xl font-semibold text-primary-gradient">{result.label}</p>

          {/* One-line Insight */}
          <p className="mt-3 text-sm text-muted-foreground px-2 leading-relaxed">
            "
            {result.insights[0] ||
              result.insights[1] ||
              "Your differences are the conversation starters, not the problem."}
            "
          </p>

          <button
            onClick={onContinue}
            className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-5 py-3.5 text-sm font-semibold text-white shadow-soft hover:scale-[1.02] active:scale-[0.98] transition duration-150"
          >
            Continue to Level 2 <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function ScoreRing({ score }: { score: number }) {
  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative animate-pulse" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          <linearGradient id="score-grad-game" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#B38ACB" />
            <stop offset="100%" stopColor="#A678C4" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#score-grad-game)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <p className="font-display text-2xl font-semibold text-charcoal">{score}%</p>
      </div>
    </div>
  );
}
