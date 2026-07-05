import type { PlaySession } from "./playSession";
import { SEED_QUESTIONS } from "./questions.seed";
import { L2_QUESTIONS, L2_META } from "./level2.seed";
import type { Trait, Choice } from "./types";

export interface PartnerInsights {
  agreed: { title: string; both: string }[];
  surprised: { title: string; mine: string; theirs: string }[];
  matters: string[];
  approach: string[];
  worthTalking: string[];
  archetype: { name: string; emoji: string; line: string };
  strengths: string[];
  communicationStyle: string;
  dynamic: string;
  growthOpportunity: string;
  trustProfile: string;
  overview: { score: number; label: string; line: string };
}

const TRAIT_LABEL: Record<Trait, { matters: string; approach: string }> = {
  Adventure: {
    matters: "novelty, exploration, and saying yes to the unfamiliar",
    approach: "moves toward the new before the known",
  },
  Family: {
    matters: "the people they came from and the people they want around them",
    approach: "weighs decisions through who they affect",
  },
  Finance: {
    matters: "security, smart choices, and not being caught off guard",
    approach: "thinks in trade-offs and longer horizons",
  },
  Lifestyle: {
    matters: "the texture of everyday life — comfort, rhythm, small rituals",
    approach: "protects the daily quiet",
  },
  Social: {
    matters: "being around people who light them up",
    approach: "comes alive in the company of others",
  },
  Planning: { matters: "knowing the shape of what's coming", approach: "plans first, then plays" },
};

// Spotify-Wrapped style archetypes derived from score + dominant traits
const ARCHETYPES = [
  {
    name: "Curious Opposites",
    emoji: "🧭",
    line: "Different lenses on the same world — and you can't stop comparing notes.",
  },
  {
    name: "Adventure Partners",
    emoji: "🌄",
    line: "Restless in the best way. You go further when you go together.",
  },
  {
    name: "Deep Thinkers",
    emoji: "🌌",
    line: "You read each other slowly. The good stuff lives in the pauses.",
  },
  {
    name: "Emotional Explorers",
    emoji: "💞",
    line: "Feelings are first language. You name what others tiptoe around.",
  },
  {
    name: "Balanced Builders",
    emoji: "🏛️",
    line: "Steady, intentional, quietly aligned. You build instead of drift.",
  },
];

function pickArchetype(score: number, topTraitsAll: Trait[]): (typeof ARCHETYPES)[number] {
  const has = (t: Trait) => topTraitsAll.includes(t);
  if (score < 45) return ARCHETYPES[0];
  if (has("Adventure") && score >= 55) return ARCHETYPES[1];
  if (has("Planning") && (has("Finance") || has("Family"))) return ARCHETYPES[4];
  if (has("Family") || has("Social")) return ARCHETYPES[3];
  return ARCHETYPES[2];
}

