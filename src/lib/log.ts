/**
 * Lightweight, PII-safe client logger for session state transitions.
 *
 * Enabled when:
 *  - import.meta.env.DEV is true, OR
 *  - URL contains ?debug=1, OR
 *  - localStorage["knowem.debug"] === "1"
 *
 * Never log: names, emails, gender, free-text answers, session codes in full.
 * Codes are masked to KNM-•••• format. Anything passed through `redact()`
 * is replaced with its type + length.
 */

type Scope =
  | "session" // create / join / status
  | "presence" // partner connected / disconnected / reconnect
  | "round" // question advance, skip, timeout
  | "level" // L1 → L2 transitions, ritual, complete
  | "storage" // corruption recovery
  | "ui"; // viewer toggle, overlays

const STYLES: Record<Scope, string> = {
  session: "background:#A678C4;color:white;padding:1px 6px;border-radius:4px;",
  presence: "background:#10b981;color:white;padding:1px 6px;border-radius:4px;",
  round: "background:#0ea5e9;color:white;padding:1px 6px;border-radius:4px;",
  level: "background:#f59e0b;color:white;padding:1px 6px;border-radius:4px;",
  storage: "background:#ef4444;color:white;padding:1px 6px;border-radius:4px;",
  ui: "background:#6b7280;color:white;padding:1px 6px;border-radius:4px;",
};

let cachedEnabled: boolean | null = null;
function enabled(): boolean {
  if (cachedEnabled !== null) return cachedEnabled;
  if (typeof window === "undefined") return false;
  try {
    if (import.meta.env?.DEV) {
      cachedEnabled = true;
      return true;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") === "1") {
      try {
        window.localStorage.setItem("knowem.debug", "1");
      } catch {
        /* ignore */
      }
      cachedEnabled = true;
      return true;
    }
    cachedEnabled = window.localStorage.getItem("knowem.debug") === "1";
    return cachedEnabled;
  } catch {
    cachedEnabled = false;
    return false;
  }
}

/** Mask a session code to its prefix (e.g. KNM-7X29 → KNM-••••). */
export function maskCode(code: string | null | undefined): string {
  if (!code) return "—";
  const dash = code.indexOf("-");
  if (dash === -1) return code.length <= 3 ? code : code.slice(0, 2) + "…";
  return code.slice(0, dash + 1) + "•".repeat(Math.max(0, code.length - dash - 1));
}

/** Describe a value without leaking content. */
export function redact(v: unknown): string {
  if (v == null) return "∅";
  if (typeof v === "string") return `str(${v.length})`;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `arr(${v.length})`;
  if (typeof v === "object") return `obj(${Object.keys(v as object).length})`;
  return typeof v;
}

export function log(scope: Scope, event: string, data?: Record<string, unknown>) {
  if (!enabled()) return;
  const ts = new Date().toISOString().slice(11, 23);
  const safe = data
    ? Object.fromEntries(
        Object.entries(data).map(([k, v]) => [
          k,
          typeof v === "object" && v !== null ? JSON.stringify(v) : v,
        ]),
      )
    : undefined;

  console.log(`%c${scope}%c ${ts} ${event}`, STYLES[scope], "color:inherit", safe ?? "");
}
