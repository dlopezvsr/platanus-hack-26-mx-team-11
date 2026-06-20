import { NextResponse } from "next/server";
import { bearerFrom, lookupUserByApiKey } from "@/lib/auth/apiKeys";
import { processHookEvent } from "@/lib/ingest/process";
import type { ClaudeHookEvent } from "@/lib/ingest/claudeHooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Receives Claude Code hook events. One endpoint, all event types. */
export async function POST(req: Request) {
  const user = lookupUserByApiKey(bearerFrom(req.headers.get("authorization")));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let event: ClaudeHookEvent;
  try {
    event = (await req.json()) as ClaudeHookEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!event?.session_id || !event?.hook_event_name) {
    return NextResponse.json({ error: "missing session_id or hook_event_name" }, { status: 400 });
  }

  const result = await processHookEvent(user, event);

  // Tell Claude Code to deny the tool call when a critical rule trips and
  // blocking is enabled. Otherwise acknowledge and let it proceed.
  if (result.blocked) {
    return NextResponse.json({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `CodeSentinel blocked this: ${result.reason}`,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
