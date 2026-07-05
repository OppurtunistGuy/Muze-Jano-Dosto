import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ChevronLeft, Heart, KeyRound, Smartphone, Wifi } from "lucide-react";
import { setupSchema } from "@/lib/schema";
import { GENDERS, type Gender } from "@/lib/types";
import { loadQuestions } from "@/lib/storage";
import { pickRandomQuestions } from "@/lib/compatibility";
import { savePlay, clearPlay } from "@/lib/playSession";
import { createSession } from "@/lib/session";
import { Logo, PageBackdrop } from "@/components/Brand";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Set up — KnowEm" },
      { name: "description", content: "Enter both names to start your session." },
    ],
  }),
  component: Setup,
});

interface PField {
  name: string;
  gender: Gender;
}

function Setup() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"pass-device" | "remote">("pass-device");
  const [p1, setP1] = useState<PField>({ name: "", gender: "Male" });
  const [p2, setP2] = useState<PField>({ name: "", gender: "Female" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (mode === "remote") {
      if (p1.name.trim().length < 2) {
        setErrors({ "player1.name": "Enter your name." });
        return;
      }
      setSubmitting(true);
      try {
        const all = loadQuestions();
        const picked = pickRandomQuestions(all, 15);
        const row = await createSession({
          creatorName: p1.name.trim(),
          creatorGender: p1.gender,
          questionIds: picked.map((q) => q.id),
        });
        navigate({ to: "/lobby/$code", params: { code: row.code } });
      } catch (err) {
        setErrors({ remote: (err as Error).message || "Couldn't create session." });
        setSubmitting(false);
      }
      return;
    }
    const parsed = setupSchema.safeParse({ player1: p1, player2: p2 });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!map[key]) map[key] = issue.message;
      }
      setErrors(map);
      return;
    }
    const all = loadQuestions();
    const picked = pickRandomQuestions(all, 15);
    clearPlay();
    savePlay({
      p1: parsed.data.player1,
      p2: parsed.data.player2,
      startedAt: Date.now(),
      level: 1,
      mode: "pass-device",
      l1QuestionIds: picked.map((q) => q.id),
      l1Answers: [],
    });
    navigate({ to: "/game" });
  }

  const ready =
    mode === "remote"
      ? p1.name.trim().length >= 2
      : p1.name.trim().length >= 2 &&
        p2.name.trim().length >= 2 &&
        p1.name.trim().toLowerCase() !== p2.name.trim().toLowerCase();

  return (
    <PageBackdrop>
      <header className="px-6 pt-6 flex items-center justify-between max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-charcoal/70 hover:text-charcoal"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <Logo />
        <span className="w-12" />
      </header>

      <section className="px-6 pt-8 pb-10 max-w-2xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-charcoal text-center">
          Who's playing?
        </h1>
        <p className="mt-2 text-center text-muted-foreground">
          Pass the device — or play remotely from two devices.
        </p>

        {/* Mode toggle */}
        <div className="mt-6 grid grid-cols-2 gap-2 max-w-md mx-auto rounded-full glass p-1">
          <ModeTab
            active={mode === "pass-device"}
            onClick={() => setMode("pass-device")}
            icon={<Smartphone className="h-4 w-4" />}
            label="Pass the device"
          />
          <ModeTab
            active={mode === "remote"}
            onClick={() => setMode("remote")}
            icon={<Wifi className="h-4 w-4" />}
            label="Remote play"
          />
        </div>

        {ready && mode === "pass-device" ? (
          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-3 rounded-full glass px-5 py-2.5 text-base font-display text-charcoal">
              <span>{p1.name.trim()}</span>
              <Heart className="h-4 w-4 text-primary" fill="currentColor" />
              <span>{p2.name.trim()}</span>
            </span>
          </div>
        ) : null}

        <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-4 sm:grid-cols-2">
          <PlayerCard
            label={mode === "remote" ? "Your name" : "First player"}
            value={p1}
            setValue={setP1}
            error={errors["player1.name"]}
            placeholder="e.g. Rahul"
          />
          {mode === "pass-device" ? (
            <PlayerCard
              label="Second player"
              value={p2}
              setValue={setP2}
              error={
                errors["player2.name"] ?? (errors["player2"] ? "Names cannot match" : undefined)
              }
              placeholder="e.g. Priya"
            />
          ) : (
            <div className="glass rounded-3xl p-5 text-sm text-muted-foreground sm:col-span-1">
              <p className="font-medium text-charcoal mb-1">Remote play</p>
              We'll generate a share code. Send it to your partner and they'll join from any device.
            </div>
          )}

          {errors.remote ? (
            <p className="sm:col-span-2 text-sm text-destructive text-center">{errors.remote}</p>
          ) : null}

          <button
            type="submit"
            disabled={!ready || submitting}
            className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-romance px-6 py-3.5 text-sm font-semibold text-white shadow-glow-purple transition hover:opacity-95 disabled:opacity-50"
          >
            {submitting ? (
              "Creating…"
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

          <div className="sm:col-span-2 flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              already have a code?
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Link
            to="/join"
            className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white/80 px-6 py-3 text-sm font-semibold text-charcoal hover:bg-white"
          >
            <KeyRound className="h-4 w-4" /> Join with a code
          </Link>
        </form>
      </section>
    </PageBackdrop>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-gradient-romance text-white shadow-glow-purple" : "text-charcoal/70 hover:text-charcoal"}`}
    >
      {icon} {label}
    </button>
  );
}

function PlayerCard({
  label,
  value,
  setValue,
  error,
  placeholder,
}: {
  label: string;
  value: PField;
  setValue: (v: PField) => void;
  error?: string;
  placeholder: string;
}) {
  return (
    <div className="glass rounded-3xl p-5">
      <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </label>
      <input
        value={value.name}
        onChange={(e) => setValue({ ...value, name: e.target.value })}
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
              type="button"
              key={g}
              onClick={() => setValue({ ...value, gender: g })}
              aria-pressed={value.gender === g}
              className={`flex-1 rounded-full px-3 py-2 text-xs font-medium transition border ${
                value.gender === g
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
