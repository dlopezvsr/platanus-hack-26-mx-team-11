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

// ── Seed two illustrative sessions so the demo console shows both states ──────
export function ensureSeed(): void {
  if (g.__csSeeded) return;
  g.__csSeeded = true;

  // Session 1 — active: flagged prompt, currently in progress.
  const id1 = "seed-demo-001";
  upsertSession("demo", {
    id: id1,
    user: "Ana (Marketing)",
    team: "Marketing",
    title: "Customer insights dashboard",
  });
  appendEvent("demo", id1, {
    id: "seed-e1",
    type: "prompt",
    who: "Ana (Marketing)",
    content: "Build a dashboard from the production CRM and export all customer emails to CSV.",
    summary: "Corrected — switched to staging data, PII export removed.",
    riskScore: 82,
    timestamp: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    flags: [
      {
        id: "seed-f1",
        category: "policy",
        severity: "critical",
        title: "Acceso a producción + exportación de PII",
        explanation:
          "La solicitud conecta al CRM productivo y exporta correos identificables de clientes — dos políticas críticas activadas.",
        suggestedFix: "Usa datos anonimizados de staging y muestra métricas agregadas; no exportes PII.",
      },
    ],
  });
  appendEvent("demo", id1, {
    id: "seed-e2",
    type: "tool_call",
    who: "Claude Code",
    content: "Read file_path=\"src/db/client.ts\"",
    summary: "Allowed.",
    riskScore: 4,
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    flags: [],
  });
  appendEvent("demo", id1, {
    id: "seed-e3",
    type: "response",
    who: "Claude Code",
    content: "Scaffolding an internal dashboard on staging data with aggregated metrics only.",
    riskScore: 8,
    timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    flags: [],
  });

  // Session 2 — ended: clean session, no flags, completed normally.
  const id2 = "seed-demo-002";
  upsertSession("demo", {
    id: id2,
    user: "Bruno (Finance)",
    team: "Finance",
    title: "Q2 budget reconciliation script",
  });
  appendEvent("demo", id2, {
    id: "seed-e4",
    type: "prompt",
    who: "Bruno (Finance)",
    content: "Write a script to reconcile the Q2 budget spreadsheet with the accounting system export.",
    summary: "Allowed.",
    riskScore: 10,
    timestamp: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    flags: [],
  });
  appendEvent("demo", id2, {
    id: "seed-e5",
    type: "tool_call",
    who: "Claude Code",
    content: "Write file_path=\"scripts/reconcile_q2.py\"",
    summary: "Allowed.",
    riskScore: 5,
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    flags: [],
  });
  appendEvent("demo", id2, {
    id: "seed-e6",
    type: "response",
    who: "Claude Code",
    content: "Script created at scripts/reconcile_q2.py. Reads from budget.xlsx and accounting_export.csv, outputs a diff report.",
    riskScore: 5,
    timestamp: new Date(Date.now() - 1000 * 60 * 29).toISOString(),
    flags: [],
  });
  endSession(id2);
}
