import type { AgentKey, ConnectionStatus, DashboardEmployee, DomainEvent, Rule, Session, SessionEvent, User } from "@/lib/types";
import { DEMO_ORG_ID, seededAgentKeys, seededOrg, seededRoles, seededRules, seededUsers } from "@/lib/store/seed";

const severityScore = { low: 10, medium: 35, high: 70, critical: 95 } as const;
const STALE_AFTER_MS = 5 * 60 * 1000;

export class MemoryStore {
  private orgs = new Map([[seededOrg.id, seededOrg]]);
  private users = new Map(seededUsers.map((u) => [u.id, u]));
  private roles = new Map(seededRoles.map((r) => [r.id, r]));
  private rules = new Map(seededRules.map((r) => [r.id, r]));
  private agentKeys = new Map(seededAgentKeys.map((k) => [k.token, { ...k }]));
  private sessions = new Map<string, Session>();
  private eventHashes = new Set<string>();

  getDemoOrgId() {
    return DEMO_ORG_ID;
  }

  getDemoAdmin() {
    return this.users.get("u_cto");
  }

  lookupUserByToken(token?: string | null): { user: User; key: AgentKey } | null {
    if (!token) return null;
    const key = this.agentKeys.get(token);
    if (!key || key.status !== "active") return null;
    const user = this.users.get(key.userId);
    if (!user) return null;
    key.lastSeenAt = Date.now();
    this.agentKeys.set(token, key);
    return { user, key };
  }

  listSessions(orgId: string): Session[] {
    const now = Date.now();
    return [...this.sessions.values()]
      .filter((session) => session.orgId === orgId)
      .map((session) => ({
        ...session,
        connectionStatus: now - session.lastSeenAt > STALE_AFTER_MS ? "stale" : session.connectionStatus,
      }))
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  }

  listEmployees(orgId: string): DashboardEmployee[] {
    const now = Date.now();
    return [...this.users.values()]
      .filter((user) => user.orgId === orgId && user.kind === "vibe_coder")
      .map((user) => {
        const role = this.roleNameForUser(user);
        const keys = [...this.agentKeys.values()].filter((key) => key.userId === user.id && key.status === "active");
        const lastSeenAt = Math.max(0, ...keys.map((key) => key.lastSeenAt ?? 0));
        const userSessions = [...this.sessions.values()].filter((session) => session.userId === user.id);
        const activeSessionCount = userSessions.filter((session) => session.status === "active").length;
        const openFlagCount = userSessions.reduce(
          (count, session) => count + session.events.reduce((total, event) => total + event.flags.length, 0),
          0
        );
        const connectionStatus = this.connectionStatus(lastSeenAt, activeSessionCount, now);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
          connectionStatus,
          lastSeenAt: lastSeenAt || undefined,
          activeSessionCount,
          openFlagCount,
        };
      });
  }

  activeRulesForUser(user: User): Rule[] {
    const role = user.roleId ? this.roles.get(user.roleId) : undefined;
    return [...this.rules.values()].filter((rule) => {
      if (!rule.enabled || rule.orgId !== user.orgId) return false;
      if (rule.scope === "global") return true;
      if (rule.scope === "role") return Boolean(role && rule.targetId === role.id);
      if (rule.scope === "user") return rule.targetId === user.id;
      return false;
    });
  }

  roleNameForUser(user: User): string {
    return user.roleId ? this.roles.get(user.roleId)?.name ?? "Unassigned" : "Admin";
  }

  upsertSessionEvent(user: User, domainEvent: DomainEvent, event: SessionEvent): Session {
    const roleName = this.roleNameForUser(user);
    const existing = this.sessions.get(domainEvent.sessionId);
    const now = domainEvent.timestamp;
    const riskScore = Math.max(event.riskScore, existing?.riskScore ?? 0);
    const next: Session = {
      id: domainEvent.sessionId,
      orgId: user.orgId,
      userId: user.id,
      user: user.name,
      team: roleName,
      title: domainEvent.cwd?.split("/").filter(Boolean).pop() || domainEvent.sessionId,
      status: domainEvent.hookEventName === "SessionEnd" ? "ended" : "active",
      riskScore,
      startedAt: existing?.startedAt ?? now,
      lastSeenAt: now,
      connectionStatus: "active",
      events: [...(existing?.events ?? []), event],
    };
    this.sessions.set(domainEvent.sessionId, next);
    return next;
  }

  hasEvent(hash: string) {
    return this.eventHashes.has(hash);
  }

  rememberEvent(hash: string) {
    this.eventHashes.add(hash);
  }

  scoreForSeverity(severity: keyof typeof severityScore) {
    return severityScore[severity];
  }

  private connectionStatus(lastSeenAt: number, activeSessionCount: number, now: number): ConnectionStatus {
    if (!lastSeenAt) return "not_connected";
    if (now - lastSeenAt > STALE_AFTER_MS) return activeSessionCount > 0 ? "missing_hooks_suspected" : "stale";
    return "active";
  }
}
