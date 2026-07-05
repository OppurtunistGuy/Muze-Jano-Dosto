import type { L2Category, L2Question } from "./types";

// Category palette + iconography
export const L2_META: Record<
  L2Category,
  { color: string; soft: string; emoji: string; line: string }
> = {
  "Growth & Challenges": {
    color: "#FFC4C4",
    soft: "#FFEAEA",
    emoji: "🔥",
    line: "Where you've stretched, struggled, and grown.",
  },
  "Family & Relationships": {
    color: "#FBD4D4",
    soft: "#FCEAEA",
    emoji: "🌸",
    line: "The people who shaped you and the ones beside you now.",
  },
  "Future Plans": {
    color: "#FFE7B5",
    soft: "#FFF3DC",
    emoji: "☀️",
    line: "The life you're quietly building toward.",
  },
  "About Your Life": {
    color: "#D2F5C2",
    soft: "#E6FBDC",
    emoji: "🍃",
    line: "Your everyday — the small things that make it yours.",
  },
  "Career & Finance": {
    color: "#CCD4FF",
    soft: "#E6EBFF",
    emoji: "💼",
    line: "Work, money, and what they really mean to you.",
  },
  "Fun & Random": {
    color: "#E2BFF1",
    soft: "#F1E1F8",
    emoji: "✨",
    line: "The lighter, sillier corners of who you are.",
  },
};

const Q = (
  id: string,
  category: L2Category,
  title: string,
  options: [string, string, string],
  hint?: string,
): L2Question => ({ id, category, title, options, hint });

