import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, SkipForward, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Logo, PageBackdrop } from "@/components/Brand";
import { CircularTimer } from "@/components/CircularTimer";
import {
  advanceIndex,
  consecutiveSkipsForSlot,
  fetchAnswers,
  getSessionByCode,
  setSessionStatus,
  submitAnswer,
  subscribeSession,
  type AnswerRow,
  type SessionRow,
} from "@/lib/session";
import { computeCompatibility } from "@/lib/compatibility";
import { getParticipant, incrementSessions, loadQuestions, saveLastResult } from "@/lib/storage";
import { log, maskCode } from "@/lib/log";
import type { Answer, Question } from "@/lib/types";

const TIMER_SECONDS = 30;
const REVEAL_SECONDS = 5;

export const Route = createFileRoute("/play/$code")({
  head: () => ({ meta: [{ title: "Discover Your Vibe — KnowEm" }] }),
  component: Play,
});

function Play() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingErr, setLoadingErr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(() => Date.now());
  const [reveal, setReveal] = useState<{ index: number; startedAt: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef<Set<string>>(new Set());
  const advancingRef = useRef<number>(-1);
  const [conn, setConn] = useState<"connecting" | "connected" | "disconnected">("connecting");

  const me = getParticipant(code);
  const mySlot: 1 | 2 | null = me?.slot ?? null;
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const s = await getSessionByCode(code);
      if (s) {
        setSession(s);
        const initialAnswers = await fetchAnswers(s.id);
        setAnswers(initialAnswers);
        setConn("connected");
        toast.success("Reconnected successfully!");
      } else {
        throw new Error("No session found");
      }
    } catch {
      toast.error("Retry failed. Check your internet connection.");
    } finally {
      setIsRetrying(false);
    }
  };

  // Load + subscribe
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const s = await getSessionByCode(code);
        if (!s) {
          setLoadingErr("Session not found.");
          log("session", "not found", { code: maskCode(code) });
          return;
        }
        if (s.status === "done") {
          navigate({ to: "/result" });
          return;
        }
        if (!mySlot) {
          setLoadingErr("This device isn't part of the session. Ask for the share link again.");
          log("presence", "device not bound", { code: maskCode(code) });
          return;
        }
        const all = loadQuestions();
        const byId = new Map(all.map((q) => [q.id, q]));
        const qs = s.question_ids.map((id) => byId.get(id)).filter(Boolean) as Question[];
        if (qs.length !== s.question_ids.length) {
          log("storage", "question pool mismatch — partial", {
            wanted: s.question_ids.length,
            got: qs.length,
          });
        }
        setQuestions(qs);
        setSession(s);
        const initialAnswers = await fetchAnswers(s.id);
        setAnswers(initialAnswers);
        setQuestionStartedAt(Date.now());
        log("presence", "play attached", {
          code: maskCode(code),
          slot: mySlot,
          status: s.status,
          currentIndex: s.current_index,
          answers: initialAnswers.length,
        });
        unsub = subscribeSession(
          s.id,
          (next) => setSession(next),
          (a) =>
            setAnswers((prev) => {
              const i = prev.findIndex((p) => p.id === a.id);
              if (i >= 0) {
                const copy = [...prev];
                copy[i] = a;
                return copy;
              }
              return [...prev, a];
            }),
          (status) => setConn(status),
        );
      } catch (e) {
        console.error(e);
        setLoadingErr("Could not load the session.");
        log("session", "load failed", { error: (e as Error).message });
      }
    })();
    return () => {
      unsub?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // tick clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Reset question timer when index changes
  useEffect(() => {
    if (!session) return;
    setQuestionStartedAt(Date.now());
    setReveal(null);
    setIsSubmitting(false);
  }, [session?.current_index]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentQuestion = useMemo(() => {
    if (!session) return null;
    return questions[session.current_index] ?? null;
  }, [session, questions]);

  const myAnswer = useMemo(() => {
    if (!session || !currentQuestion || !mySlot) return null;
    return (
      answers.find((a) => a.question_id === currentQuestion.id && a.player_slot === mySlot) ?? null
    );
  }, [session, currentQuestion, answers, mySlot]);

  const partnerAnswer = useMemo(() => {
    if (!session || !currentQuestion || !mySlot) return null;
    const ps = mySlot === 1 ? 2 : 1;
    return (
      answers.find((a) => a.question_id === currentQuestion.id && a.player_slot === ps) ?? null
    );
  }, [session, currentQuestion, answers, mySlot]);

  // Auto-skip when timer expires
  const elapsed = (now - questionStartedAt) / 1000;
  const remaining = Math.max(0, TIMER_SECONDS - elapsed);

  useEffect(() => {
    if (!session || !currentQuestion || !mySlot) return;
    if (myAnswer) return;
    if (remaining > 0) return;
    const key = `${currentQuestion.id}:${mySlot}`;
    if (submittedRef.current.has(key)) return;
    submittedRef.current.add(key);
    void submitAnswer({
      sessionId: session.id,
      questionId: currentQuestion.id,
      slot: mySlot,
      choice: "SKIP",
    });
  }, [remaining, currentQuestion, myAnswer, mySlot, session]);

  async function choose(choice: "A" | "B" | "SKIP") {
    if (!session || !currentQuestion || !mySlot || myAnswer || isSubmitting) return;
    const key = `${currentQuestion.id}:${mySlot}`;
    if (submittedRef.current.has(key)) return;
    submittedRef.current.add(key);
    setIsSubmitting(true);
    try {
      await submitAnswer({
        sessionId: session.id,
        questionId: currentQuestion.id,
        slot: mySlot,
        choice,
      });
    } catch {
      submittedRef.current.delete(key);
      setIsSubmitting(false);
      toast.error("Couldn't submit — try again.");
    }
  }

  // Trigger reveal when both have answered
  useEffect(() => {
    if (!session || !currentQuestion) return;
    if (!myAnswer || !partnerAnswer) return;
    if (reveal && reveal.index === session.current_index) return;
    setReveal({ index: session.current_index, startedAt: Date.now() });
  }, [myAnswer, partnerAnswer, currentQuestion, session, reveal]);

  // After reveal, advance. Slot 1 advances at 5s; slot 2 falls back at 6.5s.
  useEffect(() => {
    if (!session || !reveal || !mySlot) return;
    const elapsedReveal = (now - reveal.startedAt) / 1000;
    const myDelay = mySlot === 1 ? REVEAL_SECONDS : REVEAL_SECONDS + 1.5;
    if (elapsedReveal < myDelay) return;
    if (session.current_index !== reveal.index) return;
    if (advancingRef.current === reveal.index) return;
    advancingRef.current = reveal.index;

    const total = session.question_ids.length;
    if (session.current_index + 1 >= total) {
      if (mySlot === 1) void setSessionStatus(session.id, "done");
      finalizeAndNavigate();
      return;
    }
    // Clear reveal *before* awaiting so we don't re-fire while the round flips over.
    setReveal(null);
    submittedRef.current = new Set();
    void advanceIndex(session.id, reveal.index);
  }, [now, reveal, session, mySlot]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reconnect: refetch on visibility/online so realtime hiccups self-heal.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    async function resync() {
      if (cancelled || !session) return;
      try {
        const [fresh, freshAns] = await Promise.all([
          getSessionByCode(code),
          fetchAnswers(session.id),
        ]);
        if (cancelled) return;
        if (fresh) setSession(fresh);
        setAnswers(freshAns);
        log("presence", "resynced", { answers: freshAns.length });
      } catch (e) {
        log("session", "resync failed", { error: (e as Error).message });
      }
    }
    function onVisible() {
      if (document.visibilityState === "visible") void resync();
    }
    window.addEventListener("online", resync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("online", resync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session?.id, code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Inactivity detection — after each advance, check trailing skips
  useEffect(() => {
    if (!session) return;
    if (session.status === "abandoned") return;
    const idx = session.current_index;
    if (idx === 0) return;
    const skips1 = consecutiveSkipsForSlot(session.question_ids, idx, answers, 1);
    const skips2 = consecutiveSkipsForSlot(session.question_ids, idx, answers, 2);
    if (skips1 >= 3 || skips2 >= 3) {
      if (mySlot === 1) void setSessionStatus(session.id, "abandoned");
    }
  }, [session, answers, mySlot]);

  // Navigate on done
  useEffect(() => {
    if (session?.status === "done") finalizeAndNavigate();
  }, [session?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect to lobby if host lands here before partner joined
  useEffect(() => {
    if (session && (session.status === "waiting" || !session.partner_name)) {
      navigate({ to: "/lobby/$code", params: { code } });
    }
  }, [session?.status, session?.partner_name, code, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  function finalizeAndNavigate() {
    if (!session) return;
    const byId = new Map(questions.map((q) => [q.id, q]));
    const allAnswers: Answer[] = session.question_ids.map((qid) => {
      const a1 = answers.find((a) => a.question_id === qid && a.player_slot === 1);
      const a2 = answers.find((a) => a.question_id === qid && a.player_slot === 2);
      return {
        questionId: qid,
        p1: (a1?.choice ?? "SKIP") as Answer["p1"],
        p2: (a2?.choice ?? "SKIP") as Answer["p2"],
      };
    });
    const orderedQuestions = session.question_ids
      .map((id) => byId.get(id))
      .filter(Boolean) as Question[];
    const p1 = { name: session.creator_name, gender: session.creator_gender };
    const p2 = {
      name: session.partner_name ?? "Partner",
      gender: (session.partner_gender ?? "Other") as never,
    };
    const result = computeCompatibility(p1, p2, orderedQuestions, allAnswers);
    saveLastResult({ ...result, p1Name: p1.name, p2Name: p2.name, sessionCode: code });
    incrementSessions();
    navigate({ to: "/result" });
  }

  // ----- Render states -----

  if (loadingErr) {
    return (
      <PageBackdrop>
        <div className="px-6 pt-16 max-w-md mx-auto text-center">
          <Logo />
          <p className="mt-8 text-charcoal font-medium">{loadingErr}</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-6 py-3 text-sm font-semibold text-white shadow-soft"
          >
            Home
          </Link>
        </div>
      </PageBackdrop>
    );
  }

  if (!session || !currentQuestion) {
    return (
      <PageBackdrop>
        <div className="min-h-dvh grid place-items-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </PageBackdrop>
    );
  }

  if (session.status === "abandoned") {
    return (
      <PageBackdrop>
        <header className="px-6 pt-6 flex items-center justify-between max-w-2xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-charcoal/70">
            <ChevronLeft className="h-4 w-4" /> Home
          </Link>
          <Logo size="sm" />
          <span className="w-12" />
        </header>
        <section className="px-6 pt-12 max-w-md mx-auto text-center">
          <h1 className="font-display text-3xl font-semibold text-charcoal">
            Your partner appears to have left the session.
          </h1>
          <p className="mt-3 text-muted-foreground">
            You can start a new session when both participants are available.
          </p>
          <Link
            to="/setup"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-6 py-3 text-sm font-semibold text-white shadow-soft"
          >
            Start a new session
          </Link>
        </section>
      </PageBackdrop>
    );
  }

  if (session.status === "waiting" || !session.partner_name) {
    // Host accidentally landed here before partner joined — effect above redirects to lobby.
    return (
      <PageBackdrop>
        <div className="min-h-dvh grid place-items-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </PageBackdrop>
    );
  }

  const total = session.question_ids.length;
  const progress = ((session.current_index + (myAnswer ? 0.5 : 0)) / total) * 100;
  const partnerName = mySlot === 1 ? session.partner_name : session.creator_name;
  const inReveal = !!myAnswer && !!partnerAnswer;

  return (
    <PageBackdrop>
      <header className="px-6 pt-6 flex items-center justify-between max-w-2xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-charcoal/70 hover:text-charcoal"
        >
          <ChevronLeft className="h-4 w-4" /> Exit
        </Link>
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          {conn !== "connected" ? (
            <span
              title={conn === "connecting" ? "Connecting…" : "Reconnecting…"}
              className={`inline-block h-2 w-2 rounded-full ${conn === "connecting" ? "bg-amber-400 animate-pulse" : "bg-destructive animate-pulse"}`}
            />
          ) : null}
          <span className="text-sm text-muted-foreground tabular-nums">
            {session.current_index + 1} / {total}
          </span>
        </div>
      </header>

      <div className="px-6 mt-5 max-w-2xl mx-auto">
        <div className="h-1.5 rounded-full bg-white/70 overflow-hidden">
          <div
            className="h-full bg-primary-gradient transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {conn !== "connected" && (
        <div className="px-6 mt-3 max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-500 animate-fade-in">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
              <span>Connection lost. Reconnecting to partner...</span>
            </div>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="font-semibold underline uppercase tracking-wider hover:text-amber-800 disabled:opacity-50"
            >
              {isRetrying ? "Retrying..." : "Retry"}
            </button>
          </div>
        </div>
      )}

      <section className="px-6 mt-6 max-w-2xl mx-auto">
        <div className="glass-strong rounded-3xl p-6 sm:p-8 animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {currentQuestion.category}
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl text-charcoal">
                {currentQuestion.title}
              </h2>
              {currentQuestion.subtitle ? (
                <p className="mt-2 text-muted-foreground">{currentQuestion.subtitle}</p>
              ) : null}
            </div>
            {!inReveal && !myAnswer ? (
              <CircularTimer remaining={remaining} total={TIMER_SECONDS} />
            ) : null}
          </div>

          {inReveal ? (
            <RevealBlock
              question={currentQuestion}
              myName={
                me?.name ?? (mySlot === 1 ? session.creator_name : (session.partner_name ?? ""))
              }
              partnerName={partnerName ?? "Partner"}
              myChoice={myAnswer!.choice}
              partnerChoice={partnerAnswer!.choice}
            />
          ) : myAnswer ? (
            <WaitingBlock
              partnerName={partnerName ?? "your partner"}
              myChoiceLabel={
                myAnswer.choice === "SKIP"
                  ? "Skipped"
                  : myAnswer.choice === "A"
                    ? currentQuestion.optionA.label
                    : currentQuestion.optionB.label
              }
            />
          ) : (
            <div className="mt-6 grid gap-3">
              <ChoiceButton
                label={currentQuestion.optionA.label}
                onClick={() => choose("A")}
                disabled={isSubmitting}
              />
              <Divider />
              <ChoiceButton
                label={currentQuestion.optionB.label}
                onClick={() => choose("B")}
                disabled={isSubmitting}
              />
              <button
                onClick={() => choose("SKIP")}
                disabled={isSubmitting}
                className="mt-2 inline-flex items-center justify-center gap-1.5 self-center rounded-full px-4 py-2 text-xs font-medium text-muted-foreground hover:text-charcoal disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipForward className="h-3.5 w-3.5" /> Skip this one
              </button>
            </div>
          )}
        </div>
      </section>
    </PageBackdrop>
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
      className={`w-full rounded-2xl px-5 py-5 text-left text-base font-medium border transition ${
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
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        or
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function WaitingBlock({
  partnerName,
  myChoiceLabel,
}: {
  partnerName: string;
  myChoiceLabel: string;
}) {
  return (
    <div className="mt-6 rounded-2xl bg-white/70 border border-border p-5 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Locked in
      </p>
      <p className="mt-2 text-charcoal font-medium">{myChoiceLabel}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        Waiting for {partnerName}…
      </div>
    </div>
  );
}

function RevealBlock({
  question,
  myName,
  partnerName,
  myChoice,
  partnerChoice,
}: {
  question: Question;
  myName: string;
  partnerName: string;
  myChoice: "A" | "B" | "SKIP";
  partnerChoice: "A" | "B" | "SKIP";
}) {
  const labelFor = (c: "A" | "B" | "SKIP") =>
    c === "SKIP" ? "Skipped" : c === "A" ? question.optionA.label : question.optionB.label;
  const match = myChoice === partnerChoice && myChoice !== "SKIP";
  return (
    <div className="mt-6 animate-fade-in">
      <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {match ? "You matched ✨" : "Here's what you each picked"}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <RevealCard name={myName} label={labelFor(myChoice)} highlight={match} />
        <RevealCard name={partnerName} label={labelFor(partnerChoice)} highlight={match} />
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Next question in a moment…</p>
    </div>
  );
}
function RevealCard({
  name,
  label,
  highlight,
}: {
  name: string;
  label: string;
  highlight: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 border ${highlight ? "bg-primary-gradient text-white border-transparent shadow-soft" : "bg-white border-border"}`}
    >
      <p
        className={`text-[11px] font-medium uppercase tracking-widest ${highlight ? "text-white/80" : "text-muted-foreground"}`}
      >
        {name}
      </p>
      <p className={`mt-1 text-base font-medium ${highlight ? "text-white" : "text-charcoal"}`}>
        {label}
      </p>
    </div>
  );
}
