import type { DomainEvent, EventType } from "@/lib/types";

export interface ClaudeHookEvent {
  session_id: string;
  hook_event_name: string;
  cwd?: string;
  transcript_path?: string;
  prompt?: string;
  tool_name?: string;
  tool_input?: unknown;
  message?: string;
  [key: string]: unknown;
}

const typeForHook = (eventName: string): EventType => {
  if (eventName === "UserPromptSubmit") return "prompt";
  if (eventName === "PreToolUse") return "tool_call";
  if (eventName === "Stop" || eventName === "SessionEnd") return "response";
  return "response";
};

const compactJson = (value: unknown) => {
  if (!value) return "";
  try {
    return JSON.stringify(value).slice(0, 1000);
  } catch {
    return String(value).slice(0, 1000);
  }
};

export function normalizeClaudeHookEvent(event: ClaudeHookEvent): DomainEvent {
  const timestamp = Date.now();
  const type = typeForHook(event.hook_event_name);
  const toolText = [event.tool_name, compactJson(event.tool_input)].filter(Boolean).join(" ");
  const content =
    event.prompt ||
    toolText ||
    event.message ||
    `${event.hook_event_name} event received`;

  return {
    id: `${event.session_id}:${event.hook_event_name}:${timestamp}`,
    sessionId: event.session_id,
    type,
    provider: "claude_code",
    timestamp,
    content,
    summary: event.cwd ? `cwd: ${event.cwd}` : undefined,
    cwd: event.cwd,
    raw: event,
    hookEventName: event.hook_event_name,
  };
}