export function computeInsights(session: PlaySession): {
  p1: PartnerInsights;
  p2: PartnerInsights;
} {
  const byId = new Map(SEED_QUESTIONS.map((q) => [q.id, q]));

  const agreed: { title: string; both: string }[] = [];
  const diff: {
    qid: string;
    title: string;
    aLabel: string;
    bLabel: string;
    p1: "A" | "B";
    p2: "A" | "B";
  }[] = [];

  let skippedCount = 0;
  let answeredBoth = 0;

  for (const a of session.l1Answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    if (a.p1 === "SKIP" || a.p2 === "SKIP") {
      skippedCount++;
      continue;
    }
    answeredBoth++;
    const lA = q.optionA.label;
    const lB = q.optionB.label;
    if (a.p1 === a.p2) {
      agreed.push({ title: q.title, both: a.p1 === "A" ? lA : lB });
    } else {
      diff.push({ qid: q.id, title: q.title, aLabel: lA, bLabel: lB, p1: a.p1, p2: a.p2 });
    }
  }

  // Trait totals — skip "SKIP"s entirely
  const totals: Record<1 | 2, Partial<Record<Trait, number>>> = { 1: {}, 2: {} };
  for (const a of session.l1Answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    const add = (slot: 1 | 2, choice: Choice) => {
      if (choice !== "A" && choice !== "B") return;
      const traits = choice === "A" ? q.optionA.traits : q.optionB.traits;
      for (const [t, v] of Object.entries(traits)) {
        const key = t as Trait;
        totals[slot][key] = (totals[slot][key] ?? 0) + (v ?? 0);
      }
    };
    add(1, a.p1);
    add(2, a.p2);
  }

  const matched = agreed.length;
  const score = answeredBoth === 0 ? 0 : Math.round((matched / answeredBoth) * 100);
  const label =
    score >= 80
      ? "Beautifully aligned"
      : score >= 60
        ? "More in sync than you'd guess"
        : score >= 40
          ? "Different lenses, same direction"
          : "Plenty to discover";

  function topTraits(slot: 1 | 2): Trait[] {
    return (Object.entries(totals[slot]) as [Trait, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([t]) => t);
  }

  const archetype = pickArchetype(score, [...topTraits(1), ...topTraits(2)]);

  const sharedTraits = [...new Set(topTraits(1))].filter((t) => topTraits(2).includes(t));
  const strengths = sharedTraits.length
    ? sharedTraits.map((t) => `You both lean into ${TRAIT_LABEL[t].matters.split(",")[0]}`)
    : [
        "You see the same situation from different angles — that's a real strength when you let it be one.",
      ];

  const communicationStyle = (() => {
    if (sharedTraits.includes("Social"))
      return "Open, verbal, and quick to share — you process out loud together.";
    if (topTraits(1).includes("Planning") || topTraits(2).includes("Planning"))
      return "Considered. One of you plans first; the other speaks once they're sure.";
    if (sharedTraits.includes("Family"))
      return "Warm and protective. You speak in stories about people you love.";
    return "Direct and curious. You ask before you assume.";
  })();

  const dynamic =
    score >= 65
      ? "Easy, low-friction harmony. The risk is getting too comfortable."
      : score >= 40
        ? "Complementary push and pull. You sharpen each other's edges."
        : "Two distinct worldviews learning to share a room. Friction here is information.";

  const growthOpportunity =
    diff.length === 0
      ? "Stretch beyond agreement. Ask a question you don't already know the answer to."
      : `Sit with the ${diff.length} place${diff.length === 1 ? "" : "s"} you saw differently. Don't resolve — just understand.`;

  const trustProfile =
    skippedCount === 0
      ? "Full honesty this round — no questions ducked."
      : `${skippedCount} skip${skippedCount === 1 ? "" : "s"} this round. Worth circling back to those when you're ready.`;

  const l2Answered = new Set((session.l2Answers ?? []).map((a) => a.questionId));
  const l2Unexplored = L2_QUESTIONS.filter((q) => !l2Answered.has(q.id));

  function buildFor(viewerSlot: 1 | 2): PartnerInsights {
    const partnerSlot: 1 | 2 = viewerSlot === 1 ? 2 : 1;
    const partnerTraits = topTraits(partnerSlot);

    const surprised = diff.slice(0, 3).map((d) => ({
      title: d.title,
      mine: (viewerSlot === 1 ? d.p1 : d.p2) === "A" ? d.aLabel : d.bLabel,
      theirs: (partnerSlot === 1 ? d.p1 : d.p2) === "A" ? d.aLabel : d.bLabel,
    }));

    const matters = partnerTraits.map((t) => TRAIT_LABEL[t].matters);
    const approach = partnerTraits.map((t) => TRAIT_LABEL[t].approach);

    const seeds = l2Unexplored.slice(0, 6);
    const worthTalking = seeds.slice(0, 3).map((q) => `${L2_META[q.category].emoji} ${q.title}`);

    return {
      agreed: agreed.slice(0, 4),
      surprised,
      matters,
      approach,
      worthTalking,
      archetype,
      strengths,
      communicationStyle,
      dynamic,
      growthOpportunity,
      trustProfile,
      overview: {
        score,
        label,
        line: `Across ${answeredBoth} answered question${answeredBoth === 1 ? "" : "s"}, you matched on ${matched}.`,
      },
    };
  }

  return { p1: buildFor(1), p2: buildFor(2) };
}
