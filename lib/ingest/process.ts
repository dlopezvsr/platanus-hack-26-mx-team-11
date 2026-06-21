import { normalizeClaudeHookEvent, type ClaudeHookEvent } from "@/lib/ingest/claudeHooks";
import { analyzeEvent, highestSeverity, scoreForSeverity, strictestAction } from "@/lib/risk/engine";
import { store } from "@/lib/store";
import type { IngestResult, SessionEvent, User } from "@/lib/types";

const eventHash = (user: User, event: ReturnType<typeof normalizeClaudeHookEvent>) =>
  [
    user.orgId,
    user.id,
    event.sessionId,
    event.hookEventName,
    event.content,
    Math.floor(event.timestamp / 1000),
  ].join("|");

export async function processHookEvent(user: User, rawEvent: ClaudeHookEvent): Promise<IngestResult> {
  const domainEvent = normalizeClaudeHookEvent(rawEvent);
  const hash = eventHash(user, domainEvent);
  if (store.hasEvent(hash)) {
    const duplicate: SessionEvent = {
      id: `${domainEvent.id}:duplicate`,
      type: domainEvent.type,
      who: user.name,
      timestamp: domainEvent.timestamp,
      content: "Duplicate hook event ignored.",
      riskScore: 0,
      flags: [],
    };
    const session = store.upsertSessionEvent(user, domainEvent, duplicate);
    return { blocked: false, session, event: duplicate };
  }
  store.rememberEvent(hash);

  const rules = store.activeRulesForUser(user);
  const flags = analyzeEvent(domainEvent, rules);
  const severity = highestSeverity(flags);
  const riskScore = severity ? scoreForSeverity(severity) : 0;
  const event: SessionEvent = {
    id: domainEvent.id,
    type: domainEvent.type,
    who: user.name,
    timestamp: domainEvent.timestamp,
    content: domainEvent.content,
    summary: domainEvent.summary,
    riskScore,
    flags,
  };
  const session = store.upsertSessionEvent(user, domainEvent, event);
  const action = strictestAction(flags);
  const blockingEnabled = process.env.CS_BLOCK_CRITICAL === "true";
  const blocked = blockingEnabled && action === "block" && rawEvent.hook_event_name === "PreToolUse";
  return {
    blocked,
    reason: blocked ? flags.find((flag) => flag.action === "block")?.explanation : undefined,
    session,
    event,
  };
}

