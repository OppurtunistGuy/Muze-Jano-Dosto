import type {
  AlignmentItem,
  Answer,
  CompatibilityResult,
  PlayerInfo,
  Question,
  Trait,
} from "./types";
import { TRAITS } from "./types";

const TAG_LIBRARY: Record<Trait, string[]> = {
  Adventure: ["Explorer", "Adventurer", "Risk Taker", "Free Spirit"],
  Family: ["Family First", "Homebody", "Loyalist"],
  Finance: ["Strategist", "Planner", "Minimalist"],
  Lifestyle: ["Foodie", "Dreamer", "Minimalist"],
  Social: ["Social Butterfly", "Connector", "Storyteller"],
  Planning: ["Planner", "Strategist", "Architect"],
};

function emptyTraits(): Record<Trait, number> {
  return TRAITS.reduce((acc, t) => ((acc[t] = 0), acc), {} as Record<Trait, number>);
}
function addTraits(into: Record<Trait, number>, from: Partial<Record<Trait, number>>) {
  for (const k of Object.keys(from) as Trait[]) into[k] = (into[k] ?? 0) + (from[k] ?? 0);
}
function sharesTrait(a: Partial<Record<Trait, number>>, b: Partial<Record<Trait, number>>) {
  for (const k of Object.keys(a) as Trait[]) if ((a[k] ?? 0) > 0 && (b[k] ?? 0) > 0) return true;
  return false;
}
function bandLabel(score: number): string {
  if (score >= 81) return "Highly Aligned";
  if (score >= 61) return "Strong Potential";
  if (score >= 41) return "Getting To Know Each Other";
  return "Different Paths";
}
function topTraits(totals: Record<Trait, number>, n = 3): Trait[] {
  return [...TRAITS]
    .filter((t) => totals[t] > 0)
    .sort((a, b) => totals[b] - totals[a])
    .slice(0, n);
}
function tagsFromTraits(top: Trait[]): string[] {
  const out: string[] = [];
  const used = new Set<string>();
  for (const t of top) {
    for (const tag of TAG_LIBRARY[t]) {
      if (!used.has(tag)) {
        out.push(tag);
        used.add(tag);
        break;
      }
    }
  }
  return out;
}

const DISCUSSION_BY_CATEGORY: Record<string, string> = {
  Finance:
    "You had different views on finances. Discuss what financial security and independence mean to each of you.",
  Family:
    "You differed on family. Talk through long-term expectations around family and traditions.",
  Travel:
    "You picked different ways to travel. Share what kind of trip would feel like a perfect reset for each of you.",
  Lifestyle:
    "You differ on daily lifestyle. Compare your ideal week — the small routines really add up.",
  Food: "You like different food vibes. Plan a few meals together that mix both styles.",
  Entertainment: "You unwind differently. Trade one weekend each — your way, then theirs.",
  Personality:
    "Different personality leans here. Talk about when each style helps and when it gets in the way.",
  Values:
    "A values gap showed up. Unpack the why behind your choice — that's where real understanding lives.",
  Relationships:
    "You see relationships differently. Share one expectation you've never said out loud.",
};

