"use client";

import { useEffect, useState } from "react";
import type { DashboardEmployee, Session } from "@/lib/types";

export interface DashboardData {
  employees: DashboardEmployee[];
  sessions: Session[];
}

export function useSessions() {
  const [data, setData] = useState<DashboardData>({ employees: [], sessions: [] });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/sessions", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as DashboardData;
        if (!cancelled) setData({ employees: next.employees ?? [], sessions: next.sessions ?? [] });
      } catch {
        if (!cancelled) setData({ employees: [], sessions: [] });
      }
    };
    load();
    const id = setInterval(load, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return data;
}
