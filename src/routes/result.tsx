import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Heart,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  Flame,
  MessageSquareHeart,
} from "lucide-react";
import { loadLastResult, type StoredResult } from "@/lib/storage";
import { SEED_QUESTIONS } from "@/lib/questions.seed";
import { Logo, PageBackdrop } from "@/components/Brand";
import { Footer } from "@/components/Footer";
import { loadPlay } from "@/lib/playSession";

export const Route = createFileRoute("/result")({
  head: () => ({ meta: [{ title: "Your alignment — KnowEm" }] }),
  component: Result,
});

function MountainIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <path d="M20 80 L50 30 L80 80 Z" fill="currentColor" opacity="0.8" />
      <path d="M40 80 L65 45 L90 80 Z" fill="currentColor" opacity="0.6" />
      <path d="M50 30 L55 38 L45 42 Z" fill="#fff" />
      <path d="M65 45 L70 52 L60 56 Z" fill="#fff" />
    </svg>
  );
}

function getArchetype(score: number) {
  if (score >= 65) {
    return {
      title: "Adventure Partners",
      desc: "Every adventure unlocks a deeper level of us.",
      gradient: "from-[#8E65C5] to-[#FF6B8B]",
    };
  } else {
    return {
      title: "Curious Explorers",
      desc: "Intrigued by differences and exploring new paths together.",
      gradient: "from-[#047857] to-[#065f46]",
    };
  }
}

