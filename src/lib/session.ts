import { supabase } from "@/integrations/supabase/client";
import { setParticipant, getParticipant } from "./storage";
import { log, maskCode } from "./log";
import type { Gender } from "./types";

export type SessionStatus = "waiting" | "playing" | "done" | "abandoned";

export interface SessionRow {
  id: string;
  code: string;
  creator_name: string;
  creator_gender: Gender;
  partner_name: string | null;
  partner_gender: Gender | null;
  question_ids: string[];
  status: SessionStatus;
  current_index: number;
  level: number;
  created_at: string;
  last_activity_at: string;
  // Supabase jsonb column used for all per-level ephemeral game state
  // (l2Stage, l2P1Done, l2Category, l3-*, etc). Was previously untyped,
  // which meant TypeScript couldn't catch real bugs here — see Changes.md.
  meta?: Record<string, any> | null;
}

export interface AnswerRow {
  id: string;
  session_id: string;
  question_id: string;
  player_slot: 1 | 2;
  choice: "A" | "B" | "SKIP";
  answered_at: string;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusables
function genCode(len = 4) {
  let s = "KNM-";
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export async function createSession(args: {
  creatorName: string;
  creatorGender: Gender;
  questionIds: string[];
}): Promise<SessionRow> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        code,
        creator_name: args.creatorName,
        creator_gender: args.creatorGender,
        question_ids: args.questionIds,
        status: "waiting",
        current_index: 0,
        level: 1,
      })
      .select()
      .single();
    if (!error && data) {
      setParticipant(code, 1, args.creatorName);
      log("session", "created", { code: maskCode(code), questions: args.questionIds.length });
      return data as SessionRow;
    }
    if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;
  }
  throw new Error("Could not allocate a session code, please try again.");
}

export async function getSessionByCode(code: string): Promise<SessionRow | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return (data as SessionRow) ?? null;
}

export async function joinSession(args: {
  code: string;
  partnerName: string;
  partnerGender: Gender;
}): Promise<SessionRow> {
  const existing = await getSessionByCode(args.code);
  if (!existing) throw new Error("Session not found. Check the code and try again.");
  if (existing.status === "abandoned") throw new Error("This session has ended.");
  if (existing.status === "done") throw new Error("This session is already complete.");

  // If partner already filled and the same device joined before, just rebind.
  if (existing.partner_name) {
    const me = getParticipant(existing.code);
    if (me?.slot === 2) {
      log("presence", "rejoin (same device)", {
        code: maskCode(existing.code),
        slot: 2,
        status: existing.status,
      });
      return existing;
    }
    // Allow rejoin from a fresh device — keep their stored name, no overwrite.
    setParticipant(existing.code, 2, existing.partner_name);
    log("presence", "rejoin (new device)", {
      code: maskCode(existing.code),
      slot: 2,
      status: existing.status,
    });
    return existing;
  }

  const { data, error } = await supabase
    .from("sessions")
    .update({
      partner_name: args.partnerName,
      partner_gender: args.partnerGender,
      status: "playing",
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select()
    .single();
  if (error) throw error;
  setParticipant(args.code, 2, args.partnerName);
  log("session", "joined", { code: maskCode(args.code), slot: 2, status: "playing" });
  return data as SessionRow;
}

export async function submitAnswer(args: {
  sessionId: string;
  questionId: string;
  slot: 1 | 2;
  choice: "A" | "B" | "SKIP";
}) {
  const { error } = await supabase.from("session_answers").upsert(
    {
      session_id: args.sessionId,
      question_id: args.questionId,
      player_slot: args.slot,
      choice: args.choice,
    },
    { onConflict: "session_id,question_id,player_slot" },
  );
  if (error) throw error;
  // bump activity (non-blocking)
  void supabase
    .from("sessions")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", args.sessionId);
}

export async function fetchAnswers(sessionId: string): Promise<AnswerRow[]> {
  const { data, error } = await supabase
    .from("session_answers")
    .select("*")
    .eq("session_id", sessionId)
    .order("answered_at", { ascending: true });
  if (error) throw error;
  return (data as AnswerRow[]) ?? [];
}

export async function advanceIndex(sessionId: string, expected: number) {
  // Only one client wins the race thanks to the equality filter.
  const { data, error } = await supabase
    .from("sessions")
    .update({ current_index: expected + 1, last_activity_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("current_index", expected)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as SessionRow | null;
}

export async function setSessionStatus(sessionId: string, status: SessionStatus) {
  const { error } = await supabase
    .from("sessions")
    .update({ status, last_activity_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
  log("session", "status changed", { status });
}

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

export function subscribeSession(
  sessionId: string,
  onSession: (s: SessionRow) => void,
  onAnswer: (a: AnswerRow) => void,
  onStatus?: (status: RealtimeStatus) => void,
) {
  // Unique channel name per call so React StrictMode / remounts never collide
  // on a shared, already-SUBSCRIBED channel (which would throw on `.on()`).
  const uniq = Math.random().toString(36).slice(2, 8);
  const channelName = `session:${sessionId}:${uniq}`;
  log("presence", "realtime subscribe", { sessionId: sessionId.slice(0, 8), ch: uniq });
  onStatus?.("connecting");
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
      (payload) => {
        if (payload.new) {
          const next = payload.new as SessionRow;
          log("presence", "session updated", {
            status: next.status,
            currentIndex: next.current_index,
            level: next.level,
            partner: next.partner_name ? "present" : "absent",
          });
          onSession(next);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "session_answers",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        if (payload.new) {
          const a = payload.new as AnswerRow;
          log("round", "answer received", { slot: a.player_slot, choice: a.choice });
          onAnswer(a);
        }
      },
    )
    .subscribe((status) => {
      log("presence", "channel status", { status });
      if (status === "SUBSCRIBED") onStatus?.("connected");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED")
        onStatus?.("disconnected");
    });
  return () => {
    log("presence", "realtime unsubscribe", { sessionId: sessionId.slice(0, 8), ch: uniq });
    try {
      void supabase.removeChannel(channel);
    } catch {
      /* noop */
    }
  };
}

// Count consecutive trailing skips for a slot (most recent N answered questions in question order).
export function consecutiveSkipsForSlot(
  questionIds: string[],
  upToIndex: number, // number of questions whose round has fully advanced (exclusive of current)
  answers: AnswerRow[],
  slot: 1 | 2,
): number {
  let count = 0;
  for (let i = upToIndex - 1; i >= 0; i--) {
    const qid = questionIds[i];
    const ans = answers.find((a) => a.question_id === qid && a.player_slot === slot);
    if (ans && ans.choice === "SKIP") count++;
    else break;
  }
  return count;
}

export async function updateSessionLevelAndMeta(
  sessionId: string,
  level: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: Record<string, any>,
) {
  const { error } = await supabase
    .from("sessions")
    .update({
      level,
      meta,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) throw error;
  log("session", "level/meta updated", { level });
}