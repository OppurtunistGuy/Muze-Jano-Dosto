import type { L3Question, L3Tier } from "./types";

// Cards are conversation prompts. Options are unused visually in v1.0 —
// kept only to satisfy the type. Nothing renders them in Level 3.
const NO_OPTS: [string, string, string] = ["", "", ""];

const Q = (id: string, title: string, tier: L3Tier): L3Question => ({
  id,
  title,
  tier,
  options: NO_OPTS,
});

/* ---- Regular (7) ---- */
const REGULAR: L3Question[] = [
  Q("l3-r1", "What does feeling truly safe with someone look like for you?", "regular"),
  Q("l3-r2", "When did you last feel completely seen by your partner?", "regular"),
  Q(
    "l3-r3",
    "What's something you want more of in this relationship that you've never said out loud?",
    "regular",
  ),
  Q("l3-r4", "What's a side of you that most people never get to see?", "regular"),
  Q("l3-r5", "What do you need after a hard day that you rarely ask for?", "regular"),
  Q("l3-r6", "What's one thing you wish your partner understood about how you love?", "regular"),
  Q("l3-r7", "When do you feel most desired?", "regular"),
];

/* ---- Open-Minded (2) ---- */
const OPEN: L3Question[] = [
  Q("l3-o1", "What's a fantasy you've thought about but never brought up?", "open"),
  Q("l3-o2", "Is there something physical you've been curious to try but haven't yet?", "open"),
];

/* ---- Wild (pick 1 per session) ---- */
const WILD: L3Question[] = [
  Q(
    "l3-w1",
    "Do you lean more vanilla or do you enjoy exploring kinkier territory sometimes?",
    "wild",
  ),
  Q(
    "l3-w2",
    "Are there any power dynamics you find interesting — being in control, being submissive, or somewhere in between?",
    "wild",
  ),
  Q(
    "l3-w3",
    "Are there absolute limits for you when it comes to physical intimacy — things that are a hard no?",
    "wild",
  ),
  Q(
    "l3-w4",
    "Do you like things a bit rougher sometimes — hair pulling, scratching, that kind of thing — or is that not your thing?",
    "wild",
  ),
  Q("l3-w5", "Have you ever been curious about intimacy with someone of the same gender?", "wild"),
];

export const L3_QUESTIONS: L3Question[] = [...REGULAR, ...OPEN, ...WILD];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildL3Deck(
  p1Uploads: L3Question[] = [],
  p2Uploads: L3Question[] = [],
  mode: "ai" | "upload" | "hybrid" = "ai"
): L3Question[] {
  // Map upload IDs to indicate player source
  const p1Pool = shuffle(
    p1Uploads.map((q, i) => ({
      ...q,
      id: `upload-p1-${i}-${Math.random().toString(36).slice(2, 6)}`,
    }))
  );
  const p2Pool = shuffle(
    p2Uploads.map((q, i) => ({
      ...q,
      id: `upload-p2-${i}-${Math.random().toString(36).slice(2, 6)}`,
    }))
  );

  // Mode 1: Manual Mode (strictly user-uploaded questions only)
  if (mode === "upload") {
    return shuffle([...p1Pool, ...p2Pool]);
  }

  // Mode 2: AI Mode (curate to maximize naughty/kinky open & wild questions)
  if (mode === "ai") {
    const kinkyPool = [...WILD, ...OPEN]; // Maximize naughty/kinky parameters
    const fillPool = shuffle(REGULAR);
    const finalDeck = shuffle([...kinkyPool, ...fillPool.slice(0, 3)]).slice(0, 10);
    return finalDeck;
  }

  // Mode 3: Hybrid Mode (balanced randomizer mixing user uploads with high-intensity AI)
  const mergedUploads: L3Question[] = [];
  const p1Limit = Math.min(3, p1Pool.length);
  const p2Limit = Math.min(3, p2Pool.length);
  mergedUploads.push(...p1Pool.slice(0, p1Limit));
  mergedUploads.push(...p2Pool.slice(0, p2Limit));

  // High intensity AI components to mix in
  const aiRegularPool = shuffle(REGULAR);
  const aiOpenPool = shuffle(OPEN);
  const aiWildPool = shuffle(WILD);

  const needed = Math.max(0, 10 - mergedUploads.length);
  // Prioritize mixing high-intensity AI wild & open cards first
  const highIntensityAi = shuffle([...aiWildPool.slice(0, 3), ...aiOpenPool]);
  const fillCards = shuffle([...highIntensityAi, ...aiRegularPool]);

  const finalDeck = shuffle([...mergedUploads, ...fillCards.slice(0, needed)]).slice(0, 10);
  return finalDeck;
}
