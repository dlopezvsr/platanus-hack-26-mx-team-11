/**
 * Supabase config, read once. When absent the app runs in demo mode (in-memory,
 * no auth) so it builds and the tracking demo works without credentials.
 *
 * All Supabase access here is server-side, so we accept both the NEXT_PUBLIC_*
 * names (build-time inlined) and the non-prefixed names the Vercel↔Supabase
 * integration provides (read at runtime). `||` lets blank values fall through —
 * this is what makes it work no matter which key names your host populates.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

/** True when the client can talk to Supabase (auth + dashboard reads). */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** True when server-side writes (the ingest endpoint) can reach Supabase. */
export const isServiceConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
