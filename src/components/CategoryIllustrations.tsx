import * as React from "react";
import { L2Category } from "@/lib/types";

export interface CategoryVisual {
  name: string;
  themeColor: string;
  gradientClass: string;
  lightBg: string;
  borderColor: string;
  emoji: string;
  desc: string;
  renderIllustration: (className?: string) => React.ReactNode;
}

export const CATEGORY_VISUALS: Record<L2Category, CategoryVisual> = {
  "Growth & Challenges": {
    name: "Growth & Challenges",
    themeColor: "#FF7A59",
    gradientClass: "from-[#FF8F73] to-[#FF4E2B]",
    lightBg: "rgba(255, 122, 89, 0.08)",
    borderColor: "rgba(255, 122, 89, 0.2)",
    emoji: "🔥",
    desc: "Bold, warm and motivating questions to help you grow together.",
    renderIllustration: (className = "h-40 w-40") => (
      <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="growth-sky" x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF0EB" />
            <stop offset="100%" stopColor="#FFE1D9" />
          </linearGradient>
          <linearGradient id="growth-peak" x1="100" y1="50" x2="100" y2="170" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF8F73" />
            <stop offset="100%" stopColor="#FF4E2B" />
          </linearGradient>
          <linearGradient id="growth-peak-2" x1="60" y1="90" x2="60" y2="170" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFA085" />
            <stop offset="100%" stopColor="#FF6242" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#growth-sky)" />
        {/* Background mountains */}
        <path d="M40 170 L100 80 L160 170 Z" fill="url(#growth-peak-2)" opacity="0.75" />
        {/* Foreground mountain */}
        <path d="M60 170 L120 60 L180 170 Z" fill="url(#growth-peak)" />
        {/* Mountain flag */}
        <path d="M120 60 L120 40 L135 48 L120 56" fill="#FFD700" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Sun path */}
        <circle cx="150" cy="70" r="16" fill="#FFE082" opacity="0.8" />
      </svg>
    ),
  },
  "Family & Relationships": {
    name: "Relationships & Family",
    themeColor: "#FF6B8B",
    gradientClass: "from-[#FF8CA3] to-[#FF3B62]",
    lightBg: "rgba(255, 107, 139, 0.08)",
    borderColor: "rgba(255, 107, 139, 0.2)",
    emoji: "🌸",
    desc: "Soft, caring and emotional questions about those closest to you.",
    renderIllustration: (className = "h-40 w-40") => (
      <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rel-sky" x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF0F2" />
            <stop offset="100%" stopColor="#FFE0E5" />
          </linearGradient>
          <linearGradient id="rel-heart" x1="100" y1="50" x2="100" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF8CA3" />
            <stop offset="100%" stopColor="#FF3B62" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#rel-sky)" />
        {/* Floating circles */}
        <circle cx="60" cy="70" r="12" fill="#FFAEC1" opacity="0.3" />
        <circle cx="140" cy="130" r="18" fill="#FFAEC1" opacity="0.25" />
        {/* Concentric heart glows */}
        <path d="M100 148 C95 143 45 105 45 74 C45 52 62 38 82 38 C92 38 97 44 100 48 C103 44 108 38 118 38 C138 38 155 52 155 74 C155 105 105 143 100 148 Z" fill="url(#rel-heart)" />
        {/* Sparkles */}
        <path d="M72 58 L74 52 L80 50 L74 48 L72 42 L70 48 L64 50 L70 52 Z" fill="#FFF" opacity="0.9" />
        <path d="M132 88 L133.5 83.5 L138 82 L133.5 80.5 L132 76 L130.5 80.5 L126 82 L130.5 83.5 Z" fill="#FFF" opacity="0.8" />
      </svg>
    ),
  },
  "About Your Life": {
    name: "Life & Experiences",
    themeColor: "#8D65C5",
    gradientClass: "from-[#8E64D8] to-[#452787]",
    lightBg: "rgba(141, 101, 197, 0.08)",
    borderColor: "rgba(141, 101, 197, 0.2)",
    emoji: "🌙",
    desc: "Calm, reflective and nostalgic queries about your journey.",
    renderIllustration: (className = "h-40 w-40") => (
      <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="life-sky" x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EDE7F6" />
            <stop offset="100%" stopColor="#D1C4E9" />
          </linearGradient>
          <linearGradient id="life-hills" x1="100" y1="120" x2="100" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8E64D8" />
            <stop offset="100%" stopColor="#452787" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#life-sky)" />
        {/* Stars */}
        <circle cx="70" cy="50" r="1.5" fill="#FFF" opacity="0.9" />
        <circle cx="140" cy="65" r="2" fill="#FFF" opacity="0.85" />
        <circle cx="50" cy="90" r="1" fill="#FFF" opacity="0.7" />
        {/* Crescent Moon */}
        <path d="M130 55 A 18 18 0 1 0 102 83 A 22 22 0 1 1 130 55 Z" fill="#FFE082" />
        {/* Hills */}
        <path d="M30 150 C70 130 110 160 170 150 L170 175 L30 175 Z" fill="url(#life-hills)" />
      </svg>
    ),
  },
  "Future Plans": {
    name: "Dreams & Future",
    themeColor: "#4EBE8F",
    gradientClass: "from-[#5CD89D] to-[#279360]",
    lightBg: "rgba(78, 190, 143, 0.08)",
    borderColor: "rgba(78, 190, 143, 0.2)",
    emoji: "🌱",
    desc: "Hopeful, fresh and inspiring talking points about tomorrow.",
    renderIllustration: (className = "h-40 w-40") => (
      <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dreams-sky" x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E8F8F2" />
            <stop offset="100%" stopColor="#C2ECD9" />
          </linearGradient>
          <linearGradient id="dreams-hills" x1="100" y1="100" x2="100" y2="185" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5CD89D" />
            <stop offset="100%" stopColor="#279360" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#dreams-sky)" />
        {/* Rising sun */}
        <circle cx="100" cy="95" r="22" fill="#FFF9C4" opacity="0.9" />
        {/* Rolling Hills & Winding Path */}
        <path d="M25 145 C65 110 135 150 175 125 L175 175 L25 175 Z" fill="url(#dreams-hills)" />
        <path d="M100 132 C95 145 92 160 88 175 L112 175 C108 160 105 145 100 132 Z" fill="#FFF9C4" opacity="0.45" />
      </svg>
    ),
  },
  "Fun & Random": {
    name: "Fun & Random",
    themeColor: "#F7C23B",
    gradientClass: "from-[#FAD961] to-[#F76B1C]",
    lightBg: "rgba(247, 194, 59, 0.08)",
    borderColor: "rgba(247, 194, 59, 0.2)",
    emoji: "✨",
    desc: "Playful, light and surprising prompts for laughter.",
    renderIllustration: (className = "h-40 w-40") => (
      <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="fun-sky" x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFDE7" />
            <stop offset="100%" stopColor="#FFF9C4" />
          </linearGradient>
          <linearGradient id="fun-smiley" x1="100" y1="50" x2="100" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FAD961" />
            <stop offset="100%" stopColor="#F76B1C" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#fun-sky)" />
        {/* Sparkles */}
        <path d="M45 60 L47 52 L54 50 L47 48 L45 40 L43 48 L36 50 L43 52 Z" fill="#F76B1C" opacity="0.65" />
        <path d="M155 70 L157 62 L164 60 L157 58 L155 50 L153 58 L146 60 L153 62 Z" fill="#FAD961" opacity="0.9" />
        {/* Playful Smiley Face */}
        <circle cx="100" cy="100" r="45" fill="url(#fun-smiley)" />
        {/* Eyes */}
        <circle cx="85" cy="90" r="5" fill="#3E2723" />
        <circle cx="115" cy="90" r="5" fill="#3E2723" />
        {/* Mouth */}
        <path d="M82 110 Q100 128 118 110" stroke="#3E2723" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  "Career & Finance": {
    name: "Career & Finance",
    themeColor: "#4382EC",
    gradientClass: "from-[#4facfe] to-[#00f2fe]",
    lightBg: "rgba(67, 130, 236, 0.08)",
    borderColor: "rgba(67, 130, 236, 0.2)",
    emoji: "💼",
    desc: "Focused, smart and practical talking points on work and wealth.",
    renderIllustration: (className = "h-40 w-40") => (
      <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="fin-sky" x1="100" y1="0" x2="100" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E3F2FD" />
            <stop offset="100%" stopColor="#BBDEFB" />
          </linearGradient>
          <linearGradient id="fin-chart" x1="100" y1="70" x2="100" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4facfe" />
            <stop offset="100%" stopColor="#00f2fe" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="90" fill="url(#fin-sky)" />
        {/* Chart Bars */}
        <rect x="55" y="110" width="16" height="40" rx="3" fill="url(#fin-chart)" opacity="0.6" />
        <rect x="80" y="90" width="16" height="60" rx="3" fill="url(#fin-chart)" opacity="0.8" />
        <rect x="105" y="75" width="16" height="75" rx="3" fill="url(#fin-chart)" />
        <rect x="130" y="55" width="16" height="95" rx="3" fill="url(#fin-chart)" />
        {/* Growth Arrow Line */}
        <path d="M50 120 L75 100 L100 85 L125 65 L145 45" stroke="#FFF" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M133 45 L145 45 L145 57" stroke="#FFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};
