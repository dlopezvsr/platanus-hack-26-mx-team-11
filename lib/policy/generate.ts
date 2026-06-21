/**
 * Generate the `~/.claude/settings.json` an agent needs to be governed by
 * CodeSentinel: the declarative permission rules from the selected policies plus
 * the hooks that (a) review each request before it runs and (b) stream activity
 * to the console for observability.
 */
import type { Policy } from "@/lib/policy/catalog";

export type AuthConfig =
  | { kind: "token"; token: string }
  | { kind: "env"; envVar: string };

export interface BuildSettingsInput {
  endpoint: string;
  policies: Policy[];
  auth: AuthConfig;
  /** Claude Code default permission mode. */
  defaultMode?: "default" | "acceptEdits" | "plan";
}

export interface ClaudeHook {
  type: "command";
  command: string;
}
export interface HookMatcher {
  matcher?: string;
  hooks: ClaudeHook[];
}
export interface GeneratedSettings {
  permissions: { deny?: string[]; ask?: string[]; defaultMode?: string };
  hooks: Record<string, HookMatcher[]>;
}

/** Filter the library down to a set of ids, preserving catalog order. */
export function resolvePolicies(all: Policy[], ids: string[]): Policy[] {
  const want = new Set(ids);
  return all.filter((p) => want.has(p.id));
}

/** Render the Authorization header value for the chosen auth mode. */
function authHeader(auth: AuthConfig): string {
  return auth.kind === "token"
    ? `Authorization: Bearer ${auth.token}`
    : `Authorization: Bearer $${auth.envVar}`;
}

/** A curl one-liner that POSTs the hook's stdin JSON to a CodeSentinel route. */
function post(endpoint: string, path: string, auth: AuthConfig): ClaudeHook {
  const url = `${endpoint.replace(/\/$/, "")}${path}`;
  return {
    type: "command",
    command:
      `curl -fsS -m 12 -X POST ${url} ` +
      `-H "${authHeader(auth)}" -H "content-type: application/json" --data-binary @-`,
  };
}

/** Where the live guard script is installed (under $HOME). */
export const GUARD_SCRIPT_PATH = "$HOME/.claude/codesentinel-guard.sh";

export function buildSettings(input: BuildSettingsInput): GeneratedSettings {
  const { endpoint, auth, defaultMode = "default" } = input;

  // NOTE: deny/ask rules are intentionally NOT baked in here. They used to be
  // frozen at install time and went stale whenever an admin changed policies.
  // Enforcement now happens live in the PreToolUse guard below, which fetches the
  // member's current effective policies on every tool call.
  const permissions: GeneratedSettings["permissions"] = { defaultMode };

  return {
    permissions,
    hooks: {
      // Pre-request governance: review (and possibly rewrite/block) before send.
      UserPromptSubmit: [{ hooks: [post(endpoint, "/api/evaluate", auth)] }],
      // PreToolUse: live policy guard (deny/ask) THEN observability stream.
      PreToolUse: [
        {
          matcher: "*",
          hooks: [{ type: "command", command: GUARD_SCRIPT_PATH }, post(endpoint, "/api/ingest", auth)],
        },
      ],
      PostToolUse: [{ matcher: "*", hooks: [post(endpoint, "/api/ingest", auth)] }],
      Stop: [{ hooks: [post(endpoint, "/api/ingest", auth)] }],
    },
  };
}

/**
 * The guard script the installer drops at $HOME/.claude/codesentinel-guard.sh.
 * On every tool call it POSTs the PreToolUse payload to /api/guard, which resolves
 * the latest policies and returns a permission decision. Fails open on any error
 * so a network blip never hard-blocks the agent.
 */
export function buildGuardScript(endpoint: string, auth: AuthConfig): string {
  const url = `${endpoint.replace(/\/$/, "")}/api/guard`;
  const tokenLine =
    auth.kind === "token" ? `TOKEN="${auth.token}"` : `TOKEN="$${auth.envVar}"`;
  return `#!/bin/sh
# CodeSentinel live policy guard. Runs on every Claude Code tool call (PreToolUse).
# It fetches your CURRENT policies from the server and enforces them — so changes
# your admin makes apply immediately, with no re-install. Safe to inspect.
${tokenLine}
URL="${url}"
OUT=$(curl -fsS -m 12 -X POST "$URL" \\
  -H "Authorization: Bearer $TOKEN" -H "content-type: application/json" \\
  --data-binary @- 2>/dev/null)
# Fail open: on any network/server error, emit nothing and let the call proceed.
[ -n "$OUT" ] && printf '%s' "$OUT"
exit 0
`;
}
