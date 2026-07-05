import { GAME_CONFIG } from "@/config/gameConfig";
import type { L3Question } from "./types";

/**
 * Parse an uploaded question file into L3Question[].
 * Supported: .txt (one per line), .csv (first column), .json (flat string array).
 * All uploaded questions are tagged Regular tier.
 */
export async function parseUploadedQuestions(file: File): Promise<L3Question[]> {
  if (file.size > GAME_CONFIG.UPLOAD_MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File is too large. Maximum size is ${GAME_CONFIG.UPLOAD_MAX_SIZE_MB}MB.`);
  }
  const text = await file.text();
  const lower = file.name.toLowerCase();

  let titles: string[] = [];

  if (lower.endsWith(".json")) {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON file must contain a flat array of strings.");
      }
      titles = parsed
        .map((x) => {
          if (typeof x !== "string") {
            throw new Error("All items in JSON array must be strings.");
          }
          return x.trim();
        })
        .filter(Boolean);
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error("Failed to parse JSON file.");
    }
  } else if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    const isCsv = lower.endsWith(".csv");
    titles = text
      .split(/\r?\n/)
      .map((raw) => {
        const line = raw.trim();
        if (!line) return "";
        if (isCsv) {
          const first = line.split(",")[0]?.trim() ?? "";
          return first.replace(/^"(.*)"$/, "$1").replace(/""/g, '"');
        }
        return line;
      })
      .filter(Boolean);
  } else {
    throw new Error("Unsupported file extension. Only .txt, .csv, and .json files are supported.");
  }

  const validTitles = titles.filter((t) => t && t.length <= 240);
  if (validTitles.length === 0) {
    throw new Error("No valid questions found. Ensure questions are under 240 characters.");
  }

  return validTitles.slice(0, GAME_CONFIG.UPLOAD_MAX_QUESTIONS).map((title, i) => ({
    id: `upload-${i}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    options: ["", "", ""] as [string, string, string],
    tier: "regular" as const,
  }));
}
