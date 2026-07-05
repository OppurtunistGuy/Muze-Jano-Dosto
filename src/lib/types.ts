export const TRAITS = [
  "Adventure",
  "Family",
  "Finance",
  "Lifestyle",
  "Social",
  "Planning",
] as const;
export type Trait = (typeof TRAITS)[number];

export const CATEGORIES = [
  "Lifestyle",
  "Travel",
  "Food",
  "Entertainment",
  "Personality",
  "Values",
  "Finance",
  "Family",
  "Relationships",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const GENDERS = ["Male", "Female", "Other"] as const;
export type Gender = (typeof GENDERS)[number];

export type TraitMap = Partial<Record<Trait, number>>;

export interface Option {
  label: string;
  traits: TraitMap;
}

export interface Question {
  id: string;
  title: string;
  subtitle?: string;
  hint?: string;
  optionA: Option;
  optionB: Option;
  category: Category;
  active: boolean;
}

export interface PlayerInfo {
  name: string;
  gender: Gender;
}

export type Choice = "A" | "B" | "SKIP";

export interface Answer {
  questionId: string;
  p1: Choice;
  p2: Choice;
}

export interface AlignmentItem {
  questionId: string;
  title: string;
  p1: string;
  p2: string;
  category: Category;
}

export interface CompatibilityResult {
  score: number;
  label: string;
  shared: { questionId: string; title: string; chosen: string }[];
  differences: { questionId: string; title: string; a: string; b: string }[];
  p1Tags: string[];
  p2Tags: string[];
  p1TraitTotals: Record<Trait, number>;
  p2TraitTotals: Record<Trait, number>;
  insights: string[];
  alignment: {
    strong: AlignmentItem[];
    discuss: AlignmentItem[];
    conflict: AlignmentItem[];
  };
  discussionStarters: string[];
  skippedCount: number;
  answeredCount: number;
}

/* ---------- Level 2 (local-only, 3-option choice) ---------- */

export const L2_CATEGORIES = [
  "Growth & Challenges",
  "Family & Relationships",
  "Future Plans",
  "About Your Life",
  "Career & Finance",
  "Fun & Random",
] as const;
export type L2Category = (typeof L2_CATEGORIES)[number];

export type ChoiceIdx = 0 | 1 | 2;

export interface L2Question {
  id: string;
  category: L2Category;
  title: string;
  hint?: string;
  options: [string, string, string];
}

export interface L2Answer {
  questionId: string;
  p1: ChoiceIdx;
  p2: ChoiceIdx;
}

export type Reaction = "happy" | "neutral" | "sad";

export interface L2ReactionPair {
  p1: Reaction;
  p2: Reaction;
}

/* ---------- Level 3 (intimate, 3-option choice) ---------- */

export type L3Tier = "wild" | "open" | "regular";

export interface L3Question {
  id: string;
  title: string;
  hint?: string;
  options: [string, string, string];
  tier: L3Tier;
}

export interface L3Answer {
  questionId: string;
  p1: ChoiceIdx;
  p2: ChoiceIdx;
}

export interface L3ConsentSide {
  entered: boolean;
  q1: boolean;
  q2: boolean;
  q3: boolean;
}

export interface L3Consent {
  p1: L3ConsentSide;
  p2: L3ConsentSide;
  approved: boolean;
}
