import type { CSSProperties } from "react";
import type { RiskFlag } from "@/lib/types";
import { C, SEV } from "@/components/dashboard/theme";

export function FlagCard({ flag }: { flag: RiskFlag }) {
  const sev = SEV[flag.severity];
  return (
    <div
      className="cs-flag"
      style={{
        ...st.card,
        borderColor: sev.color,
        boxShadow: `0 0 0 1px ${sev.color}33, 0 6px 20px ${sev.glow}`,
      }}
    >
      <div style={st.top}>
        <span style={{ ...st.sevTag, background: sev.color }}>{sev.label}</span>
        <span style={st.title}>{flag.title}</span>
        <span style={st.cat}>{flag.category}</span>
      </div>
      <div style={st.expl}>{flag.explanation}</div>
      <div style={st.fixRow}>
        <span style={st.fixIcon}>✎</span>
        <span style={st.fixText}>
          <b style={{ color: C.text }}>Safer version: </b>
          {flag.suggestedFix}
        </span>
      </div>
    </div>
  );
}

const st: Record<string, CSSProperties> = {
  card: { marginTop: 9, background: C.panel, border: "1px solid", borderRadius: 10, padding: "11px 13px" },
  top: { display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" },
  sevTag: { fontSize: 9.5, fontWeight: 800, color: "#0B0F14", padding: "2px 7px", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.04em" },
  title: { fontSize: 13, fontWeight: 700 },
  cat: { fontSize: 10.5, color: C.faint, marginLeft: "auto", fontFamily: "var(--mono)", textTransform: "uppercase" },
  expl: { fontSize: 12.5, color: C.muted, marginTop: 7, lineHeight: 1.55 },
  fixRow: { display: "flex", gap: 8, marginTop: 9, background: C.panel2, borderRadius: 7, padding: "8px 10px", border: `1px solid ${C.borderSoft}` },
  fixIcon: { color: C.accent, fontSize: 13 },
  fixText: { fontSize: 12, color: C.muted, lineHeight: 1.5, fontFamily: "var(--mono)" },
};
