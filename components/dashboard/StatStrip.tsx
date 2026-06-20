import type { CSSProperties } from "react";
import type { Session } from "@/lib/types";
import { C, SEV, riskColor } from "@/components/dashboard/theme";

export function StatStrip({ sessions }: { sessions: Session[] }) {
  const active = sessions.filter((s) => s.status === "active").length;
  const openFlags = sessions.reduce((n, s) => n + s.events.reduce((m, e) => m + e.flags.length, 0), 0);
  const avgRisk = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + s.riskScore, 0) / sessions.length)
    : 0;
  const critical = sessions.filter((s) => s.riskScore >= 75).length;

  return (
    <div style={st.stats}>
      <Stat label="Active sessions" value={active} accent={C.accent} />
      <Stat label="Open flags" value={openFlags} accent={openFlags ? SEV.high.color : C.accent} />
      <Stat label="Avg risk" value={avgRisk} accent={riskColor(avgRisk)} suffix="/100" />
      <Stat label="Critical sessions" value={critical} accent={critical ? SEV.critical.color : SEV.low.color} />
    </div>
  );
}

function Stat({ label, value, accent, suffix }: { label: string; value: number; accent: string; suffix?: string }) {
  return (
    <div style={st.stat}>
      <div style={st.statLabel}>{label}</div>
      <div style={{ ...st.statValue, color: accent }}>
        {value}
        {suffix && <span style={st.suffix}>{suffix}</span>}
      </div>
    </div>
  );
}

const st: Record<string, CSSProperties> = {
  stats: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: C.border, borderBottom: `1px solid ${C.border}` },
  stat: { background: C.panel2, padding: "13px 18px" },
  statLabel: { fontSize: 11, color: C.muted, letterSpacing: "0.03em", textTransform: "uppercase" },
  statValue: { fontSize: 26, fontWeight: 700, fontFamily: "var(--mono)", marginTop: 3, lineHeight: 1 },
  suffix: { fontSize: 13, color: C.faint, fontWeight: 500, marginLeft: 2 },
};
