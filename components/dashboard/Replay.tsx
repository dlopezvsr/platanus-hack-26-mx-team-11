import type { CSSProperties } from "react";
import type { Session } from "@/lib/types";
import { C, riskBand, riskColor } from "@/components/dashboard/theme";
import { EventRow } from "@/components/dashboard/EventRow";

export function Replay({ session }: { session: Session }) {
  const col = riskColor(session.riskScore);
  return (
    <>
      <div style={st.head}>
        <div>
          <div style={st.title}>{session.title}</div>
          <div style={st.sub}>
            {session.user} · <span style={{ color: "#D08C5E" }}>Claude Code</span> · {session.team}
          </div>
        </div>
        <div style={st.scoreBox}>
          <div style={st.scoreLabel}>Risk</div>
          <div style={{ ...st.scoreValue, color: col }}>{session.riskScore}</div>
          <div style={{ ...st.scoreBand, color: col }}>{riskBand(session.riskScore)}</div>
        </div>
      </div>

      <div style={st.meterTrack}>
        <div className="cs-meter" style={{ width: `${session.riskScore}%`, background: col, boxShadow: `0 0 14px ${col}` }} />
      </div>

      <div style={st.timeline}>
        {session.events.map((e, i) => (
          <EventRow key={e.id} event={e} last={i === session.events.length - 1} />
        ))}
        {session.events.length === 0 && <div style={st.waiting}>Waiting for activity…</div>}
      </div>
    </>
  );
}

const st: Record<string, CSSProperties> = {
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 20px 14px", borderBottom: `1px solid ${C.borderSoft}`, gap: 16 },
  title: { fontSize: 17, fontWeight: 700, fontFamily: "var(--mono)", letterSpacing: "-0.01em" },
  sub: { fontSize: 12.5, color: C.muted, marginTop: 5 },
  scoreBox: { textAlign: "right", flexShrink: 0 },
  scoreLabel: { fontSize: 10, color: C.faint, textTransform: "uppercase", letterSpacing: "0.08em" },
  scoreValue: { fontSize: 34, fontWeight: 800, fontFamily: "var(--mono)", lineHeight: 1, marginTop: 2 },
  scoreBand: { fontSize: 11, fontWeight: 600, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" },
  meterTrack: { height: 3, background: C.borderSoft, margin: "0 20px", borderRadius: 3, overflow: "hidden" },
  timeline: { padding: "14px 20px 22px", overflowY: "auto", maxHeight: 470 },
  waiting: { color: C.faint, fontSize: 13, padding: "20px 4px" },
};
