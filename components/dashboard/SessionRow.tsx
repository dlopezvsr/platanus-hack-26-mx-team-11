import type { CSSProperties } from "react";
import type { Session } from "@/lib/types";
import { C, initials, riskColor } from "@/components/dashboard/theme";

export function SessionRow({
  session,
  active,
  flagCount,
  onClick,
}: {
  session: Session;
  active: boolean;
  flagCount: number;
  onClick: () => void;
}) {
  const col = riskColor(session.riskScore);
  return (
    <button
      onClick={onClick}
      className="cs-row"
      style={{
        ...st.row,
        borderColor: active ? col : C.borderSoft,
        background: active ? C.raised : "transparent",
        boxShadow: active ? `inset 2px 0 0 ${col}` : "none",
      }}
    >
      <div style={{ ...st.avatar, borderColor: "#D08C5E", color: "#D08C5E" }}>{initials(session.user)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={st.top}>
          <span style={st.user}>{session.user}</span>
          {session.status === "active" ? (
            <span style={st.live}>
              <span className="cs-live" style={st.liveDot} />
              live
            </span>
          ) : (
            <span style={st.resolved}>ended</span>
          )}
        </div>
        <div style={st.meta}>
          <span style={{ color: "#D08C5E" }}>Claude Code</span>
          <span style={{ color: C.faint }}> · {session.title}</span>
        </div>
        <div style={st.barTrack}>
          <div style={{ ...st.barFill, width: `${session.riskScore}%`, background: col, boxShadow: `0 0 10px ${col}66` }} />
        </div>
      </div>
      <div style={{ textAlign: "right", marginLeft: 6 }}>
        <div style={{ ...st.score, color: col }}>{session.riskScore}</div>
        {flagCount > 0 && (
          <div style={st.pill}>
            {flagCount} flag{flagCount > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </button>
  );
}

const st: Record<string, CSSProperties> = {
  row: { display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", border: `1px solid ${C.borderSoft}`, borderRadius: 10, textAlign: "left", cursor: "pointer", color: C.text, fontFamily: "var(--ui)", transition: "background .15s, border-color .15s" },
  avatar: { width: 34, height: 34, borderRadius: 9, border: "1.5px solid", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)", flexShrink: 0 },
  top: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  user: { fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  live: { fontSize: 10.5, color: "#FF5160", display: "flex", alignItems: "center", textTransform: "uppercase", letterSpacing: "0.05em" },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#FF5160", display: "inline-block", marginRight: 5 },
  resolved: { fontSize: 10.5, color: C.faint, textTransform: "uppercase", letterSpacing: "0.05em" },
  meta: { fontSize: 11.5, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  barTrack: { height: 4, background: C.borderSoft, borderRadius: 3, marginTop: 9, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3, transition: "width .6s ease, background .4s" },
  score: { fontSize: 18, fontWeight: 700, fontFamily: "var(--mono)", lineHeight: 1 },
  pill: { fontSize: 9.5, color: "#FF9F40", border: `1px solid #FF9F4066`, borderRadius: 20, padding: "1px 6px", marginTop: 5, whiteSpace: "nowrap" },
};
