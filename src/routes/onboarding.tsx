import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  Heart,
  Sparkles,
  Users,
  Smartphone,
  Wifi,
  Lock,
} from "lucide-react";
import { Logo, PageBackdrop } from "@/components/Brand";
import { GENDERS, type Gender } from "@/lib/types";
import { loadQuestions } from "@/lib/storage";
import { pickRandomQuestions } from "@/lib/compatibility";
import { clearPlay, savePlay } from "@/lib/playSession";
import { createSession } from "@/lib/session";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — KnowEm" }] }),
  component: Onboarding,
});

type Mode = "pass-device" | "remote";

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(4);
  const [mode, setMode] = useState<Mode>("pass-device");
  const [p1Name, setP1Name] = useState("");
  const [p1Gender, setP1Gender] = useState<Gender>("Male");
  const [p2Name, setP2Name] = useState("");
  const [p2Gender, setP2Gender] = useState<Gender>("Female");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mark onboarded so we don't redirect again
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("knowem.onboarded", "1");
      } catch {
        /* ignore */
      }
    }
  }, []);

  const namesValid = (() => {
    const a = p1Name.trim();
    const b = p2Name.trim();
    if (mode === "remote") return a.length >= 2;
    if (a.length < 2 || b.length < 2) return false;
    if (a.toLowerCase() === b.toLowerCase()) return false;
    return true;
  })();

  async function finish() {
    if (!namesValid) return;
    setError(null);
    setSubmitting(true);
    try {
      const all = loadQuestions();
      const picked = pickRandomQuestions(all, 15);
      if (mode === "pass-device") {
        clearPlay();
        savePlay({
          p1: { name: p1Name.trim(), gender: p1Gender },
          p2: { name: p2Name.trim(), gender: p2Gender },
          startedAt: Date.now(),
          level: 1,
          mode: "pass-device",
          l1QuestionIds: picked.map((q) => q.id),
          l1Answers: [],
        });
        navigate({ to: "/game" });
      } else {
        const row = await createSession({
          creatorName: p1Name.trim(),
          creatorGender: p1Gender,
          questionIds: picked.map((q) => q.id),
        });
        navigate({ to: "/lobby/$code", params: { code: row.code } });
      }
    } catch (e) {
      setError((e as Error).message || "Couldn't start. Try again.");
      setSubmitting(false);
    }
  }

  function next() {
    setStep((s) => Math.min(5, s + 1));
  }
  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  return (
    <PageBackdrop>
      <header className="px-5 pt-5 flex items-center justify-between max-w-2xl mx-auto text-charcoal">
        {step > 4 ? (
          <button
            onClick={back}
            className="inline-flex items-center gap-1 text-sm text-charcoal/70 hover:text-charcoal bg-transparent border-none cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-charcoal/70 hover:text-charcoal"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
        )}
        <Logo size="sm" />
        <span className="text-xs text-muted-foreground tabular-nums">{step}/5</span>
      </header>

      <div className="px-5 max-w-2xl mx-auto mt-3">
        <div className="h-1 rounded-full bg-white/70 overflow-hidden">
          <div
            className="h-full bg-gradient-romance transition-all duration-500"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      <section className="px-5 pt-6 pb-10 max-w-xl mx-auto">
        {step === 1 ? <Welcome onNext={next} /> : null}
        {step === 2 ? <HowItWorks onNext={next} /> : null}
        {step === 3 ? <ThreeLevels onNext={next} /> : null}
        {step === 4 ? <ChooseMode mode={mode} setMode={setMode} onNext={next} /> : null}
        {step === 5 ? (
          <EnterNames
            mode={mode}
            p1Name={p1Name}
            setP1Name={setP1Name}
            p1Gender={p1Gender}
            setP1Gender={setP1Gender}
            p2Name={p2Name}
            setP2Name={setP2Name}
            p2Gender={p2Gender}
            setP2Gender={setP2Gender}
            valid={namesValid}
            submitting={submitting}
            error={error}
            onFinish={finish}
          />
        ) : null}
      </section>
    </PageBackdrop>
  );
}

