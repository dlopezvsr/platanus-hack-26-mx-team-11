export type Severity = "low" | "medium" | "high" | "critical";
export type RiskCategory = "personal_data" | "unsafe_code" | "company_policy";
export type RiskAction = "flag" | "warn" | "require_approval" | "block";
export type EventType = "prompt" | "response" | "code_change" | "tool_call";

export type UserKind = "cto_admin" | "vibe_coder";
export type ConnectionStatus = "not_connected" | "active" | "stale" | "missing_hooks_suspected";

export interface Org {
  id: string;
  name: string;
  createdAt: number;
}

export interface Role {
  id: string;
  orgId: string;
  name: string;
  description: string;
  ruleIds: string[];
}

export interface User {
  id: string;
  orgId: string;
  roleId?: string;
  email: string;
  name: string;
  kind: UserKind;
}

export interface AgentKey {
  id: string;
  orgId: string;
  userId: string;
  token: string;
  label: string;
  status: "active" | "revoked";
  lastSeenAt?: number;
}

export interface Rule {
  id: string;
  orgId: string;
  scope: "global" | "role" | "user";
  targetId?: string;
  name: string;
  category: RiskCategory;
  severity: Severity;
  action: RiskAction;
  patterns: string[];
  explanation: string;
  suggestedFix: string;
  version: number;
  enabled: boolean;
}

export interface RiskFlag {
  id: string;
  category: RiskCategory;
  severity: Severity;
  action: RiskAction;
  title: string;
  explanation: string;
  suggestedFix: string;
  confidence: number;
  ruleId?: string;
  ruleVersion?: number;
}

export interface SessionEvent {
  id: string;
  type: EventType;
  who: string;
  timestamp: number;
  content: string;
  summary?: string;
  riskScore: number;
  flags: RiskFlag[];
}

export interface Session {
  id: string;
  orgId: string;
  userId: string;
  user: string;
  team: string;
  title: string;
  status: "active" | "ended";
  riskScore: number;
  startedAt: number;
  lastSeenAt: number;
  connectionStatus: ConnectionStatus;
  events: SessionEvent[];
}

export interface DashboardEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
  connectionStatus: ConnectionStatus;
  lastSeenAt?: number;
  activeSessionCount: number;
  openFlagCount: number;
}

export interface DomainEvent {
  id: string;
  sessionId: string;
  type: EventType;
  provider: "claude_code";
  timestamp: number;
  content: string;
  summary?: string;
  cwd?: string;
  raw: unknown;
  hookEventName: string;
}

export interface IngestResult {
  blocked: boolean;
  reason?: string;
  session: Session;
  event: SessionEvent;
}
