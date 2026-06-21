/**
 * Read side for the console. In demo mode it serves the in-memory store; with
 * Supabase it reads sessions + events + flags for the signed-in admin's org
 * (RLS-scoped through the request-bound client).
 */
import type { RiskCategory, RiskSeverity, Session, SessionEvent, EventType } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/db/env";
import { getViewer } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/db/supabase/server";
import { ensureSeed, listSessions } from "@/lib/repo/memstore";

export async function listSessionsForViewer(): Promise<Session[]> {
  if (!isSupabaseConfigured) {
    ensureSeed();
    return listSessions();
  }

  const viewer = await getViewer();
  if (!viewer) return [];

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      `id, member_name, team, title, tool, status, risk_score, started_at,
       events ( id, type, who, content, summary, risk_score, created_at,
         risk_flags ( id, category, severity, title, explanation, suggested_fix, confidence ) )`
    )
    .eq("org_id", viewer.orgId)
    .order("started_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return data.map(mapSession);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSession(row: any): Session {
  const events: SessionEvent[] = (row.events ?? [])
    .sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)))
    .map(
      (e: any): SessionEvent => ({
        id: e.id,
        type: e.type as EventType,
        who: e.who ?? "",
        content: e.content ?? "",
        summary: e.summary || undefined,
        riskScore: e.risk_score ?? 0,
        timestamp: e.created_at,
        flags: (e.risk_flags ?? []).map((f: any) => ({
          id: f.id,
          category: f.category as RiskCategory,
          severity: f.severity as RiskSeverity,
          title: f.title,
          explanation: f.explanation ?? "",
          suggestedFix: f.suggested_fix ?? "",
          confidence: f.confidence ?? undefined,
        })),
      })
    );

  return {
    id: row.id,
    user: row.member_name || "unknown",
    team: row.team ?? "",
    title: row.title ?? "claude session",
    tool: row.tool ?? "claude",
    status: (row.status as Session["status"]) ?? "active",
    riskScore: row.risk_score ?? 0,
    startedAt: row.started_at,
    events,
  };
}
