import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { markWaitlistSubmitted } from "./storage";

export const WAITLIST_SOURCES = ["start", "result", "level2", "level3"] as const;
export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter your email")
  .max(255, "Email is too long")
  .email("Enter a valid email");

export async function joinWaitlist(
  email: string,
  source: WaitlistSource,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  const { error } = await supabase.from("waitlist").insert({ email: parsed.data, source });
  if (error) {
    // Treat duplicate as success — same email already in for this source.
    if (
      String(error.code) === "23505" ||
      String(error.message).toLowerCase().includes("duplicate")
    ) {
      markWaitlistSubmitted(source);
      return { ok: true };
    }
    return { ok: false, error: "Could not save right now. Try again in a moment." };
  }
  markWaitlistSubmitted(source);
  return { ok: true };
}
