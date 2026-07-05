import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ChevronLeft, KeyRound } from "lucide-react";
import { Logo, PageBackdrop } from "@/components/Brand";
import { getSessionByCode } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/join")({
  head: () => ({ meta: [{ title: "Join a session — KnowEm" }] }),
  component: JoinLanding,
});

function JoinLanding() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length < 4) {
      toast.error("Enter the full code from your partner.");
      return;
    }
    setChecking(true);
    try {
      const s = await getSessionByCode(c);
      if (!s) {
        toast.error("Code not found. Double-check it with your partner.");
        setChecking(false);
        return;
      }
      navigate({ to: "/join_/$code", params: { code: c } });
    } catch {
      toast.error("Could not check that code right now.");
      setChecking(false);
    }
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
      <section className="px-6 pt-10 max-w-md mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-charcoal text-center">
          Join your partner's session
        </h1>
        <p className="mt-2 text-center text-muted-foreground">
          Enter the code your partner shared (looks like KNM-XXXX).
        </p>
        <form onSubmit={onSubmit} className="mt-8 glass rounded-3xl p-5 space-y-4">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1">
            <KeyRound className="h-3.5 w-3.5" /> Session code
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder="KNM-XXXX"
            maxLength={10}
            autoFocus
            inputMode="text"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full rounded-2xl border border-border bg-white/90 px-4 py-3 text-center text-2xl font-display font-semibold tracking-[0.24em] text-charcoal placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={checking}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
          >
            {checking ? (
              "Checking…"
            ) : (
              <>
                Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </section>
    </PageBackdrop>
  );
}
