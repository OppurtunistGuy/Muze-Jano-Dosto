import { useState } from "react";
import { Mail, Check } from "lucide-react";
import { toast } from "sonner";
import { joinWaitlist, type WaitlistSource } from "@/lib/waitlist";
import { hasSubmittedWaitlist } from "@/lib/storage";

interface Props {
  source: WaitlistSource;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  compact?: boolean;
}

export function WaitlistForm({
  source,
  title = "Get early access",
  subtitle = "We'll email you the moment new levels unlock.",
  buttonLabel = "Notify Me",
  compact = false,
}: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<boolean>(() => hasSubmittedWaitlist(source));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || done) return;
    setSubmitting(true);
    const res = await joinWaitlist(email, source);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setDone(true);
    toast.success("You're on the list ✨");
  }

  if (done) {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-full bg-white/80 border border-border px-4 py-3 text-sm font-medium text-charcoal ${compact ? "" : "mt-4"}`}
      >
        <Check className="h-4 w-4 text-primary" /> You're on the list — we'll be in touch.
      </div>
    );
  }

  return (
    <div className={compact ? "" : "mt-2"}>
      {!compact && (
        <>
          <h3 className="font-display text-lg text-charcoal">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </>
      )}
      <form onSubmit={onSubmit} className="mt-3 flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Email address</span>
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={255}
            className="w-full rounded-full border border-border bg-white/90 pl-9 pr-4 py-3 text-sm text-charcoal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-5 py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
        >
          {submitting ? "Saving…" : buttonLabel}
        </button>
      </form>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Just your email. No spam, no third-party sharing.
      </p>
    </div>
  );
}
