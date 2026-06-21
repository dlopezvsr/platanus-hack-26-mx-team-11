"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { C } from "@/components/dashboard/theme";
import { POLICIES, type PolicyCategory, type PolicySeverity, type PolicySource } from "@/lib/policy/catalog";

const CATEGORIES: (PolicyCategory | "all")[] = ["all", "data", "secrets", "apis", "access", "publishing", "injection"];
const SEVERITIES: (PolicySeverity | "all")[] = ["all", "info", "warning", "critical"];
const SOURCES: (PolicySource | "all")[] = ["all", "official", "community", "internal"];

export function severityColor(sev: PolicySeverity): string {
  return sev === "critical" ? "#FF5160" : sev === "warning" ? "#FF9F40" : "#34E5D0";
}

/** Searchable, filterable Policy Library picker (modal). Used for both the
 *  organization-wide set and per-group sets. */
export function PolicyLibrary({
  title,
  selectedIds,
  busy = false,
  onPick,
  onRemove,
  onClose,
}: {
  title: string;
  selectedIds: string[];
  busy?: boolean;
  onPick: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("all");
  const [sev, setSev] = useState<(typeof SEVERITIES)[number]>("all");
  const [src, setSrc] = useState<(typeof SOURCES)[number]>("all");
  const [actingId, setActingId] = useState<string | null>(null);
  const selected = new Set(selectedIds);

  // Clear the per-row spinner once the parent mutation settles.
  useEffect(() => {
    if (!busy) setActingId(null);
  }, [busy]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return POLICIES.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (sev !== "all" && p.severity !== sev) return false;
      if (src !== "all" && p.source !== src) return false;
      if (needle && !(`${p.label} ${p.description}`.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [q, cat, sev, src]);

  return (
    <div style={st.overlay} onClick={onClose}>
      <div style={st.modal} onClick={(e) => e.stopPropagation()}>
        <div style={st.head}>
          <div>
            <div style={st.title}>{title}</div>
            <div style={st.sub}>Pick predefined policies. {selected.size} attached.</div>
          </div>
          <button onClick={onClose} style={st.close}>✕</button>
        </div>

        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search policies…"
          style={st.search}
        />
        <div style={st.filters}>
          <Filter label="Category" value={cat} options={CATEGORIES} onChange={(v) => setCat(v as typeof cat)} />
          <Filter label="Severity" value={sev} options={SEVERITIES} onChange={(v) => setSev(v as typeof sev)} />
          <Filter label="Source" value={src} options={SOURCES} onChange={(v) => setSrc(v as typeof src)} />
        </div>

        <div style={st.list}>
          {results.map((p) => {
            const on = selected.has(p.id);
            const col = severityColor(p.severity);
            const acting = actingId === p.id && busy;
            return (
              <div key={p.id} style={{ ...st.row, borderColor: on ? col : C.borderSoft }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={st.rowTop}>
                    <span style={{ ...st.sevDot, background: col }} />
                    <span style={st.label}>{p.label}</span>
                    <span style={st.tags}>{p.category} · {p.severity} · {p.source}</span>
                  </div>
                  <div style={st.desc}>{p.description}</div>
                </div>
                {on ? (
                  <button
                    onClick={() => { setActingId(p.id); onRemove(p.id); }}
                    disabled={busy}
                    style={{ ...st.removeBtn, opacity: busy ? 0.55 : 1 }}
                  >
                    {acting ? <Spinner color="#FF8088" /> : "Remove"}
                  </button>
                ) : (
                  <button
                    onClick={() => { setActingId(p.id); onPick(p.id); }}
                    disabled={busy}
                    style={{ ...st.addBtn, background: col, opacity: busy ? 0.55 : 1 }}
                  >
                    {acting ? <Spinner color="#06231F" /> : "Add"}
                  </button>
                )}
              </div>
            );
          })}
          {results.length === 0 && <div style={st.empty}>No policies match those filters.</div>}
        </div>
      </div>
    </div>
  );
}

function Spinner({ color = C.accent }: { color?: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        border: `2px solid ${color}40`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "cs-spin 0.6s linear infinite",
      }}
    >
      <style>{"@keyframes cs-spin{to{transform:rotate(360deg)}}"}</style>
    </span>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label style={st.filter}>
      <span style={st.filterLabel}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={st.select}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

const st: Record<string, CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(4,8,12,0.72)", display: "grid", placeItems: "center", padding: 20, zIndex: 60 },
  modal: { width: "100%", maxWidth: 680, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", maxHeight: "86vh", overflowY: "auto" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  title: { fontSize: 16, fontWeight: 700 },
  sub: { fontSize: 12.5, color: C.muted, marginTop: 4 },
  close: { background: "transparent", color: C.muted, border: "none", fontSize: 16, cursor: "pointer" },
  search: { width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 12px", fontSize: 13.5, fontFamily: "var(--ui)", outline: "none" },
  filters: { display: "flex", gap: 10, margin: "12px 0 14px", flexWrap: "wrap" },
  filter: { display: "flex", flexDirection: "column", gap: 4 },
  filterLabel: { fontSize: 10.5, color: C.faint, textTransform: "uppercase", letterSpacing: "0.04em" },
  select: { background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 9px", fontSize: 12.5, fontFamily: "var(--ui)" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  row: { display: "flex", alignItems: "center", gap: 12, border: "1px solid", borderRadius: 10, padding: "11px 13px" },
  rowTop: { display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" },
  sevDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  label: { fontSize: 13.5, fontWeight: 600 },
  tags: { fontSize: 10.5, color: C.faint, fontFamily: "var(--mono)", textTransform: "uppercase" },
  desc: { fontSize: 12, color: C.muted, marginTop: 5, lineHeight: 1.45 },
  addBtn: { color: "#06231F", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--ui)", flexShrink: 0 },
  removeBtn: { background: "transparent", color: "#FF8088", border: "1px solid #5C2A30", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--ui)", flexShrink: 0 },
  empty: { color: C.faint, fontSize: 13, padding: "20px 4px", textAlign: "center" },
};
