import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, Heart } from "lucide-react";
import { z } from "zod";
import { Logo, PageBackdrop } from "@/components/Brand";
import { GENDERS, type Gender } from "@/lib/types";
import { getSessionByCode, joinSession, type SessionRow } from "@/lib/session";
import { toast } from "sonner";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(30, "Name must be 30 characters or fewer")
  .refine((v) => !/^\d+$/.test(v), "Name cannot be numbers only");

export const Route = createFileRoute("/join_/$code")({
  head: () => ({ meta: [{ title: "Join — KnowEm" }] }),
  component: JoinPartner,
});

function JoinPartner() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("Male");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSessionByCode(code);
        if (!s) {
          setError("Session not found. Ask your partner for a fresh link.");
          setLoading(false);
          return;
        }
        if (s.status === "abandoned") {
          setError("This session has ended.");
          setLoading(false);
          return;
        }
        if (s.status === "done") {
          setError("This session is already complete.");
          setLoading(false);
          return;
        }
        if (s.partner_name && s.status === "playing") {
          // Already joined — go straight to play
          navigate({ to: "/play/$code", params: { code } });
          return;
        }
        setSession(s);
      } catch {
        setError("Could not load the session.");
      }
      setLoading(false);
    })();
  }, [code, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid name");
      return;
    }
    setSubmitting(true);
    try {
      await joinSession({ code, partnerName: parsed.data, partnerGender: gender });
      navigate({ to: "/play/$code", params: { code } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PageBackdrop>
        <div className="min-h-dvh grid place-items-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </PageBackdrop>
    );
  }
  if (error) {
    return (
      <PageBackdrop>
        <div className="px-6 pt-16 max-w-md mx-auto text-center">
          <Logo />
          <p className="mt-8 text-charcoal font-medium">{error}</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-6 py-3 text-sm font-semibold text-white shadow-soft"
          >
            Go home
          </Link>
        </div>
      </PageBackdrop>
    );
  }

  return (
    <PageBackdrop>
      <header className="px-6 pt-6 flex items-center justify-between max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-charcoal/70 hover:text-charcoal"
        >
          <ChevronLeft className="h-4 w-4" /> Home
        </Link>
        <Logo />
        <span className="w-12" />
      </header>

      <section className="px-6 pt-8 max-w-md mx-auto">
        <p className="text-center text-sm text-muted-foreground">
          <span className="font-medium text-charcoal">{session?.creator_name}</span> invited you to
          play KnowEm
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-charcoal text-center">
          Join the session
        </h1>

        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
          <div className="glass rounded-3xl p-5">
            <label
              htmlFor="partner-name"
              className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
            >
              Your name
            </label>
            <input
              id="partner-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul"
              maxLength={30}
              className="mt-2 w-full rounded-2xl border border-border bg-white/90 px-4 py-3 text-base text-charcoal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <fieldset className="mt-4">
              <legend className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Gender
              </legend>
              <div className="mt-2 flex gap-2">
                {GENDERS.map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => setGender(g)}
                    aria-pressed={gender === g}
                    className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition border ${
                      gender === g
                        ? "bg-primary-gradient text-white border-transparent shadow-soft"
                        : "bg-white/70 text-charcoal border-border hover:bg-white"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {name && session?.creator_name ? (
            <p className="text-center text-sm text-charcoal/80 font-medium">
              {session.creator_name} <span className="text-primary">❤</span> {name.trim()}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
          >
            {submitting ? (
              "Joining…"
            ) : (
              <>
                Join & play <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          <p className="text-center text-xs text-muted-foreground inline-flex items-center justify-center gap-1.5 w-full">
            <Heart className="h-3 w-3 text-primary" fill="currentColor" /> We only collect your
            first name to make it feel personal.
          </p>
        </form>
      </section>
    </PageBackdrop>
  );
}
