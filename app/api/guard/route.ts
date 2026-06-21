import { NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/auth/identity";
import { effectivePolicies } from "@/lib/policy/effective";
import { guardToolCall } from "@/lib/policy/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live PreToolUse guard. The codesentinel-guard.sh hook POSTs each tool call here
 * BEFORE it runs; we resolve the member's *current* effective policies (org ∪
 * groups) and return Claude Code's permission decision. Because policies are read
 * fresh on every call, admin changes take effect immediately — no re-install of
 * settings.json, no stale baked-in rules.
 */
export async function POST(req: Request) {
  const identity = await resolveIdentity(req.headers.get("authorization"));
  // Fail open on auth problems so an outage never hard-blocks the agent.
  if (!identity) return NextResponse.json(allow());

  let body: { tool_name?: string; tool_input?: Record<string, unknown> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(allow());
  }

  const toolName = body.tool_name ?? "";
  const input = body.tool_input ?? {};
  if (!toolName) return NextResponse.json(allow());

  const policies = await effectivePolicies(identity);
  const { decision, policy } = guardToolCall(policies, toolName, input);

  if (decision === "deny") {
    return NextResponse.json(
      preToolUse("deny", `Sentinel blocked this: "${policy?.label}". ${policy?.correctionStrategy ?? ""}`.trim())
    );
  }
  if (decision === "ask") {
    return NextResponse.json(
      preToolUse("ask", `Sentinel requires approval — policy "${policy?.label}".`)
    );
  }
  return NextResponse.json(allow());
}

/** Claude Code PreToolUse permission output. */
function preToolUse(permissionDecision: "deny" | "ask", permissionDecisionReason: string) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision,
      permissionDecisionReason,
    },
  };
}

/** No opinion — let Claude Code's normal flow / other rules decide. */
function allow() {
  return { continue: true };
}
