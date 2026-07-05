import type {
  Gender,
  L2Answer,
  L2Category,
  L2ReactionPair,
  L3Answer,
  L3Consent,
  Choice,
} from "./types";
import { log } from "./log";

export interface PlaySession {
  p1: { name: string; gender: Gender };
  p2: { name: string; gender: Gender };
  startedAt: number;
  level: 1 | 2 | 3;
  mode?: "pass-device" | "remote";
  l1QuestionIds: string[];
  l1Answers: { questionId: string; p1: Choice; p2: Choice }[];
  l2Category?: L2Category;
  l2QuestionIds?: string[];
  l2Answers?: L2Answer[];
  l2Reactions?: Record<string, L2ReactionPair>;
  /** Per-player L2 lifecycle. */
  l2P1Done?: string[];
  l2P2Done?: string[];
  l2Turn?: 1 | 2;
  l3Consent?: L3Consent;
  l3Answers?: L3Answer[];
  l3Source?: "ai" | "upload" | "hybrid";
  l3DeckIds?: string[];
  l3P1Done?: string[];
  l3P2Done?: string[];
  l3Turn?: 1 | 2;
  l1Phase?: any;
  l2Stage?: any;
  l3Stage?: any;
  ritual?: {
    p1: { learned: string; appreciated: string; curious: string };
    p2: { learned: string; appreciated: string; curious: string };
  };
}

const KEY = "knowem.play.session";

function isValid(s: unknown): s is PlaySession {
  if (!s || typeof s !== "object") return false;
  const x = s as Record<string, unknown>;
  return (
    !!x.p1 &&
    !!x.p2 &&
    typeof (x.p1 as { name?: unknown }).name === "string" &&
    typeof (x.p2 as { name?: unknown }).name === "string" &&
    Array.isArray(x.l1QuestionIds) &&
    Array.isArray(x.l1Answers)
  );
}

export function savePlay(s: PlaySession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota */
  }
}
export function loadPlay(): PlaySession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValid(parsed)) {
      log("storage", "play-session corrupted; clearing", { len: raw.length });
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
      return null;
    }
    return parsed;
  } catch {
    log("storage", "play-session JSON parse error; clearing");
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}
export function clearPlay() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
export function updatePlay(patch: (s: PlaySession) => PlaySession): PlaySession | null {
  const cur = loadPlay();
  if (!cur) return null;
  const next = patch(cur);
  savePlay(next);
  return next;
}
