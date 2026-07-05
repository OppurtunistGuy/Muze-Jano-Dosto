import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  ArrowRight,
  ChevronLeft,
  Heart,
  MessageSquareHeart,
  Sparkles,
  Share2,
  RotateCcw,
  Flame,
  CheckCircle2,
  Lock,
  Star
} from "lucide-react";
import { Logo, PageBackdrop } from "@/components/Brand";
import { Footer } from "@/components/Footer";
import { clearPlay, loadPlay } from "@/lib/playSession";
import { SEED_QUESTIONS } from "@/lib/questions.seed";
import { computeInsights, type PartnerInsights } from "@/lib/partnerInsights";
import { log } from "@/lib/log";
import { toast } from "sonner";

export const Route = createFileRoute("/complete")({
  head: () => ({ meta: [{ title: "What we learned — KnowEm" }] }),
  component: Complete,
});

function Complete() {
  const navigate = useNavigate();
  const session = useMemo(() => loadPlay(), []);

  useEffect(() => {
    if (session && session.level && session.level < 3) {
      if (session.level === 1) {
        navigate({ to: "/level-1-complete", replace: true });
      } else if (session.level === 2) {
        navigate({ to: "/result", replace: true });
      }
    }
  }, [session, navigate]);

  if (!session) {
    return (
      <PageBackdrop>
        <div className="min-h-dvh grid place-items-center p-6 text-center">
          <div className="glass-strong rounded-3xl p-7 max-w-sm shadow-card-lift">
            <h1 className="font-display text-2xl text-charcoal">Nothing to wrap up yet.</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Finish Level 1, 2, and 3 first to generate your full insights report.
            </p>
            <Link
              to="/onboarding"
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-romance px-5 py-3.5 text-sm font-semibold text-white shadow-soft"
            >
              Start fresh <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </PageBackdrop>
    );
  }

  function handlePlayAgain() {
    clearPlay();
    navigate({ to: "/onboarding" });
  }

  return (
    <PageBackdrop>
      <div className="min-h-dvh bg-gradient-to-b from-[#FAF8FF] via-[#F3EDFF] to-[#FAF8FF] text-charcoal pb-16 flex flex-col justify-between">
        <header className="px-6 pt-6 flex items-center justify-between max-w-6xl mx-auto w-full">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-charcoal/70 hover:text-charcoal"
          >
            <ChevronLeft className="h-4 w-4" /> Home
          </Link>
          <Logo size="sm" />
          <span className="w-10" />
        </header>

        <main className="max-w-6xl mx-auto px-6 mt-6">
          <WrappedSummary session={session} onPlayAgain={handlePlayAgain} />
        </main>
      </div>
    </PageBackdrop>
  );
}