export const L2_QUESTIONS: L2Question[] = [
  // ---------- Growth & Challenges ----------
  Q("g1", "Growth & Challenges", "When life gets hard, what helps you most?", [
    "Talking it out",
    "Time alone to process",
    "Keeping busy",
  ]),
  Q("g2", "Growth & Challenges", "Where do you most want to grow next year?", [
    "Emotionally",
    "Career-wise",
    "Health & habits",
  ]),
  Q("g3", "Growth & Challenges", "How do you usually handle failure?", [
    "Reflect and adjust",
    "Bounce back fast",
    "Sit with it a while",
  ]),
  Q("g4", "Growth & Challenges", "What gets you out of a funk fastest?", [
    "Movement",
    "A good conversation",
    "Rest and quiet",
  ]),
  Q("g5", "Growth & Challenges", "The hardest feedback to receive is about…", [
    "My effort",
    "My personality",
    "My choices",
  ]),
  Q("g6", "Growth & Challenges", "What kind of mistakes do you forgive easily?", [
    "Honest ones",
    "Funny ones",
    "None — I hold on",
  ]),
  Q("g7", "Growth & Challenges", "Pick your bigger fear right now.", [
    "Standing still",
    "Picking wrong",
    "Letting people down",
  ]),
  Q("g8", "Growth & Challenges", "What helps you feel proud of yourself?", [
    "Finishing something hard",
    "Being kind under pressure",
    "Showing up consistently",
  ]),

  // ---------- Family & Relationships ----------
  Q("f1", "Family & Relationships", "How should we handle conflict?", [
    "Talk it out fast",
    "Cool off, then talk",
    "Write it down first",
  ]),
  Q("f2", "Family & Relationships", "Feeling loved looks most like…", [
    "Words & affirmation",
    "Touch & closeness",
    "Quality time together",
  ]),
  Q("f3", "Family & Relationships", "Family time should be…", [
    "Frequent and casual",
    "Occasional and meaningful",
    "On my own terms",
  ]),
  Q("f4", "Family & Relationships", "When I'm upset, I'd rather you…", [
    "Ask what I need",
    "Just stay close",
    "Give me space",
  ]),
  Q("f5", "Family & Relationships", "An ideal Friday night is…", [
    "Out with friends",
    "Just us two",
    "Both — start social, end together",
  ]),
  Q("f6", "Family & Relationships", "How do you apologize best?", [
    "Words, clearly",
    "Actions and change",
    "A gesture or gift",
  ]),
  Q("f7", "Family & Relationships", "The friend group I want around us is…", [
    "Small and tight",
    "Big and warm",
    "Just a few key people",
  ]),
  Q("f8", "Family & Relationships", "Holidays with family should be…", [
    "Together every time",
    "Alternate years",
    "Flexible, no rules",
  ]),

  // ---------- Future Plans ----------
  Q("fp1", "Future Plans", "Where do you want to live in 5 years?", [
    "Big city energy",
    "Small town calm",
    "Somewhere new every few years",
  ]),
  Q("fp2", "Future Plans", "Kids — honest answer?", [
    "Yes, definitely",
    "Maybe, one day",
    "Probably not",
  ]),
  Q("fp3", "Future Plans", "Your dream home is…", [
    "Modern in the city",
    "Cozy with a yard",
    "Off-grid and quiet",
  ]),
  Q("fp4", "Future Plans", "An ideal Sunday in 3 years looks like…", [
    "Slow, in pajamas",
    "Out exploring",
    "Hosting people we love",
  ]),
  Q("fp5", "Future Plans", "If we took a sabbatical, we'd…", [
    "Travel the world",
    "Build something together",
    "Rest, really rest",
  ]),
  Q("fp6", "Future Plans", "Marriage feels…", [
    "Important and intentional",
    "Nice but optional",
    "Not really for me",
  ]),
  Q("fp7", "Future Plans", "Retirement should be…", [
    "Active and adventurous",
    "Quiet and creative",
    "Close to family",
  ]),
  Q("fp8", "Future Plans", "The non-negotiable for our future is…", [
    "Stability",
    "Freedom",
    "Growth",
  ]),

  // ---------- About Your Life ----------
  Q("a1", "About Your Life", "You're more of a…", [
    "Morning person",
    "Night owl",
    "Depends on the day",
  ]),
  Q("a2", "About Your Life", "Your home should feel…", [
    "Tidy and minimal",
    "Warm and lived-in",
    "Creative and full",
  ]),
  Q("a3", "About Your Life", "Best way to recharge?", [
    "Solo time",
    "With one close person",
    "Around a group",
  ]),
  Q("a4", "About Your Life", "Your relationship with your phone is…", [
    "Healthy",
    "Working on it",
    "It owns me a little",
  ]),
  Q("a5", "About Your Life", "Your ideal weekend morning is…", [
    "Workout, then coffee",
    "Slow breakfast in bed",
    "Out exploring early",
  ]),
  Q("a6", "About Your Life", "You take care of your body by…", [
    "Moving every day",
    "Eating well",
    "Resting properly",
  ]),
  Q("a7", "About Your Life", "Your comfort food is…", [
    "Something warm",
    "Something sweet",
    "Something salty",
  ]),
  Q("a8", "About Your Life", "Which season feels most like you?", ["Summer", "Autumn", "Winter"]),

  // ---------- Career & Finance ----------
  Q("c1", "Career & Finance", "Work means most to you because of…", [
    "The money",
    "The purpose",
    "The people",
  ]),
  Q("c2", "Career & Finance", "Money makes you feel…", [
    "Calm when planned",
    "A little anxious",
    "Mostly free",
  ]),
  Q("c3", "Career & Finance", "If we share a life, money should be…", [
    "Fully combined",
    "Mostly separate",
    "Shared but with personal pots",
  ]),
  Q("c4", "Career & Finance", "Save, spend, or invest first?", [
    "Save",
    "Spend on now",
    "Invest long-term",
  ]),
  Q("c5", "Career & Finance", "Would you support a partner changing careers?", [
    "Absolutely",
    "Yes, with a plan",
    "Only if needed",
  ]),
  Q("c6", "Career & Finance", "Your dream is closer to…", [
    "Starting something of my own",
    "Climbing where I am",
    "Working less, living more",
  ]),
  Q("c7", "Career & Finance", "Big purchases should be…", [
    "Discussed every time",
    "Discussed over a threshold",
    "Each person's call",
  ]),
  Q("c8", "Career & Finance", "Debt feels like…", ["A tool", "A stressor", "A hard no"]),

  // ---------- Fun & Random ----------
  Q("fn1", "Fun & Random", "Pick your ideal vacation.", [
    "Beach & nothing to do",
    "City adventure",
    "Mountains & hiking",
  ]),
  Q("fn2", "Fun & Random", "On a free Saturday, you'd rather…", [
    "Try something new",
    "Repeat a favorite",
    "Stay home and chill",
  ]),
  Q("fn3", "Fun & Random", "Pick a guilty pleasure.", [
    "Reality TV",
    "Late-night snacks",
    "Long online rabbit holes",
  ]),
  Q("fn4", "Fun & Random", "Your karaoke move is…", [
    "A confident classic",
    "Something silly",
    "Hard pass, I just cheer",
  ]),
  Q("fn5", "Fun & Random", "Coffee, tea, or neither?", ["Coffee", "Tea", "Neither, thanks"]),
  Q("fn6", "Fun & Random", "Dogs, cats, or no pets?", ["Dogs", "Cats", "No pets"]),
  Q("fn7", "Fun & Random", "Pick your useless superpower.", [
    "Always know the time",
    "Speak to houseplants",
    "Perfect parking, always",
  ]),
  Q("fn8", "Fun & Random", "Surprise gifts are…", [
    "My love language",
    "Sweet but unnecessary",
    "A little stressful",
  ]),
];

/** Returns up to `count` unanswered questions for a category, randomized. */
export function pickPoolForCategory(
  category: L2Category,
  answeredIds: Set<string>,
  count = 6,
): L2Question[] {
  const pool = L2_QUESTIONS.filter((q) => q.category === category && !answeredIds.has(q.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