function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center animate-rise">
      <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-romance shadow-glow-purple animate-float-soft">
        <Heart className="h-9 w-9 text-white" fill="currentColor" />
      </div>
      <h1 className="mt-6 font-display text-4xl sm:text-5xl font-semibold text-charcoal">
        Welcome to <span className="text-gradient-romance">KnowEm</span>
      </h1>
      <p className="mt-3 text-base text-muted-foreground max-w-md mx-auto">
        A relationship discovery game for two. Honest choices, real conversations, meaningful
        insights.
      </p>
      <button
        onClick={onNext}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-romance px-7 py-3.5 text-sm font-semibold text-white shadow-glow-purple"
      >
        Begin <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function HowItWorks({ onNext }: { onNext: () => void }) {
  const steps = [
    {
      icon: Heart,
      title: "Answer privately",
      body: "Each of you picks honestly. Answers stay hidden until both are in.",
    },
    {
      icon: Sparkles,
      title: "Reveal together",
      body: "See what you matched on — and what you didn't.",
    },
    {
      icon: Users,
      title: "Talk about the gaps",
      body: "The conversation is the point. We just hand you the door.",
    },
  ];
  return (
    <div className="animate-rise">
      <h1 className="font-display text-3xl text-charcoal text-center">How it works</h1>
      <div className="mt-7 grid gap-3">
        {steps.map((s, i) => (
          <div key={s.title} className="glass rounded-3xl p-5 flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-romance text-white shadow-glow-purple">
              <s.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Step {i + 1}
              </p>
              <h3 className="font-display text-lg text-charcoal">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-romance px-7 py-3.5 text-sm font-semibold text-white shadow-glow-purple"
      >
        Next <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ThreeLevels({ onNext }: { onNext: () => void }) {
  const levels = [
    {
      num: "1",
      emoji: "✨",
      title: "Discover Your Vibe",
      body: "15 this-or-that questions. The small stuff that quietly tells the bigger story.",
      tint: "bg-gradient-romance text-white",
    },
    {
      num: "2",
      emoji: "🎲",
      title: "Explore Deeper",
      body: "Roll the category dice. Six themes, open prompts, real conversation.",
      tint: "glass text-charcoal",
    },
    {
      num: "3",
      emoji: "🔥",
      title: "Truth, Teasing & Hot",
      body: "Three tiers. Consent required. Suggestive, never explicit.",
      tint: "bg-gradient-aurora text-white",
    },
  ];
  return (
    <div className="animate-rise">
      <h1 className="font-display text-3xl text-charcoal text-center">
        Three levels of connection
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Light to deep, at your own pace. Stop whenever feels right.
      </p>
      <div className="mt-6 grid gap-3">
        {levels.map((l) => (
          <div key={l.num} className={`rounded-3xl p-5 shadow-card ${l.tint}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{l.emoji}</span>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-75">
                  Level {l.num}
                </p>
                <h3 className="font-display text-xl">{l.title}</h3>
              </div>
            </div>
            <p className="mt-2 text-sm opacity-90">{l.body}</p>
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-romance px-7 py-3.5 text-sm font-semibold text-white shadow-glow-purple"
      >
        Next <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ChooseMode({
  mode,
  setMode,
  onNext,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  onNext: () => void;
}) {
  return (
    <div className="animate-rise">
      <h1 className="font-display text-3xl text-charcoal text-center">Choose your play mode</h1>
      <div className="mt-6 grid gap-3">
        <ModeCard
          active={mode === "pass-device"}
          onClick={() => setMode("pass-device")}
          icon={<Smartphone className="h-5 w-5" />}
          title="Pass the device"
          body="One phone. Answer privately, pass it to your partner, reveal together."
        />
        <ModeCard
          active={mode === "remote"}
          onClick={() => setMode("remote")}
          icon={<Wifi className="h-5 w-5" />}
          title="Remote play"
          body="Two devices, two locations. Share a code, answer in sync."
          badge={
            <span className="inline-flex items-center gap-1 text-[10px] text-charcoal/60">
              <Lock className="h-3 w-3" /> Private channel
            </span>
          }
        />
      </div>
      <button
        onClick={onNext}
        className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-romance px-7 py-3.5 text-sm font-semibold text-white shadow-glow-purple"
      >
        Next <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  body,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`w-full text-left rounded-3xl p-5 transition border ${active ? "bg-gradient-romance text-white border-transparent shadow-glow-purple" : "glass border-border text-charcoal hover:shadow-soft"}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${active ? "bg-white/20 text-white" : "bg-white text-primary"}`}
        >
          {icon}
        </span>
        <div className="flex-1">
          <h3 className="font-display text-lg">{title}</h3>
          {badge ? <div className="mt-0.5">{badge}</div> : null}
        </div>
      </div>
      <p className={`mt-2 text-sm ${active ? "text-white/90" : "text-muted-foreground"}`}>{body}</p>
    </button>
  );
}

function EnterNames(props: {
  mode: Mode;
  p1Name: string;
  setP1Name: (s: string) => void;
  p1Gender: Gender;
  setP1Gender: (g: Gender) => void;
  p2Name: string;
  setP2Name: (s: string) => void;
  p2Gender: Gender;
  setP2Gender: (g: Gender) => void;
  valid: boolean;
  submitting: boolean;
  error: string | null;
  onFinish: () => void;
}) {
  const {
    mode,
    p1Name,
    setP1Name,
    p1Gender,
    setP1Gender,
    p2Name,
    setP2Name,
    p2Gender,
    setP2Gender,
    valid,
    submitting,
    error,
    onFinish,
  } = props;
  const dup =
    mode === "pass-device" &&
    p1Name.trim().length >= 2 &&
    p1Name.trim().toLowerCase() === p2Name.trim().toLowerCase();

  return (
    <div className="animate-rise">
      <h1 className="font-display text-3xl text-charcoal text-center">
        {mode === "remote" ? "Who's hosting?" : "Who's playing?"}
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {mode === "remote"
          ? "We'll create a code your partner can join with."
          : "Both names, no duplicates."}
      </p>

      <div className="mt-6 grid gap-3">
        <PlayerCard
          label={mode === "remote" ? "Your name" : "First player"}
          name={p1Name}
          setName={setP1Name}
          gender={p1Gender}
          setGender={setP1Gender}
          placeholder="e.g. Rahul"
        />
        {mode === "pass-device" ? (
          <PlayerCard
            label="Second player"
            name={p2Name}
            setName={setP2Name}
            gender={p2Gender}
            setGender={setP2Gender}
            placeholder="e.g. Priya"
            error={dup ? "Names cannot match." : undefined}
          />
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-destructive text-center">{error}</p> : null}

      <button
        disabled={!valid || submitting}
        onClick={onFinish}
        className="mt-7 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-romance px-7 py-3.5 text-sm font-semibold text-white shadow-glow-purple disabled:opacity-50"
      >
        {submitting ? (
          "Starting…"
        ) : mode === "remote" ? (
          <>
            Create remote game <ArrowRight className="h-4 w-4" />
          </>
        ) : (
          <>
            Start Level 1 <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}

function PlayerCard({
  label,
  name,
  setName,
  gender,
  setGender,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  setName: (s: string) => void;
  gender: Gender;
  setGender: (g: Gender) => void;
  placeholder: string;
  error?: string;
}) {
  return (
    <div className="glass rounded-3xl p-5">
      <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        maxLength={30}
        aria-invalid={!!error}
        className="mt-2 w-full rounded-2xl border border-border bg-white/95 px-4 py-3 text-base text-charcoal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <fieldset className="mt-4">
        <legend className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Gender
        </legend>
        <div className="mt-2 flex gap-2">
          {GENDERS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              aria-pressed={gender === g}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-medium transition border ${
                gender === g
                  ? "bg-gradient-romance text-white border-transparent shadow-glow-purple"
                  : "bg-white/70 text-charcoal border-border hover:bg-white"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
