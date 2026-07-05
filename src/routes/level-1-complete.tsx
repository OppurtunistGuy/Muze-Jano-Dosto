import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ArrowRight, Heart, Sparkles, Lock, Coffee, Smile, Compass, Utensils } from "lucide-react";
import { PageBackdrop, Logo } from "@/components/Brand";
import { loadLastResult } from "@/lib/storage";
import { loadPlay, savePlay } from "@/lib/playSession";

export const Route = createFileRoute("/level-1-complete")({
  head: () => ({ meta: [{ title: "What we learned — KnowEm" }] }),
  component: Level1Complete,
});

function MountainIllustration() {
  return (
    <svg viewBox="0 0 160 160" className="absolute right-0 bottom-4 w-40 h-40 pointer-events-none select-none opacity-45">
      <defs>
        <linearGradient id="mountain-grad-1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mountain-grad-2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M40 140 L100 40 L160 140 Z" fill="url(#mountain-grad-1)" />
      <path d="M80 140 L125 65 L170 140 Z" fill="url(#mountain-grad-2)" />
      <circle cx="130" cy="45" r="10" fill="#ffffff" opacity="0.25" />
    </svg>
  );
}

function Level1Complete() {
  const navigate = useNavigate();
  const [p1Vote, setP1Vote] = useState<boolean | null>(null);
  const [p2Vote, setP2Vote] = useState<boolean | null>(null);

  const lastResult = useMemo(() => loadLastResult(), []);
  const session = useMemo(() => loadPlay(), []);

  if (!session || !lastResult) {
    return (
      <PageBackdrop>
        <div className="min-h-dvh grid place-items-center text-center p-5">
          <div className="glass-strong rounded-3xl p-8 max-w-sm">
            <h2 className="font-display text-xl text-charcoal">No completed Level 1 yet.</h2>
            <Link to="/onboarding" className="mt-4 inline-block px-5 py-2.5 rounded-full bg-gradient-romance text-white text-xs font-semibold">
              Start Session
            </Link>
          </div>
        </div>
      </PageBackdrop>
    );
  }

  const score = lastResult.score ?? 29;

  // Donut chart math
  const circumference = 2 * Math.PI * 38; // r = 38
  const categories = [
    { label: "Lifestyle", count: 4, pct: 27, color: "#7C3AED", icon: Coffee },
    { label: "Preferences", count: 3, pct: 20, color: "#EC4899", icon: Heart },
    { label: "Fun & Random", count: 3, pct: 20, color: "#F59E0B", icon: Smile },
    { label: "Values & Beliefs", count: 3, pct: 20, color: "#3B82F6", icon: Compass },
    { label: "Food & Drinks", count: 2, pct: 13, color: "#10B981", icon: Utensils }
  ];

  // Calculate cumulative offsets
  let currentOffset = 0;
  const chartSegments = categories.map((cat) => {
    const segmentLength = (cat.pct / 100) * circumference;
    const offset = currentOffset;
    currentOffset -= segmentLength;
    return {
      ...cat,
      length: segmentLength,
      offset: offset
    };
  });

  const bothYes = p1Vote === true && p2Vote === true;

  const handleProceed = () => {
    if (!bothYes) return;
    const updated = {
      ...session,
      level: 2
    };
    savePlay(updated);
    navigate({ to: "/level-2" });
  };

  return (
    <PageBackdrop>
      <div className="min-h-dvh bg-[#FAF7FF] text-[#2D2A3A] pb-16 flex flex-col justify-between font-sans">
        
        {/* Header */}
        <header className="px-8 py-6 max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition"
          >
            <ChevronLeft className="h-4 w-4" /> Home
          </Link>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Heart className="h-4.5 w-4.5 fill-current" />
            </div>
            <span className="font-display text-xl font-black tracking-tight text-neutral-800">
              Know<span className="text-purple-650">Em</span>
            </span>
          </div>

          <div className="w-16" /> {/* Balance spacer */}
        </header>

        {/* Main Content Grid */}
        <main className="max-w-6xl mx-auto px-8 w-full flex flex-col gap-8">
          
          {/* Two Columns Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-stretch">
            
            {/* Left Column: Connection Snapshot (45%) */}
            <div className="lg:col-span-4 bg-gradient-to-br from-[#7C3AED] via-[#9F54E7] to-[#EC4899] rounded-[24px] p-8 text-white shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[440px] border border-purple-200/10">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-100 bg-white/12 px-3 py-1 rounded-full">
                  CONNECTION SNAPSHOT 🥳
                </span>
                
                <h2 className="font-display text-3xl font-extrabold mt-6 leading-tight max-w-xs">
                  Your connection is taking shape.
                </h2>
                
                <p className="text-sm text-purple-100/90 mt-3 leading-relaxed max-w-xs z-10 relative">
                  Complete Level 2 to explore deeper conversations and unlock your relationship archetype.
                </p>
              </div>

              <div className="mt-8 border-t border-white/15 pt-6 z-10 relative">
                <span className="text-[10px] font-bold text-purple-100 uppercase tracking-widest">INITIAL COMPATIBILITY</span>
                <span className="text-5xl font-black tracking-tight block mt-2 font-display">{score}%</span>
                
                <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden mt-4">
                  <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${score}%` }} />
                </div>
                
                <p className="text-xs text-purple-100/95 mt-6 font-semibold flex items-center gap-1.5">
                  You're off to a meaningful start! 💜
                </p>
              </div>

              <MountainIllustration />
            </div>

            {/* Right Column: Level 1 Questions Breakdown (55%) */}
            <div className="lg:col-span-6 bg-white rounded-[24px] p-8 border border-[#F1EEF9] shadow-sm flex flex-col justify-between">
              
              <div>
                <h3 className="font-display text-lg font-bold text-neutral-800 tracking-tight text-center sm:text-left">
                  LEVEL 1 QUESTIONS BREAKDOWN
                </h3>
                <p className="text-xs text-neutral-400 mt-1 text-center sm:text-left">
                  A look at the types of questions you explored together.
                </p>
                
                {/* Donut and Legend Flex container */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-10 mt-8">
                  
                  {/* Segmented Donut Chart */}
                  <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
                    <svg width="160" height="160" viewBox="0 0 100 100" className="transform -rotate-90">
                      {chartSegments.map((segment) => (
                        <circle
                          key={segment.label}
                          cx="50"
                          cy="50"
                          r="38"
                          stroke={segment.color}
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={circumference}
                          strokeDashoffset={segment.offset}
                          className="transition-all duration-1000"
                        />
                      ))}
                    </svg>
                    
                    {/* Donut Center */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Total</span>
                      <span className="text-3xl font-black text-neutral-800 leading-none my-0.5">15</span>
                      <span className="text-[9px] font-semibold text-neutral-400">Questions</span>
                    </div>
                  </div>

                  {/* Legend Grid */}
                  <div className="flex flex-col gap-3 min-w-[200px]">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <div key={cat.label} className="flex items-center justify-between text-xs text-neutral-600">
                          <div className="flex items-center gap-2.5">
                            <span className="h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                              <Icon className="h-3 w-3" />
                            </span>
                            <span className="font-semibold text-neutral-700">{cat.label}</span>
                          </div>
                          <span className="text-neutral-400 font-bold">
                            {cat.count} <span className="text-[10px] font-normal">({cat.pct}%)</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>

              {/* Bottom Insight Banner */}
              <div className="mt-8 p-4 rounded-xl bg-purple-50/50 border border-purple-100/50 flex items-center gap-2 text-xs text-purple-800">
                <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                <span>
                  <strong className="font-bold">Great start!</strong> You explored a healthy mix of topics together.
                </span>
              </div>

            </div>

          </div>

          {/* Bottom Consent and CTA Module */}
          <div className="bg-white rounded-[24px] border border-[#F1EEF9] shadow-sm overflow-hidden">
            
            {/* Top Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#F1EEF9]">
              
              {/* Left Column: What's Next info */}
              <div className="p-8 flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
                    WHAT'S NEXT
                  </span>
                  <h3 className="font-display text-2xl font-extrabold text-neutral-800 mt-4 leading-tight">
                    Let's explore what brings you <span className="text-purple-650">closer.</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
                    Level 2 brings you face-to-face with topics that shape values, dreams, challenges, and the stories behind your answers.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 mt-6">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-600 bg-neutral-50 px-3 py-1.5 rounded-full border border-neutral-100">
                    💬 15+ Deep Topics
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-600 bg-neutral-50 px-3 py-1.5 rounded-full border border-neutral-100">
                    🎯 Curated For Your Journey
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-600 bg-neutral-50 px-3 py-1.5 rounded-full border border-neutral-100">
                    ❤️ 20–25 min Together
                  </span>
                </div>
              </div>

              {/* Right Column: Mutual Consent Gate */}
              <div className="p-8 flex flex-col justify-between">
                <div>
                  <h4 className="font-display text-sm font-bold text-neutral-800 flex items-center gap-1.5">
                    <Heart className="h-4.5 w-4.5 text-pink-500 fill-current" /> Let's continue together
                  </h4>
                  
                  <div className="mt-6 flex flex-col gap-4">
                    
                    {/* Partner 1 */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF9FC] border border-[#F1EEF9]">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                          {session.p1.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-neutral-800 block">{session.p1.name}'s Choice</span>
                          <span className="text-[10px] text-neutral-400">Ready to proceed to Level 2?</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setP1Vote(true)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition duration-200 ${
                            p1Vote === true
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setP1Vote(false)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition duration-200 ${
                            p1Vote === false
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {/* Partner 2 */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF9FC] border border-[#F1EEF9]">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-sm">
                          {session.p2.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-neutral-800 block">{session.p2.name}'s Choice</span>
                          <span className="text-[10px] text-neutral-400">Ready to proceed to Level 2?</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setP2Vote(true)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition duration-200 ${
                            p2Vote === true
                              ? "bg-[#EC4899] text-white shadow-sm"
                              : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setP2Vote(false)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition duration-200 ${
                            p2Vote === false
                              ? "bg-[#EC4899] text-white shadow-sm"
                              : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Full-width CTA Button */}
            <div className="p-4 bg-neutral-50 border-t border-[#F1EEF9] flex justify-center">
              {p1Vote === false || p2Vote === false ? (
                <div className="w-full text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <span className="text-xs font-semibold text-neutral-700">Thank you for playing! ❤️ Redirecting back home...</span>
                  <Link to="/" className="text-xs text-purple-600 font-bold ml-2 underline">Go Home</Link>
                </div>
              ) : (
                <button
                  disabled={!bothYes}
                  onClick={handleProceed}
                  className={`w-full max-w-xl py-4 px-6 rounded-full font-bold text-sm flex items-center justify-between transition-all duration-300 ${
                    bothYes
                      ? "bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 text-white shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 shrink-0" />
                    <div className="text-left">
                      <span className="block font-black">Continue to Level 2</span>
                      <span className="block text-[10px] font-medium opacity-80">Both partners need to say Yes</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4.5 w-4.5" />
                </button>
              )}
            </div>

          </div>

        </main>

        {/* Footer */}
        <footer className="mt-16 max-w-5xl mx-auto w-full px-6 text-center text-[10px] text-muted-foreground flex flex-col items-center gap-3 border-t border-neutral-200/50 pt-6">
          <div className="flex items-center gap-1.5 justify-center">
            <Heart className="h-3.5 w-3.5 text-purple-650 shrink-0 fill-current animate-pulse" />
            <span className="font-display font-semibold text-neutral-800">KnowEm</span>
            <span className="text-neutral-300 mx-1">|</span>
            <span>An Relationship &amp; Co product</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-medium text-neutral-500">
            <span>Crafted By <strong className="text-neutral-700">Menamma Asa Ka Sundari</strong></span>
            <span>Develop By <strong className="text-neutral-700">Lala Mat Kar Lala aka Thinkable &amp; Co ☕</strong></span>
          </div>
        </footer>

      </div>
    </PageBackdrop>
  );
}