export function computeCompatibility(
  p1: PlayerInfo,
  p2: PlayerInfo,
  questions: Question[],
  answers: Answer[],
): CompatibilityResult {
  const byId = new Map(questions.map((q) => [q.id, q]));
  let raw = 0;
  let scoredMax = 0;
  const shared: CompatibilityResult["shared"] = [];
  const differences: CompatibilityResult["differences"] = [];
  const strong: AlignmentItem[] = [];
  const discuss: AlignmentItem[] = [];
  const conflict: AlignmentItem[] = [];
  const p1Totals = emptyTraits();
  const p2Totals = emptyTraits();
  let skippedCount = 0;
  let answeredCount = 0;

  for (const ans of answers) {
    const q = byId.get(ans.questionId);
    if (!q) continue;
    if (ans.p1 === "SKIP" || ans.p2 === "SKIP") {
      if (ans.p1 === "SKIP" && ans.p2 === "SKIP") skippedCount++;
      continue;
    }
    answeredCount++;
    const p1Opt = ans.p1 === "A" ? q.optionA : q.optionB;
    const p2Opt = ans.p2 === "A" ? q.optionA : q.optionB;
    addTraits(p1Totals, p1Opt.traits);
    addTraits(p2Totals, p2Opt.traits);
    scoredMax += 5;

    const item: AlignmentItem = {
      questionId: q.id,
      title: q.title,
      p1: p1Opt.label,
      p2: p2Opt.label,
      category: q.category,
    };

    if (ans.p1 === ans.p2) {
      raw += 5;
      shared.push({ questionId: q.id, title: q.title, chosen: p1Opt.label });
      strong.push(item);
    } else if (sharesTrait(p1Opt.traits, p2Opt.traits)) {
      raw += 3;
      differences.push({ questionId: q.id, title: q.title, a: p1Opt.label, b: p2Opt.label });
      discuss.push(item);
    } else {
      differences.push({ questionId: q.id, title: q.title, a: p1Opt.label, b: p2Opt.label });
      conflict.push(item);
    }
  }

  const score = scoredMax > 0 ? Math.round((raw / scoredMax) * 100) : 0;
  const label = bandLabel(score);
  const p1Tags = tagsFromTraits(topTraits(p1Totals));
  const p2Tags = tagsFromTraits(topTraits(p2Totals));

  const insights = buildInsights(p1, p2, p1Totals, p2Totals, shared.length, answeredCount);
  const discussionStarters = buildDiscussionStarters([...conflict, ...discuss]);

  return {
    score,
    label,
    shared,
    differences: differences.slice(0, 6),
    p1Tags,
    p2Tags,
    p1TraitTotals: p1Totals,
    p2TraitTotals: p2Totals,
    insights,
    alignment: { strong, discuss, conflict },
    discussionStarters,
    skippedCount,
    answeredCount,
  };
}

function buildInsights(
  p1: PlayerInfo,
  p2: PlayerInfo,
  p1Totals: Record<Trait, number>,
  p2Totals: Record<Trait, number>,
  sharedCount: number,
  totalQ: number,
): string[] {
  const insights: string[] = [];
  if (totalQ === 0)
    return ["Not enough answers yet to build insights. Try a fresh round together."];
  const sharedTop = TRAITS.filter((t) => p1Totals[t] > 0 && p2Totals[t] > 0).sort(
    (a, b) => p2Totals[b] + p1Totals[b] - (p2Totals[a] + p1Totals[a]),
  );
  const top = sharedTop[0];
  if (top) {
    const map: Record<Trait, string> = {
      Adventure: `${p1.name} and ${p2.name} both light up when life feels like an open road.`,
      Family: `Family and warmth sit at the center of how ${p1.name} and ${p2.name} move through the world.`,
      Finance: `${p1.name} and ${p2.name} share a steady, thoughtful relationship with money.`,
      Lifestyle: `${p1.name} and ${p2.name} both protect the small daily rituals that make life feel good.`,
      Social: `${p1.name} and ${p2.name} both come alive around people they love.`,
      Planning: `${p1.name} and ${p2.name} both find calm in knowing what comes next.`,
    };
    insights.push(map[top]);
  }
  const ratio = sharedCount / Math.max(1, totalQ);
  if (ratio >= 0.6)
    insights.push(
      `You agreed on ${sharedCount} of ${totalQ} answered choices — your everyday rhythm is genuinely in sync.`,
    );
  else if (ratio <= 0.3)
    insights.push(
      `Only ${sharedCount} answers matched — your differences are the conversation starters, not the problem.`,
    );
  else
    insights.push(
      `A balanced mix of overlap and contrast — enough common ground to feel safe, enough difference to keep it interesting.`,
    );
  return insights;
}

function buildDiscussionStarters(items: AlignmentItem[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const prompt =
      DISCUSSION_BY_CATEGORY[item.category] ??
      `You disagreed on "${item.title}". Take a few minutes to share what drove each choice.`;
    if (seen.has(prompt)) continue;
    seen.add(prompt);
    out.push(prompt);
    if (out.length >= 4) break;
  }
  return out;
}

export function pickRandomQuestions(all: Question[], n = 15): Question[] {
  const active = all.filter((q) => q.active);
  const pool = [...active];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}
