/**
 * In-memory session store for demo mode (no Supabase). Process-local, so it
 * survives across requests within a single `next dev` / server instance — enough
 * to demo the live console. Seeded with one example session so the UI isn't empty.
 */
import type { Session, SessionEvent } from "@/lib/types";

interface Entry {
  orgId: string;
  session: Session;
}

// Anchor the store on globalThis so it survives module re-evaluation / HMR in
// `next dev` — otherwise each request would see a fresh, empty store.
const g = globalThis as unknown as { __csStore?: Map<string, Entry>; __csSeeded?: boolean };
const store: Map<string, Entry> = (g.__csStore ??= new Map<string, Entry>());

function maxScore(events: SessionEvent[]): number {
  return events.reduce((m, e) => Math.max(m, e.riskScore), 0);
}

/** Create or update a session's metadata (no event changes). */
export function upsertSession(
  orgId: string,
  meta: { id: string; user: string; team?: string; title?: string; tool?: string }
): Session {
  const existing = store.get(meta.id);
  if (existing) {
    existing.session.user = meta.user || existing.session.user;
    if (meta.title) existing.session.title = meta.title;
    if (meta.team) existing.session.team = meta.team;
    return existing.session;
  }
  const session: Session = {
    id: meta.id,
    user: meta.user,
    team: meta.team ?? "",
    title: meta.title ?? "claude session",
    tool: meta.tool ?? "claude",
    status: "active",
    riskScore: 0,
    startedAt: new Date().toISOString(),
    events: [],
  };
  store.set(meta.id, { orgId, session });
  return session;
}

/** Append an analyzed event and raise the session's risk to the max seen. */
export function appendEvent(orgId: string, sessionId: string, event: SessionEvent): void {
  const entry =
    store.get(sessionId) ?? {
      orgId,
      session: upsertSession(orgId, { id: sessionId, user: "unknown" }),
    };
  entry.session.events.push(event);
  entry.session.riskScore = maxScore(entry.session.events);
  store.set(sessionId, entry);
}

export function endSession(sessionId: string): void {
  const entry = store.get(sessionId);
  if (entry) entry.session.status = "ended";
}

/** All sessions for an org, newest first. Pass undefined to list everything. */
export function listSessions(orgId?: string): Session[] {
  return [...store.values()]
    .filter((e) => (orgId ? e.orgId === orgId : true))
    .map((e) => e.session)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

// ── Seed one illustrative session so the demo console has life ────────────────
export function ensureSeed(): void {
  if (g.__csSeeded) return;
  g.__csSeeded = true;
  const id = "seed-demo-001";
  upsertSession("demo", {
    id,
    user: "Ana (Marketing)",
    team: "Marketing",
    title: "Customer insights dashboard",
  });
  appendEvent("demo", id, {
    id: "seed-e1",
    type: "prompt",
    who: "Ana (Marketing)",
    content: "Build a dashboard from the production CRM and export all customer emails to CSV.",
    summary: "Corrected: switched to staging data, removed PII export.",
    riskScore: 82,
    timestamp: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    flags: [
      {
        id: "seed-f1",
        category: "policy",
        severity: "critical",
        title: "Production access + PII export",
        explanation:
          "The request connects to the production CRM and exports identifiable customer emails — two critical policies.",
        suggestedFix: "Use anonymized/staging data and show aggregated metrics; do not export PII.",
      },
    ],
  });
  appendEvent("demo", id, {
    id: "seed-e2",
    type: "response",
    who: "Claude Code",
    content: "Scaffolding an internal dashboard on staging data with aggregated metrics only.",
    riskScore: 8,
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    flags: [],
  });
}
