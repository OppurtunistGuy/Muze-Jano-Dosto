import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Heart,
  Sparkles,
  HelpCircle,
  Plus,
  Flame,
  MessageSquare,
  Users
} from "lucide-react";
import { Logo, PageBackdrop } from "@/components/Brand";
import { Footer } from "@/components/Footer";
import { loadPlay } from "@/lib/playSession";
import { loadLastResult } from "@/lib/storage";
import { getSessionByCode } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: 'KnowEm — Get to know them before the "I do."' },
      {
        name: "description",
        content:
          "A relationship discovery game for two. Honest choices, real conversations, meaningful insights.",
      },
    ],
  }),
  component: Landing,
});

const WHEEL_SLICES = [
  { name: "Values", desc: "Discuss core beliefs, morality, and life values.", color: "#FF6B8B" },
  { name: "Lifestyle", desc: "Discuss routines, habits, health, daily living.", color: "#FF7A59" },
  { name: "Relationships", desc: "Discuss family boundaries, friendship, love languages.", color: "#8D65C5" },
  { name: "Future Plans", desc: "Discuss travel, relocation, career targets.", color: "#4EBE8F" },
  { name: "Career & Finance", desc: "Discuss money habits, savings, retirement, jobs.", color: "#4382EC" },
  { name: "Fun & Random", desc: "Discuss quirks, dreams, humor, lighter topics.", color: "#F7C23B" }
];

