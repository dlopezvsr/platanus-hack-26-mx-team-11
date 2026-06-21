/**
 * Environment configuration. Everything degrades gracefully: with no Supabase
 * vars the app runs in demo mode (in-memory store, no auth, the dev key works).
 */

// Accept both the NEXT_PUBLIC_* names (build-time inlined) and the non-prefixed
// names the Vercel↔Supabase integration provides (read at runtime). `||` lets
// blank values fall through, so it works whichever names the host populates.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

/** True only when both the URL and anon key are present. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** True when the ingest endpoint can write with the service role. */
export const hasServiceRole = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
export const hasAnthropic = Boolean(ANTHROPIC_API_KEY);

/** Deny critical PreToolUse actions outright when true. Default: flag only. */
export const blockCritical = process.env.CS_BLOCK_CRITICAL === "true";

/** The built-in development key accepted in demo mode. */
export const DEV_KEY = "cs_dev_local";

/**
 * Optional static token → identity map (JSON in CODESENTINEL_KEYS). Lets you run
 * real ingest without a database. Shape: { "<token>": { name, team?, org? } }.
 */
export interface StaticIdentity {
  name: string;
  team?: string;
  org?: string;
  /** Maps the key to a seeded demo member so group policies apply (demo mode). */
  memberId?: string;
  policyIds?: string[];
}

export function staticKeys(): Record<string, StaticIdentity> {
  const raw = process.env.CODESENTINEL_KEYS;
  const base: Record<string, StaticIdentity> = {
    // The dev key acts as Ana (member m1, Marketing). Her effective policies come
    // entirely from the groups she's in, so editing groups in the UI changes what
    // /api/evaluate enforces for this key — live.
    [DEV_KEY]: { name: "Ana Rivera", team: "Marketing", org: "demo", memberId: "m1" },
  };
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Record<string, StaticIdentity>;
    return { ...base, ...parsed };
  } catch {
    console.warn("[codesentinel] CODESENTINEL_KEYS is not valid JSON — ignoring.");
    return base;
  }
}
