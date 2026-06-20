import type { CSSProperties } from "react";
import type { SessionEvent } from "@/lib/types";
import { C, TYPE_META, hhmmss, riskColor } from "@/components/dashboard/theme";
import { FlagCard } from "@/components/dashboard/FlagCard";

export function EventRow({ event, last }: { event: SessionEvent; last: boolean }) {
  const meta = TYPE_META[event.type];
  const col = riskColor(event.riskScore);
  return (
    <div className="cs-event" style={st.event}>
      <div style={st.rail}>
        <span style={{ ...st.dot, background: meta.dot }} />
        {!last && <span style={st.line} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={st.head}>
          <span style={{ ...st.type, color: meta.dot }}>
            <span style={st.icon}>{meta.icon}</span> {meta.label}
          </span>
          <span style={st.who}>{event.who}</span>
          {event.riskScore > 0 && (
            <span style={{ ...st.scorePill, color: col, borderColor: `${col}66` }}>{event.riskScore}</span>
          )}
          <span style={st.time}>{hhmmss(event.timestamp)}</span>
        </div>
        <div style={st.content}>{event.content}</div>
        {event.summary && <div style={st.summary}>{event.summary}</div>}
        {event.flags.map((flag) => (
          <FlagCard key={flag.id} flag={flag} />
        ))}
      </div>
    </div>
  );
}

const st: Record<string, CSSProperties> = {
  event: { display: "flex", gap: 13, paddingBottom: 16 },
  rail: { display: "flex", flexDirection: "column", alignItems: "center", width: 14, paddingTop: 4 },
  dot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0, boxShadow: "0 0 0 3px rgba(255,255,255,0.03)" },
  line: { width: 2, flex: 1, background: C.borderSoft, marginTop: 4, minHeight: 18 },
  head: { display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" },
  type: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 5 },
  icon: { fontFamily: "var(--mono)", fontSize: 12 },
  who: { fontSize: 11.5, color: C.muted },
  scorePill: { fontSize: 10.5, fontWeight: 700, fontFamily: "var(--mono)", border: "1px solid", borderRadius: 20, padding: "1px 7px" },
  time: { fontSize: 11, color: C.faint, fontFamily: "var(--mono)", marginLeft: "auto" },
  summary: { fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5, fontStyle: "italic" },
  content: {
    fontSize: 13, color: "#C7D2DD", marginTop: 6, lineHeight: 1.5, fontFamily: "var(--mono)",
    background: C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "9px 11px",
    wordBreak: "break-word", whiteSpace: "pre-wrap",
  },
};
