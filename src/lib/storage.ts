import { z } from "zod";
import { questionsArraySchema } from "./schema";
import { SEED_QUESTIONS } from "./questions.seed";
import type { Question, CompatibilityResult } from "./types";

const KEYS = {
  questions: "knowem.questions",
  lastResult: "knowem.lastResult",
  sessionsPlayed: "knowem.sessionsPlayed",
  participantPrefix: "knowem.participant.",
  waitlistSubmitted: "knowem.waitlist.submitted",
} as const;

const isBrowser = () => typeof window !== "undefined";

function safeRead<T>(key: string, schema: z.ZodType<T>): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      window.localStorage.removeItem(key);
      return null;
    }
    return result.data;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
}

function safeWrite(key: string, value: unknown) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function loadQuestions(): Question[] {
  const stored = safeRead(KEYS.questions, questionsArraySchema);
  if (stored && stored.length > 0) return stored as Question[];
  safeWrite(KEYS.questions, SEED_QUESTIONS);
  return SEED_QUESTIONS;
}

const resultSchema = z.object({
  score: z.number(),
  label: z.string(),
  shared: z.array(z.object({ questionId: z.string(), title: z.string(), chosen: z.string() })),
  differences: z.array(
    z.object({ questionId: z.string(), title: z.string(), a: z.string(), b: z.string() }),
  ),
  p1Tags: z.array(z.string()),
  p2Tags: z.array(z.string()),
  p1TraitTotals: z.record(z.string(), z.number()),
  p2TraitTotals: z.record(z.string(), z.number()),
  insights: z.array(z.string()),
  alignment: z.object({
    strong: z.array(z.any()),
    discuss: z.array(z.any()),
    conflict: z.array(z.any()),
  }),
  discussionStarters: z.array(z.string()),
  skippedCount: z.number(),
  answeredCount: z.number(),
});

export type StoredResult = CompatibilityResult & {
  p1Name: string;
  p2Name: string;
  sessionCode?: string;
};

export function loadLastResult(): StoredResult | null {
  const schema = resultSchema.extend({
    p1Name: z.string(),
    p2Name: z.string(),
    sessionCode: z.string().optional(),
  });
  return safeRead(KEYS.lastResult, schema) as never;
}
export function saveLastResult(r: StoredResult) {
  safeWrite(KEYS.lastResult, r);
}

export function incrementSessions(): number {
  const current = safeRead(KEYS.sessionsPlayed, z.number()) ?? 0;
  const next = current + 1;
  safeWrite(KEYS.sessionsPlayed, next);
  return next;
}

// Per-session participant binding (which slot I am on this device)
const participantSchema = z.object({
  slot: z.union([z.literal(1), z.literal(2)]),
  name: z.string(),
});
export function setParticipant(code: string, slot: 1 | 2, name: string) {
  safeWrite(KEYS.participantPrefix + code, { slot, name });
}
export function getParticipant(code: string): { slot: 1 | 2; name: string } | null {
  return safeRead(KEYS.participantPrefix + code, participantSchema);
}
export function clearParticipant(code: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(KEYS.participantPrefix + code);
  } catch {
    /* ignore */
  }
}

export function markWaitlistSubmitted(source: string) {
  if (!isBrowser()) return;
  try {
    const raw = window.localStorage.getItem(KEYS.waitlistSubmitted);
    const set: Record<string, true> = raw ? JSON.parse(raw) : {};
    set[source] = true;
    window.localStorage.setItem(KEYS.waitlistSubmitted, JSON.stringify(set));
  } catch {
    /* ignore */
  }
}
export function hasSubmittedWaitlist(source: string): boolean {
  if (!isBrowser()) return false;
  try {
    const raw = window.localStorage.getItem(KEYS.waitlistSubmitted);
    if (!raw) return false;
    return !!JSON.parse(raw)[source];
  } catch {
    return false;
  }
}
