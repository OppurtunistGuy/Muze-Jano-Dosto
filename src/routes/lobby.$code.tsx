import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, Copy, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { Logo, PageBackdrop } from "@/components/Brand";
import {
  getSessionByCode,
  setSessionStatus,
  subscribeSession,
  type SessionRow,
} from "@/lib/session";
import { getParticipant } from "@/lib/storage";

export const Route = createFileRoute("/lobby/$code")({
  head: () => ({ meta: [{ title: "Waiting for your partner — KnowEm" }] }),
  component: Lobby,
});

function Lobby() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conn, setConn] = useState<"connecting" | "connected" | "disconnected">("connecting");

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const s = await getSessionByCode(code);
        if (cancelled) return;
        if (!s) {
          setError("Session not found.");
          return;
        }
        setSession(s);
        if (s.status === "playing") {
          navigate({ to: "/play/$code", params: { code } });
          return;
        }
        if (s.status === "done") {
          navigate({ to: "/result" });
          return;
        }
        unsub = subscribeSession(
          s.id,
          (next) => {
            setSession(next);
            if (next.status === "playing") navigate({ to: "/play/$code", params: { code } });
            if (next.status === "done") navigate({ to: "/result" });
          },
          () => {},
          (status) => {
            if (!cancelled) setConn(status);
          },
        );
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not load session.");
      }
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [code, navigate]);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — long-press the link to copy.");
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "KnowEm", text: "Join my KnowEm session", url: shareUrl });
      } catch {
        /* dismissed */
      }
    } else {
      void copyLink();
    }
  }

  async function cancel() {
    if (!session) return;
    await setSessionStatus(session.id, "abandoned");
    navigate({ to: "/" });
  }

  const me = getParticipant(code);

  if (error) {
    return (
      <PageBackdrop>
        <header className="px-6 pt-6 flex items-center justify-between max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-charcoal/70">
            <ChevronLeft className="h-4 w-4" /> Home
          </Link>
          <Logo size="sm" />
          <span className="w-12" />
        </header>
        <div className="px-6 mt-12 max-w-md mx-auto text-center">
          <p className="text-charcoal font-medium">{error}</p>
          <Link
            to="/setup"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-6 py-3 text-sm font-semibold text-white shadow-soft"
          >
            Start a new session
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
        <Logo size="sm" />
        <span className="w-12" />
      </header>

      <section className="px-6 pt-8 max-w-md mx-auto text-center">
        <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium text-charcoal/70">
          <Users className="h-3.5 w-3.5 text-primary" /> Waiting for{" "}
          {me?.slot === 1 ? "your partner" : "the host"}…
        </span>
        <h1 className="mt-4 font-display text-3xl sm:text-4xl font-semibold text-charcoal">
          Share this with your partner
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          They'll join from any device — phone, laptop, anything.
        </p>

        <div className="mt-8 glass-strong rounded-3xl p-6">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Session code
          </p>
          <p className="mt-2 font-display text-5xl sm:text-6xl font-semibold tracking-[0.18em] text-charcoal select-all">
            {code}
          </p>
          <div className="mt-6 grid gap-2">
            <button
              onClick={copyLink}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-5 py-3 text-sm font-semibold text-white shadow-soft"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy share link
                </>
              )}
            </button>
            <button
              onClick={share}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white/70 px-5 py-3 text-sm font-semibold text-charcoal hover:bg-white"
            >
              <Share2 className="h-4 w-4" /> Share…
            </button>
            <p className="mt-2 break-all text-xs text-muted-foreground">{shareUrl}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex h-2.5 w-2.5">
            {conn === "connected" ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </>
            ) : conn === "connecting" ? (
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            ) : (
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
            )}
          </span>
          {conn === "connected" &&
            `Listening for ${session?.creator_name ? "their" : "your partner's"} join…`}
          {conn === "connecting" && "Connecting…"}
          {conn === "disconnected" && "Reconnecting…"}
        </div>

        <button onClick={cancel} className="mt-8 text-xs text-muted-foreground underline">
          Cancel session
        </button>
      </section>
    </PageBackdrop>
  );
}