function SegmentedDonutChart({ score, stats }: { score: number; stats: { category: string; pct: number }[] }) {
  const size = 180;
  const stroke = 12;
  const center = size / 2;
  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {stats.map((stat, i) => {
            const radius = 80 - i * 12;
            const c = 2 * Math.PI * radius;
            const offset = c - (stat.pct / 100) * c;
            const color = categoryColors[stat.category] || "#94a3b8";
            return (
              <g key={stat.category}>
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="#f3f4f6"
                  strokeWidth={stroke - 2}
                  fill="none"
                  className="opacity-40"
                />
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${center} ${center})`}
                  style={{ transition: "stroke-dashoffset 1s ease-out" }}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Overall Alignment</span>
          <span className="text-4xl font-extrabold text-charcoal tracking-tight">{score}%</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
        {stats.map((stat) => (
          <div key={stat.category} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: categoryColors[stat.category] || "#94a3b8" }}
            />
            <span className="font-semibold text-charcoal">{stat.category}:</span>
            <span className="text-muted-foreground font-bold">{stat.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const categoryColors: Record<string, string> = {
  Lifestyle: "#FF7A59",
  Travel: "#4EBE8F",
  Food: "#F7C23B",
  Entertainment: "#4382EC",
  Personality: "#8D65C5",
  Values: "#FF6B8B",
  Finance: "#FF6D00",
  Family: "#E91E63",
  Relationships: "#E91E63",
  General: "#94a3b8"
};

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
      title: "Curious Explorers",
      desc: "Intrigued by differences and exploring new paths together.",
      gradient: "from-indigo-600 via-purple-500 to-pink-500",
    };
  } else {
    return {
      title: "Growth Companions",
      desc: "Building a steady, balanced alignment day by day.",
      gradient: "from-sky-400 via-blue-500 to-indigo-600",
    };
  }
}

function WrappedSummary({
  session,
  onPlayAgain,
}: {
  session: ReturnType<typeof loadPlay> & object;
  onPlayAgain: () => void;
}) {
  const [donutView, setDonutView] = useState<"percentage" | "strength">("percentage");

  const date = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }),
    [],
  );
  const insights = useMemo(() => computeInsights(session!), [session]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; matches: number }> = {};
    const qMap = new Map(SEED_QUESTIONS.map((q) => [q.id, q]));

    (session.l1Answers || []).forEach((item) => {
      const q = qMap.get(item.questionId);
      if (!q) return;
      const cat = q.category || "General";
      if (!stats[cat]) stats[cat] = { total: 0, matches: 0 };
      stats[cat].total++;
      if (item.p1 === item.p2 && item.p1 !== "SKIP") {
        stats[cat].matches++;
      }
    });

    return Object.entries(stats).map(([category, d]) => {
      const pct = d.total > 0 ? Math.round((d.matches / d.total) * 100) : 0;
      return { category, pct, ...d };
    });
  }, [session]);

  const data: PartnerInsights = insights.p1;

  async function share() {
    const text = `KnowEm: ${data.archetype.name} · ${data.overview.score}% aligned`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "KnowEm", text });
        return;
      } catch {
        /* ignore */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't share — try a screenshot.");
    }
  }

  const ARCHETYPE_GRADIENTS: Record<string, string> = {
    "Growth Companions": "from-sky-400 via-blue-500 to-indigo-600",
    "Curious Explorers": "from-indigo-600 via-purple-500 to-pink-500",
    "Adventure Partners": "from-amber-400 via-orange-500 to-rose-500",
    "Soul Connections": "from-purple-600 via-pink-500 to-rose-500"
  };
  const archetype = data.archetype || { name: "Growth Companions", desc: "Building a steady, balanced alignment day by day." };
  const archetypeGradient = ARCHETYPE_GRADIENTS[archetype.name] || "from-indigo-600 via-purple-500 to-pink-500";

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-semibold text-charcoal/70">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> KnowEm Wrapped
        </span>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold text-charcoal">
          What we learned
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {session!.p1.name} &amp; {session!.p2.name} · {date}
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
        <div className="rounded-2xl bg-white p-4 border border-neutral-100 flex flex-col gap-1 shadow-sm text-center">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">ALIGNMENT SCORE</span>
          <span className="text-3xl font-extrabold text-emerald-500 tracking-tight font-display">{data.overview.score}%</span>
          <span className="text-[9px] text-neutral-500">More in sync than you'd guess</span>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-neutral-100 flex flex-col gap-1 shadow-sm text-center">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">L1 BASICS</span>
          <span className="text-3xl font-extrabold text-purple-600 tracking-tight font-display">15</span>
          <span className="text-[9px] text-neutral-500">Vibes explored</span>
        </div>
      </div>

      {/* Main Two-Column Split Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start">
        
        {/* Left-Hand Column */}
        <div className="flex flex-col gap-6">
          <div className={`rounded-3xl p-6 bg-gradient-to-br ${archetypeGradient} text-white shadow-card-lift relative overflow-hidden flex flex-col justify-between min-h-[260px] border border-white/10`}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-100 bg-white/10 px-2.5 py-0.5 rounded-full">Final Archetype</span>
              <h3 className="font-display text-3xl font-extrabold mt-3 tracking-tight">{archetype.name}</h3>
              <p className="text-xs text-pink-100/90 mt-2 leading-relaxed max-w-sm">{archetype.desc}</p>
            </div>

            <div className="absolute top-6 right-6 h-28 w-28 opacity-25">
              <MountainIcon className="h-full w-full" />
            </div>

            <div className="mt-6 pt-4 border-t border-white/15">
              <span className="text-[9px] font-bold text-pink-100 uppercase">Overall Compatibility</span>
              <span className="text-4xl font-extrabold text-white tracking-tight block mt-1">{data.overview.score}%</span>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-white rounded-full" style={{ width: `${data.overview.score}%` }} />
              </div>
            </div>
          </div>

          {/* Core Dimensions */}
          <div className="rounded-3xl bg-white p-6 shadow-card border border-neutral-100 text-charcoal">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">Core Dimensions</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-1 p-3 rounded-2xl bg-neutral-50 border border-neutral-100/50">
                <span className="text-neutral-500 font-medium">Communication</span>
                <div className="flex text-amber-400 gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current opacity-30" />
                </div>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-2xl bg-neutral-50 border border-neutral-100/50">
                <span className="text-neutral-500 font-medium">Values</span>
                <div className="flex text-amber-400 gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                </div>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-2xl bg-neutral-50 border border-neutral-100/50">
                <span className="text-neutral-500 font-medium">Trust</span>
                <div className="flex text-amber-400 gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current opacity-30" />
                </div>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-2xl bg-neutral-50 border border-neutral-100/50">
                <span className="text-neutral-500 font-medium">Adventure</span>
                <div className="flex text-amber-400 gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current opacity-30" />
                </div>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-2xl bg-neutral-50 border border-neutral-100/50 col-span-2">
                <span className="text-neutral-500 font-medium">Intimacy</span>
                <div className="flex text-amber-400 gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <Star className="h-3.5 w-3.5 fill-current" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right-Hand Column */}
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl bg-white p-6 shadow-card border border-neutral-100 flex flex-col gap-6 text-charcoal">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">YOUR RELATIONSHIP JOURNEY</span>
            
            {/* Vertical timeline node tree */}
            <div className="flex flex-col gap-6 relative pl-8 before:content-[''] before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-100">
              <div className="relative flex flex-col gap-0.5">
                <div className="absolute -left-8 h-7 w-7 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-charcoal">Level 1 Heart snapshot</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">The foundation of your connection.</p>
                <span className="text-[10px] text-purple-600 font-semibold mt-0.5">40% Alignment</span>
              </div>

              <div className="relative flex flex-col gap-0.5">
                <div className="absolute -left-8 h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-charcoal">Level 2 Curious Explorers Leaf</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">You explored deeper topics together.</p>
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">42% Alignment</span>
              </div>

              <div className="relative flex flex-col gap-0.5">
                <div className="absolute -left-8 h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-charcoal">Level 3 Cosmic Circle</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">You unlocked deep intimacy.</p>
                <span className="text-[10px] text-pink-600 font-semibold mt-0.5">67% Alignment</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-xs text-neutral-600 leading-relaxed mt-2">
              <h4 className="font-bold text-purple-800 mb-1">Our review of your path</h4>
              You completed all 3 levels of connection. Starting from the baseline vibes to deeper life perspectives, and finishing with wild, intimate truths. Your alignment is a beautiful testament to open, honest reflection.
            </div>
          </div>

          {/* Segmented Donut Chart */}
          <div className="rounded-3xl bg-white p-6 shadow-card border border-neutral-100 flex flex-col items-center w-full">
            <div className="w-full flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
              <span className="text-xs font-bold text-charcoal uppercase tracking-wider">HOW YOU ALIGN ACROSS DIMENSIONS</span>
              <div className="flex gap-1.5 p-0.5 bg-neutral-150 rounded-lg text-[9px] font-bold">
                <button
                  onClick={() => setDonutView("percentage")}
                  className={`px-2.5 py-1 rounded transition-all duration-200 ${donutView === "percentage" ? "bg-white text-charcoal shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
                >
                  Percentage
                </button>
                <button
                  onClick={() => setDonutView("strength")}
                  className={`px-2.5 py-1 rounded transition-all duration-200 ${donutView === "strength" ? "bg-white text-charcoal shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
                >
                  Strength
                </button>
              </div>
            </div>

            <SegmentedDonutChart
              score={data.overview.score}
              stats={donutView === "percentage"
                ? categoryStats
                : categoryStats.map((s) => ({ ...s, pct: Math.min(100, Math.round(s.pct * 1.15)) }))
              }
            />
          </div>
        </div>

      </div>

      {/* Footer Legend Base */}
      <div className="rounded-3xl bg-white p-6 shadow-card border border-neutral-100 max-w-5xl mx-auto w-full text-charcoal mt-4 flex flex-col gap-6">
        <div>
          <h3 className="font-display text-base font-bold text-charcoal">What your archetype means</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Your relationship profile is dynamic and reflects natural interaction behavior over time, rather than a rigid permanent label.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">💜</div>
            <div>
              <h5 className="text-[11px] font-bold text-charcoal">Soul Connections</h5>
              <p className="text-[9px] text-muted-foreground">Rare, multidimensional alignment</p>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">🍃</div>
            <div>
              <h5 className="text-[11px] font-bold text-charcoal">Curious Explorers</h5>
              <p className="text-[9px] text-muted-foreground">Intrigued by differences & discovery</p>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-orange-50/50 border border-orange-100 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">🎒</div>
            <div>
              <h5 className="text-[11px] font-bold text-charcoal">Adventure Partners</h5>
              <p className="text-[9px] text-muted-foreground">Dynamic explorer connections</p>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-sky-50/50 border border-sky-100 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">🌱</div>
            <div>
              <h5 className="text-[11px] font-bold text-charcoal">Growth Companions</h5>
              <p className="text-[9px] text-muted-foreground">Steady, balanced progression</p>
            </div>
          </div>
        </div>
      </div>

      {/* Exactly one row of CTA control links */}
      <div className="flex gap-3 justify-center mt-6 w-full">
        <button
          onClick={share}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-romance px-6 py-3 text-sm font-semibold text-white shadow-glow-purple cursor-pointer transition hover:scale-[1.01]"
        >
          <Share2 className="h-4 w-4" /> Share our result
        </button>
        <button
          onClick={onPlayAgain}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-charcoal hover:bg-neutral-50 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" /> Play again
        </button>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-charcoal hover:bg-neutral-50"
        >
          Back home
        </Link>
      </div>

      <div className="mt-8 text-center text-[11px] text-muted-foreground flex flex-col items-center gap-1 border-t border-neutral-100 pt-6">
        <div className="flex items-center gap-1 justify-center">
          <Heart className="h-3.5 w-3.5 text-primary shrink-0 fill-current animate-pulse" />
          <span className="font-display font-semibold text-charcoal">KnowEm</span>
        </div>
        <p className="mt-1">An Relationship &amp; Co product</p>
        <p>Crafted by Menamma Asa Ka Sundari</p>
        <p>Develop by Lala Mat Kar Lala aka Thinkable &amp; Co ☕</p>
      </div>
    </div>
  );
}
