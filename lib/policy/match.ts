/**
 * Match a Claude Code tool call against a policy's permission rules.
 *
 * Rules use Claude Code's permission syntax: "Tool(glob)" (e.g. "Bash(rm -rf *)",
 * "Write(**\/*.env)", "Read(./.env)") or a bare tool name ("WebFetch") that matches
 * any use of that tool. "*" and "**" are wildcards. This lets the live guard endpoint
 * (app/api/guard) enforce the SAME declarative rules that used to be baked into
 * settings.json — but resolved fresh on every tool call.
 */
import type { Policy } from "@/lib/policy/catalog";

export type GuardDecision = "deny" | "ask" | "allow";

interface ParsedRule {
  tool: string;
  /** undefined → bare tool rule (matches any input). */
  pattern?: string;
}

function parseRule(rule: string): ParsedRule | null {
  const withArg = /^([A-Za-z]+)\((.*)\)$/.exec(rule.trim());
  if (withArg) return { tool: withArg[1], pattern: withArg[2] };
  if (/^[A-Za-z]+$/.test(rule.trim())) return { tool: rule.trim() };
  return null;
}

/** Convert a permission glob (`*`, `**`) into an anchored, case-insensitive regex. */
function globToRegex(glob: string): RegExp {
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      while (glob[i + 1] === "*") i++; // collapse runs of *
      out += ".*";
    } else {
      out += c.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
    }
  }
  return new RegExp(`^${out}$`, "i");
}

/** The string a rule's glob is matched against, per tool. */
function targetFor(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "Bash":
      return String(input.command ?? "");
    case "Read":
    case "Write":
    case "Edit":
    case "MultiEdit":
      return String(input.file_path ?? "");
    case "NotebookEdit":
      return String(input.notebook_path ?? input.file_path ?? "");
    case "WebFetch":
      return String(input.url ?? "");
    default:
      return "";
  }
}

function ruleMatches(rule: string, toolName: string, target: string): boolean {
  const p = parseRule(rule);
  if (!p || p.tool !== toolName) return false;
  if (p.pattern === undefined || p.pattern === "") return true;
  return globToRegex(p.pattern).test(target);
}

/**
 * Resolve a tool call against a set of effective policies. Deny wins over ask;
 * returns the deciding policy so the caller can explain why.
 */
export function guardToolCall(
  policies: Policy[],
  toolName: string,
  input: Record<string, unknown>
): { decision: GuardDecision; policy?: Policy } {
  const target = targetFor(toolName, input);

  for (const p of policies) {
    if ((p.rules.deny ?? []).some((r) => ruleMatches(r, toolName, target))) {
      return { decision: "deny", policy: p };
    }
  }
  for (const p of policies) {
    if ((p.rules.ask ?? []).some((r) => ruleMatches(r, toolName, target))) {
      return { decision: "ask", policy: p };
    }
  }
  return { decision: "allow" };
}
