import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { RiskFlag, SessionEvent } from "@/lib/types";
import { resolveIdentity, type Identity } from "@/lib/auth/identity";
import { effectivePolicies } from "@/lib/policy/effective";
import { evaluateRequest, type RequestEvaluation } from "@/lib/risk/evaluateRequest";
import { recordEvent, recordSession } from "@/lib/repo/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pre-request hook (Claude Code UserPromptSubmit). Reviews the request BEFORE the
 * agent runs and either injects safe context, reformulates, or blocks — then logs
 * the decision for the console. See docs/governance-spec.md §5.
 */
export async function POST(req: Request) {
  const identity = await resolveIdentity(req.headers.get("authorization"));
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { session_id?: string; prompt?: string };
  try {
    body = (await req.json()) as { session_id?: string; prompt?: string };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const prompt = body.prompt ?? "";
  const sessionId = body.session_id ?? `eval-${randomUUID()}`;
  if (!prompt.trim()) {
    return NextResponse.json(passThrough(""));
  }

  const policies = await effectivePolicies(identity);
  const evaluation = await evaluateRequest(prompt, policies);

  // Log the decision for the dashboard (fire-and-forget; never block on it).
  void logDecision(identity, sessionId, prompt, evaluation).catch(() => {});

  if (evaluation.decision === "blocked") {
    return NextResponse.json({
      decision: "block",
      reason: `Sentinel blocked this request. ${evaluation.reason ?? ""}`.trim(),
    });
  }
  return NextResponse.json(passThrough(evaluation.injectedContext));
}

/** Claude Code UserPromptSubmit "add context and continue" output. */
function passThrough(additionalContext: string) {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  };
}

const SEVERITY_SCORE = { info: 12, warning: 55, critical: 85 } as const;

async function logDecision(
  identity: Identity,
  sessionId: string,
  prompt: string,
  evaluation: RequestEvaluation
): Promise<void> {
  await recordSession(identity, { id: sessionId, title: prompt.split(/\s+/).slice(0, 7).join(" ") });

  const flags: RiskFlag[] = [];
  if (evaluation.decision === "corrected" || evaluation.decision === "blocked") {
    flags.push({
      id: randomUUID(),
      category: "policy",
      severity: evaluation.severity === "critical" ? "critical" : "high",
      title:
        evaluation.decision === "blocked"
          ? "Request blocked"
          : "Request corrected before sending",
      explanation:
        evaluation.decision === "blocked"
          ? evaluation.reason ?? "No safe alternative existed."
          : `Adjusted for safety: ${evaluation.note ?? "policy constraints applied."}`,
      suggestedFix: evaluation.safeRequest || evaluation.reason || "Policy constraints injected.",
    });
  }

  const event: SessionEvent = {
    id: randomUUID(),
    type: "prompt",
    who: identity.memberName,
    content: prompt,
    summary: decisionSummary(evaluation),
    riskScore: evaluation.policyIds.length ? SEVERITY_SCORE[evaluation.severity] : 0,
    timestamp: new Date().toISOString(),
    flags,
  };
  await recordEvent(identity, sessionId, event);
}

function decisionSummary(e: RequestEvaluation): string {
  switch (e.decision) {
    case "blocked":
      return "Blocked — no safe alternative.";
    case "corrected":
      return `Corrected — ${e.note || "policy constraints applied"}.`;
    case "enriched":
      return "Allowed with policy guidance injected.";
    default:
      return "Allowed.";
  }
}
