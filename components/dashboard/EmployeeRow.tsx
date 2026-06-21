import type { CSSProperties } from "react";
import type { DashboardEmployee } from "@/lib/types";
import { C, hhmmss, initials } from "@/components/dashboard/theme";

const STATUS: Record<DashboardEmployee["connectionStatus"], { label: string; color: string }> = {
  not_connected: { label: "not connected", color: C.faint },
  active: { label: "active", color: C.accent },
  stale: { label: "stale", color: "#FFD23F" },
  missing_hooks_suspected: { label: "missing hooks", color: "#FF5160" },
};

export function EmployeeRow({ employee }: { employee: DashboardEmployee }) {
  const status = STATUS[employee.connectionStatus];
  return (
    <div style={st.row}>
      <div style={{ ...st.avatar, borderColor: status.color, color: status.color }}>{initials(employee.name)}</div>
      <div style={st.main}>
        <div style={st.top}>
          <span style={st.name}>{employee.name}</span>
          <span style={{ ...st.status, color: status.color }}>
            <span style={{ ...st.dot, background: status.color }} />
            {status.label}
          </span>
        </div>
        <div style={st.meta}>{employee.role}</div>
        <div style={st.detail}>
          {employee.lastSeenAt ? `last seen ${hhmmss(employee.lastSeenAt)}` : employee.email}
          {employee.openFlagCount > 0 ? ` · ${employee.openFlagCount} flags` : ""}
        </div>
      </div>
    </div>
  );
}

const st: Record<string, CSSProperties> = {
  row: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1px solid ${C.borderSoft}`, borderRadius: 9, background: C.panel2 },
  avatar: { width: 30, height: 30, borderRadius: 8, border: "1.5px solid", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, fontFamily: "var(--mono)", flexShrink: 0 },
  main: { flex: 1, minWidth: 0 },
  top: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  name: { fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  status: { fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 },
  dot: { width: 6, height: 6, borderRadius: "50%", display: "inline-block" },
  meta: { color: C.muted, fontSize: 11.5, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  detail: { color: C.faint, fontSize: 10.5, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
};