function Result() {
  const navigate = useNavigate();
  const [data, setData] = useState<StoredResult | null>(null);
  const [l3P1Vote, setL3P1Vote] = useState<boolean | null>(null);
  const [l3P2Vote, setL3P2Vote] = useState<boolean | null>(null);
  const session = useMemo(() => loadPlay(), []);

  useEffect(() => {
    if (session && session.level && session.level < 2) {
      navigate({ to: "/level-1-complete", replace: true });
      return;
    }
    const r = loadLastResult();
    if (!r) {
      navigate({ to: "/onboarding" });
      return;
    }
    setData(r);
  }, [navigate, session]);

  if (!data || !session) {
    return (
      <PageBackdrop>
        <div className="min-h-dvh grid place-items-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </PageBackdrop>
    );
  }

  const archetype = getArchetype(data.score);
  const progressVal = Math.max(10, Math.min(68, Math.round(data.score * 0.48)));

  return (
    <PageBackdrop>
      <div className="min-h-dvh bg-gradient-to-b from-[#FAF8FF] via-[#F3EDFF] to-[#FAF8FF] text-charcoal pb-12 flex flex-col justify-between">
        <div>
          <header className="px-6 pt-6 flex items-center justify-between max-w-5xl mx-auto w-full">
            <Logo size="sm" />
            <div className="text-sm font-semibold text-charcoal/70">
              {data.p1Name} &amp; {data.p2Name} · 4 July 2026
            </div>
            <button
              onClick={() => navigate({ to: "/onboarding" })}
              className="inline-flex items-center gap-1 text-sm text-charcoal/70 hover:text-charcoal cursor-pointer bg-transparent border-none"
            >
              <RotateCcw className="h-4 w-4" /> Play Again
            </button>
          </header>

          <main className="max-w-5xl mx-auto px-6 mt-6 flex flex-col gap-6">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              <div className="rounded-2xl bg-white p-4 border border-neutral-100 flex flex-col gap-1 shadow-sm text-center">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">ALIGNMENT SCORE</span>
                <span className="text-3xl font-extrabold text-emerald-500 tracking-tight font-display">{data.score}%</span>
                <span className="text-[9px] text-neutral-500">More in sync than you'd guess</span>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-neutral-100 flex flex-col gap-1 shadow-sm text-center">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">L1 BASICS</span>
                <span className="text-3xl font-extrabold text-purple-600 tracking-tight font-display">15</span>
                <span className="text-[9px] text-neutral-500">Vibes explored</span>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-neutral-100 flex flex-col gap-1 shadow-sm text-center">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">L2 TOPICS</span>
                <span className="text-3xl font-extrabold text-blue-500 tracking-tight font-display">0</span>
                <span className="text-[9px] text-neutral-500">Deep discussions</span>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-neutral-100 flex flex-col gap-1 shadow-sm text-center">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">L3 INTIMACY</span>
                <span className="text-3xl font-extrabold text-rose-500 tracking-tight font-display">20</span>
                <span className="text-[9px] text-neutral-500">Wild &amp; Truth cards</span>
              </div>
            </div>

            {/* Timeline Banner */}
            <div className={`rounded-3xl p-6 sm:p-8 bg-gradient-to-r ${archetype.gradient} text-white shadow-card-lift grid grid-cols-1 md:grid-cols-3 gap-6 items-center`}>
              <div className="md:col-span-2 flex flex-col gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">YOUR JOURNEY SO FAR</p>
                  <h2 className="font-display text-3xl font-extrabold mt-1 tracking-tight">{archetype.title}</h2>
                  <p className="text-sm text-white/80 mt-1">{archetype.desc}</p>
                </div>

                {/* Timeline Nodes */}
                <div className="flex items-center justify-between gap-2 max-w-md mt-2">
                  <div className="flex flex-col items-center text-center w-24">
                    <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/50 relative shadow-inner">
                      <MountainIcon className="h-10 w-10 text-white" />
                    </div>
                    <span className="font-bold text-xs mt-2">Foundation</span>
                    <span className="text-[9px] text-white/70">You're building a strong base</span>
                  </div>

                  <div className="flex-1 h-[2px] bg-white opacity-60" />

                  <div className="flex flex-col items-center text-center w-24">
                    <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/50 relative shadow-inner">
                      <MountainIcon className="h-10 w-10 text-white" />
                    </div>
                    <span className="font-bold text-xs mt-2">Exploring</span>
                    <span className="text-[9px] text-white/70">Explore deeper topics together</span>
                  </div>

                  <div className="flex-1 h-0 border-t-2 border-dashed border-white/40" />

                  <div className="flex flex-col items-center text-center w-24 opacity-60">
                    <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center border-2 border-dashed border-white/35 relative">
                      <Lock className="h-6 w-6 text-white/80" />
                    </div>
                    <span className="font-bold text-xs mt-2">Peak</span>
                    <span className="text-[8px] text-white/75">Unlocks when L3 alignment reaches 70%</span>
                  </div>
                </div>
              </div>

              {/* Sidebar Unlock Card */}
              <div className="bg-white text-charcoal rounded-3xl p-5 shadow-lg flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-neutral-400" />
                  <span className="text-xs font-bold text-neutral-700">How to unlock Peak</span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Reach 70% or more in L3 Intimacy to unlock the deepest level.
                </p>
                <div className="border-t border-neutral-100 pt-3 flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-neutral-800">Current L3 Progress</span>
                  <span className="text-3xl font-extrabold text-orange-500 tracking-tight">{progressVal}%</span>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${progressVal}%` }} />
                  </div>
                  <span className="text-[9px] text-neutral-400 mt-1">Keep going, you're getting closer!</span>
                </div>
              </div>
            </div>

            {/* Progression Gateway */}
            <div className="rounded-[2rem] glass-strong p-6 shadow-card border border-border/30 flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2.5 py-0.5 rounded-full">Intimacy Checkpoint</span>
              <h3 className="font-display text-xl font-bold text-charcoal text-center mt-2 mb-4">Unlock Level 3: Truth, Teasing &amp; Hot?</h3>

              {l3P1Vote === false || l3P2Vote === false ? (
                <div className="w-full text-center p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 animate-fade-in">
                  <Heart className="h-8 w-8 text-primary mx-auto animate-pulse" fill="currentColor" />
                  <h4 className="font-display text-lg font-bold text-charcoal mt-3">Goodbye &amp; Thank You!</h4>
                  <p className="mt-2 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Thank you for playing KnowEm. We hope these conversations brought you closer together. Take this moment to reflect on what you've learned. Goodbye! ❤️
                  </p>
                  <Link
                    to="/"
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-5 py-2 text-xs font-semibold text-charcoal hover:bg-neutral-50 active:scale-95 transition"
                  >
                    Return Home
                  </Link>
                </div>
              ) : (
                <div className="w-full max-w-md flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-border/50">
                    <span className="text-xs font-semibold text-charcoal">{data.p1Name}'s Choice:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setL3P1Vote(true)}
                        className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold transition ${
                          l3P1Vote === true ? "bg-green-500 text-white shadow-sm" : "bg-neutral-100 text-charcoal hover:bg-neutral-200"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setL3P1Vote(false)}
                        className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold transition ${
                          l3P1Vote === false ? "bg-red-500 text-white shadow-sm" : "bg-neutral-100 text-charcoal hover:bg-neutral-200"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-border/50">
                    <span className="text-xs font-semibold text-charcoal">{data.p2Name}'s Choice:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setL3P2Vote(true)}
                        className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold transition ${
                          l3P2Vote === true ? "bg-green-500 text-white shadow-sm" : "bg-neutral-100 text-charcoal hover:bg-neutral-200"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setL3P2Vote(false)}
                        className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold transition ${
                          l3P2Vote === false ? "bg-red-500 text-white shadow-sm" : "bg-neutral-100 text-charcoal hover:bg-neutral-200"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {l3P1Vote === true && l3P2Vote === true && (
                    <Link
                      to="/level-3"
                      className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-romance px-6 py-3.5 text-xs font-bold text-white shadow-glow-purple hover:scale-[1.01] active:scale-[0.99] transition duration-200 animate-rise"
                    >
                      Enter the Peak (Level 3) <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
        <Footer />
      </div>
    </PageBackdrop>
  );
}
