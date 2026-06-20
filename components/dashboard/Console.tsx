"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSessions } from "@/lib/client/useSessions";
import { C } from "@/components/dashboard/theme";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { SessionRow } from "@/components/dashboard/SessionRow";
import { Replay } from "@/components/dashboard/Replay";

export function Console() {
  const sessions = useSessions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Keep a valid selection as the live list changes.
  const selected = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? sessions[0],
    [sessions, selectedId]
  );

  return (
    <div style={st.root}>
      <header style={st.header}>
        <div style={st.brandWrap}>
          <span className="cs-radar" style={st.radar} />
          <div>
            <div style={st.brand}>
              Code<span style={{ color: C.accent }}>Sentinel</span>
            </div>
            <div style={st.brandSub}>AI coding security console</div>
          </div>
        </div>
        <div style={st.clock}>
          <span className="cs-live" style={st.liveDot} />
          <span style={{ fontFamily: "var(--mono)" }}>{clock}</span>
          <span style={{ color: C.faint, marginLeft: 8 }}>· Claude Code</span>
        </div>
      </header>

      <StatStrip sessions={sessions} />

      <div style={st.body}>
        <section style={st.left} className="cs-left">
          <div style={st.colHead}>
            <span>Live sessions</span>
            <span style={st.colHeadHint}>{sessions.length} total</span>
          </div>
          <div style={st.feed}>
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                active={s.id === selected?.id}
                flagCount={s.events.reduce((n, e) => n + e.flags.length, 0)}
                onClick={() => setSelectedId(s.id)}
              />
            ))}
            {sessions.length === 0 && <div style={st.empty}>Waiting for the first session…</div>}
          </div>
        </section>

        <section style={st.right} className="cs-right">
          {selected ? <Replay session={selected} /> : <div style={st.empty}>No sessions yet.</div>}
        </section>
      </div>
    </div>
  );
}

const st: Record<string, CSSProperties> = {
  root: { background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "var(--ui)", border: `1px solid ${C.border}` },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: `linear-gradient(180deg, ${C.panel}, ${C.panel2})`, gap: 14, flexWrap: "wrap" },
  brandWrap: { display: "flex", alignItems: "center", gap: 13 },
  radar: { width: 30, height: 30, borderRadius: "50%", border: `2px solid ${C.accent}`, position: "relative", display: "inline-block" },
  brand: { fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 },
  brandSub: { fontSize: 11, color: C.muted, marginTop: 3, letterSpacing: "0.04em", textTransform: "uppercase" },
  clock: { fontSize: 12.5, color: C.muted, display: "flex", alignItems: "center", gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#FF5160", display: "inline-block" },
  body: { display: "flex", gap: 1, background: C.border, minHeight: 420 },
  left: { background: C.bg, display: "flex", flexDirection: "column", width: 340, flexShrink: 0 },
  right: { background: C.bg, display: "flex", flexDirection: "column", flex: 1 },
  colHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: `1px solid ${C.borderSoft}` },
  colHeadHint: { color: C.faint, fontWeight: 500, textTransform: "none", letterSpacing: 0 },
  feed: { padding: 10, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" },
  empty: { padding: 40, color: C.faint, fontSize: 14 },
};