function Landing() {
  const navigate = useNavigate();
  const [resumePath, setResumePath] = useState<string | null>(null);
  const [resumeLabel, setResumeLabel] = useState<string | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem("knowem.onboarded") !== "1") {
        navigate({ to: "/onboarding", replace: true });
        return;
      }
    } catch {
      /* ignore */
    }

    const local = loadPlay();
    if (local && local.level) {
      const path = local.level === 3 ? "/level-3" : local.level === 2 ? "/level-2" : "/game";
      setResumePath(path);
      setResumeLabel(`Resume Game (Level ${local.level})`);
      return;
    }

    const lastRes = loadLastResult();
    const code = lastRes?.sessionCode;
    if (code) {
      (async () => {
        try {
          const s = await getSessionByCode(code);
          if (s && s.status === "playing") {
            const path = s.level === 3 ? "/level-3" : s.level === 2 ? "/level-2" : `/play/${code}`;
            setResumePath(path);
            setResumeLabel(`Resume Game (Level ${s.level ?? 1})`);
          }
        } catch (e) {
          console.error("Failed to fetch remote session for resume checker:", e);
        }
      })();
    }
  }, [navigate]);

  return (
    <PageBackdrop>
      <div className="min-h-dvh bg-gradient-to-br from-[#FAF8FF] via-[#FAF9FC] to-[#FAF8FF] text-charcoal pb-16 flex flex-col justify-between">
        
        {/* Navigation Header */}
        <header className="px-8 py-5 max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Heart className="h-5 w-5 fill-current" />
            </div>
            <span className="font-display text-2xl font-black tracking-tight text-neutral-800">
              Know<span className="text-purple-600">Em</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#how" className="text-sm font-semibold text-charcoal/70 hover:text-charcoal flex items-center gap-1 transition">
              How it works <HelpCircle className="h-4 w-4 ml-0.5 text-neutral-400" />
            </a>
          </div>
        </header>

        {/* Hero Section */}
        <section className="px-6 pt-10 pb-8 max-w-4xl mx-auto text-center flex flex-col items-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-purple-200/50 bg-[#F4EFFF] px-4 py-1.5 text-[11px] font-bold text-purple-700 shadow-sm animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-purple-500" /> Find out if you're truly aligned, together.
          </span>
          
          <h1 className="mt-8 font-display text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-charcoal leading-[1.02]">
            Know<span className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">Em</span>
          </h1>
          
          <p className="mt-4 font-display text-2xl sm:text-3xl text-neutral-700 leading-snug font-semibold">
            Discover their depth before the <span className="text-pink-500 italic">"I do."</span>
          </p>
          
          <p className="mt-5 text-sm text-neutral-500 max-w-lg mx-auto leading-relaxed">
            Uncover hidden truths, match values, and unlock deeper intimacy through playful, structured prompts.
          </p>

          {/* CTA Buttons */}
          <div className="mt-9 flex flex-row gap-4 justify-center items-center w-full max-w-lg">
            <Link
              to="/onboarding"
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#DB2777] text-sm font-bold text-white shadow-glow-purple hover:scale-[1.02] active:scale-[0.98] transition duration-220 flex items-center justify-center gap-2"
            >
              Begin Your Journey <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/onboarding"
              className="px-8 py-3.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-sm font-bold text-charcoal shadow-sm transition hover:scale-[1.02] active:scale-[0.98] duration-220 flex items-center justify-center gap-1.5"
            >
              ⚡ Quick start
            </Link>
            {resumePath && resumeLabel && (
              <Link
                to={resumePath as never}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold shadow-glow-orange transition hover:scale-[1.02] active:scale-[0.98] duration-220 flex items-center justify-center gap-2"
              >
                {resumeLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </section>

        {/* Three Levels Section (Redesigned Journey Flow) */}
        <section className="px-6 mt-16 max-w-6xl mx-auto w-full">
          <h2 className="font-display text-3xl font-extrabold text-charcoal text-center tracking-tight">
            Three levels of connection
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-500">
            Light to deep, at <span className="text-purple-600 font-semibold">your own pace</span>. Stop whenever feels right.
          </p>

          <div className="mt-12 flex flex-col md:flex-row items-stretch justify-center gap-6 relative max-w-5xl mx-auto">
            
            {/* Level 1 Card */}
            <div className="w-full max-w-[320px] bg-white rounded-[28px] p-6 border border-neutral-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-220 flex flex-col justify-between relative z-10">
              <div className="flex flex-col gap-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-full self-start">Level 1</span>
                
                <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 shadow-inner shrink-0">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[2]">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                
                <h3 className="font-display text-xl font-extrabold text-neutral-800">Discover Your Vibe</h3>
                <p className="text-[16px] text-neutral-500 leading-relaxed">
                  15 quick This-or-That questions that reveal everyday compatibility.
                </p>
              </div>

              <div className="flex gap-3 mt-8 pt-5 border-t border-neutral-100 text-[14px]">
                <span className="font-semibold text-neutral-600">• 15 Questions</span>
                <span className="font-semibold text-neutral-600">• ~5 min</span>
              </div>
            </div>

            {/* Glowing Heart Divider 1 */}
            <div className="hidden md:flex items-center justify-center z-20 -mx-6">
              <div className="h-[2px] w-8 bg-purple-100/80" />
              <div className="h-7 w-7 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-500 shadow-md animate-pulse">
                <Heart className="h-3.5 w-3.5 fill-current" />
              </div>
              <div className="h-[2px] w-8 bg-purple-100/80" />
            </div>

            {/* Level 2 Card (Interactive VisionOS concentric wheel) */}
            <div className="w-full max-w-[340px] bg-white rounded-[28px] p-6 border border-neutral-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-220 flex flex-col items-center text-center justify-between relative z-10">
              <div className="flex flex-col items-center gap-4 w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full self-start">Level 2</span>
                
                {/* 6 themes interactive SVG wheel */}
                <div className="relative h-44 w-44 mt-2 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {WHEEL_SLICES.map((slice, i) => {
                      const startAngle = i * 60;
                      const endAngle = (i + 1) * 60;
                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (endAngle * Math.PI) / 180;
                      const r = 38;
                      const x1 = 50 + r * Math.cos(startRad);
                      const y1 = 50 + r * Math.sin(startRad);
                      const x2 = 50 + r * Math.cos(endRad);
                      const y2 = 50 + r * Math.sin(endRad);
                      
                      const midAngle = startAngle + 30;
                      const midRad = (midAngle * Math.PI) / 180;
                      const isHovered = hoveredSlice === i;
                      
                      // Pull slice outward slightly on hover
                      const tx = isHovered ? 6 * Math.cos(midRad) : 0;
                      const ty = isHovered ? 6 * Math.sin(midRad) : 0;

                      return (
                        <path
                          key={slice.name}
                          d={`M 50 50 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                          fill={slice.color}
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all duration-250 cursor-pointer"
                          style={{
                            transform: `translate(${tx}px, ${ty}px)`,
                            opacity: hoveredSlice !== null && !isHovered ? 0.45 : 1,
                            filter: isHovered ? "drop-shadow(0 4px 6px rgba(0,0,0,0.15))" : "none"
                          }}
                          onMouseEnter={() => setHoveredSlice(i)}
                          onMouseLeave={() => setHoveredSlice(null)}
                        />
                      );
                    })}
                  </svg>
                  
                  {/* Center circle */}
                  <div
                    className="absolute h-14 w-14 rounded-full bg-white flex flex-col items-center justify-center shadow-md transition-transform duration-250 pointer-events-none"
                    style={{
                      transform: hoveredSlice !== null ? "scale(1.08)" : "scale(1)"
                    }}
                  >
                    <span className="text-sm font-black text-neutral-800 leading-none">6</span>
                    <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">Themes</span>
                  </div>
                </div>

                {/* Tooltip dynamic zone */}
                <div className="h-12 w-full flex items-center justify-center px-2">
                  {hoveredSlice !== null ? (
                    <div className="animate-fade-in flex flex-col items-center">
                      <strong className="text-xs font-bold" style={{ color: WHEEL_SLICES[hoveredSlice].color }}>
                        {WHEEL_SLICES[hoveredSlice].name}
                      </strong>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">{WHEEL_SLICES[hoveredSlice].desc}</p>
                    </div>
                  ) : (
                    <span className="text-[10px] text-neutral-450 italic">Hover slice to preview theme</span>
                  )}
                </div>
                
                <h3 className="font-display text-xl font-bold text-neutral-800">Explore Deeper</h3>
                <p className="text-[16px] text-neutral-500 leading-relaxed px-2">
                  Spin the wheel to unlock meaningful conversations across six life dimensions.
                </p>
              </div>

              <div className="flex gap-3 mt-8 pt-5 border-t border-neutral-100 text-[14px] w-full justify-center">
                <span className="font-semibold text-neutral-600">• 6 Themes</span>
                <span className="font-semibold text-neutral-600">• ~20 min</span>
              </div>
            </div>

            {/* Glowing Heart Divider 2 */}
            <div className="hidden md:flex items-center justify-center z-20 -mx-6">
              <div className="h-[2px] w-8 bg-purple-100/80" />
              <div className="h-7 w-7 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-500 shadow-md animate-pulse">
                <Heart className="h-3.5 w-3.5 fill-current" />
              </div>
              <div className="h-[2px] w-8 bg-purple-100/80" />
            </div>

            {/* Level 3 Card */}
            <div className="w-full max-w-[320px] bg-white rounded-[28px] p-6 border border-neutral-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-220 flex flex-col justify-between relative z-10">
              <div className="flex flex-col gap-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full self-start">Level 3</span>
                
                <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-inner shrink-0">
                  <Flame className="h-6 w-6 fill-current animate-pulse" />
                </div>
                
                <h3 className="font-display text-xl font-extrabold text-neutral-800">Truth, Teasing & Hot</h3>
                <p className="text-[16px] text-neutral-500 leading-relaxed">
                  Three progressively deeper tiers. Consent-first. Never explicit.
                </p>
              </div>

              <div className="flex gap-3 mt-8 pt-5 border-t border-neutral-100 text-[14px]">
                <span className="font-semibold text-neutral-600">• 3 Tiers</span>
                <span className="font-semibold text-neutral-600">• ~30 min</span>
              </div>
            </div>

          </div>
        </section>

        {/* Lower Insight Panel (Redesigned as 3 dynamic columns) */}
        <section className="px-8 mt-16 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-charcoal">
            
            {/* Insight Card 1 */}
            <div className="rounded-[28px] bg-white p-[28px] border border-neutral-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-220 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-800">What you now know</h4>
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">From Level 1 + Level 2</span>
                </div>
              </div>
              
              <ul className="mt-2 space-y-2 text-xs text-neutral-500 list-none">
                <li className="flex items-center gap-2">
                  <span className="text-purple-600 font-bold">✓</span> Shared habits
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-600 font-bold">✓</span> Lifestyle compatibility
                </li>
              </ul>
            </div>

            {/* Insight Card 2 */}
            <div className="rounded-[28px] bg-white p-[28px] border border-neutral-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-220 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-800">What you explored</h4>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Deep Discussions</span>
                </div>
              </div>
              
              <ul className="mt-2 space-y-2 text-xs text-neutral-500 list-none">
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">✓</span> Future planning
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">✓</span> Financial expectations
                </li>
              </ul>
            </div>

            {/* Insight Card 3 */}
            <div className="rounded-[28px] bg-white p-[28px] border border-neutral-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-220 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Flame className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-800">What's next</h4>
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Level 3 Journey</span>
                </div>
              </div>
              
              <ul className="mt-2 space-y-2 text-xs text-neutral-500 list-none">
                <li className="flex items-center gap-2 text-neutral-500">
                  <span className="text-amber-500 font-bold">•</span> Continue building safety
                </li>
                <li className="flex items-center gap-2 text-neutral-500">
                  <span className="text-amber-500 font-bold">•</span> Respect each other's boundaries
                </li>
              </ul>
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 max-w-5xl mx-auto w-full px-6 text-center text-[10px] text-muted-foreground flex flex-col items-center gap-3 border-t border-neutral-200/50 pt-6">
          <div className="flex items-center gap-1.5 justify-center">
            <Heart className="h-3.5 w-3.5 text-purple-650 shrink-0 fill-current animate-pulse" />
            <span className="font-display font-semibold text-charcoal">KnowEm</span>
            <span className="text-neutral-300 mx-1">|</span>
            <span>An Relationship & Co product</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-medium text-neutral-500">
            <span>Crafted By <strong className="text-neutral-700">Menamma Asa Ka Sundari</strong></span>
            <span>Develop By <strong className="text-neutral-700">Lala Mat Kar Lala aka Thinkable & Co ☕</strong></span>
          </div>
        </footer>

      </div>
    </PageBackdrop>
  );
}
