"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import { Brand } from "@/components/ui/Brand";
import { C } from "@/components/dashboard/theme";
import type { MemberView } from "@/lib/repo/members";
import type { GroupView } from "@/lib/repo/groups";
import { ROLES, roleById } from "@/lib/policy/roles";
import { POLICIES } from "@/lib/policy/catalog";
import { buildSettings, resolvePolicies } from "@/lib/policy/generate";
import { addMember, regenerateToken, removeMember, setMember, type TeamActionState } from "@/app/dashboard/team/actions";

export function TeamManager({
  members,
  groups,
  origin,
  configured,
}: {
  members: MemberView[];
  groups: GroupView[];
  origin: string;
  configured: boolean;
}) {
  const router = useRouter();
  const [state, formAction, adding] = useActionState<TeamActionState, FormData>(addMember, {});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [onboardingFor, setOnboardingFor] = useState<string | null>(null);

  useEffect(() => {
    if (state.created) {
      setSecrets((s) => ({ ...s, [state.created!.memberId]: state.created!.token }));
      setOnboardingFor(state.created!.memberId);
      router.refresh();
    }
  }, [state.created, router]);

  const onboardMember = members.find((m) => m.id === onboardingFor);
  const onboardToken = onboardingFor ? secrets[onboardingFor] : undefined;

  return (
    <div style={st.root}>
      <header style={st.header}>
        <div style={st.brandWrap}>
          <Brand variant="dark" size={28} />
          <div>
            <div style={st.brand}>Team</div>
            <div style={st.sub}>Add members, assign a role &amp; policies, hand them their setup.</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <Link href="/dashboard/groups" style={st.navLink}>Groups</Link>
          <Link href="/dashboard" style={st.navLink}>← Console</Link>
        </div>
      </header>

      {!configured && (
        <div style={st.banner}>
          Connect Supabase (env vars) to manage your team. Until then the console runs in demo mode.
        </div>
      )}

      <div style={st.body}>
        {/* Add member */}
        <section style={st.addCard}>
          <div style={st.cardHead}>Add a member</div>
          <form action={formAction} style={st.addForm}>
            <input name="full_name" placeholder="Full name" required style={st.input} />
            <input name="email" type="email" placeholder="Email" required style={st.input} />
            <select name="group_id" defaultValue="" disabled={groups.length === 0} style={st.input} title="Assign to a group">
              <option value="">No group</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button type="submit" disabled={adding || !configured} style={{ ...st.addBtn, opacity: adding || !configured ? 0.55 : 1 }}>
              {adding ? <><Spinner /> Adding…</> : "Add member"}
            </button>
          </form>
          {groups.length === 0 && (
            <div style={st.hint}>No groups yet — <Link href="/dashboard/groups" style={st.hintLink}>create one</Link> to assign members and their policies.</div>
          )}
          {state.error && <div style={st.err}>{state.error}</div>}
        </section>

        {/* Members */}
        <section style={st.list}>
          <div style={st.cardHead}>{members.length} member{members.length === 1 ? "" : "s"}</div>
          {members.length === 0 && <div style={st.empty}>No members yet. Add your first above.</div>}
          {members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              hasSecret={Boolean(secrets[m.id])}
              onOnboard={() => setOnboardingFor(m.id)}
              onSecret={(t) => setSecrets((s) => ({ ...s, [m.id]: t }))}
            />
          ))}
        </section>
      </div>

      {onboardMember && onboardToken && (
        <Onboarding
          origin={origin}
          token={onboardToken}
          policyIds={onboardMember.policyIds}
          name={onboardMember.fullName}
          onClose={() => setOnboardingFor(null)}
        />
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        border: `2px solid ${C.borderSoft}`,
        borderTopColor: C.accent,
        borderRadius: "50%",
        animation: "cs-spin 0.6s linear infinite",
        verticalAlign: "-1px",
      }}
    >
      <style>{"@keyframes cs-spin{to{transform:rotate(360deg)}}"}</style>
    </span>
  );
}

function MemberRow({
  member,
  hasSecret,
  onOnboard,
  onSecret,
}: {
  member: MemberView;
  hasSecret: boolean;
  onOnboard: () => void;
  onSecret: (token: string) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(member.policyIds));

  function changeRole(roleId: string) {
    const policyIds = roleById(roleId)?.policyIds ?? [];
    setSelected(new Set(policyIds));
    start(async () => {
      await setMember(member.id, roleId, policyIds);
      router.refresh();
    });
  }

  function savePolicies() {
    start(async () => {
      await setMember(member.id, member.roleId, [...selected]);
      router.refresh();
      setEditing(false);
    });
  }

  function getInstall() {
    start(async () => {
      const res = await regenerateToken(member.id);
      if (res.token) {
        onSecret(res.token);
        onOnboard();
        router.refresh();
      }
    });
  }

  function remove() {
    start(async () => {
      await removeMember(member.id);
      router.refresh();
    });
  }

  return (
    <div style={st.row}>
      <div style={st.rowMain}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={st.name}>{member.fullName}</div>
          <div style={st.meta}>{member.email}{member.team ? ` · ${member.team}` : ""}</div>
        </div>
        <select value={member.roleId} onChange={(e) => changeRole(e.target.value)} disabled={pending} style={st.roleSel}>
          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <div style={st.tokenChip}>
          {member.tokenActive ? `${member.tokenPrefix}… active` : "no token"}
        </div>
        <div style={st.rowBtns}>
          <button onClick={() => setEditing((v) => !v)} disabled={pending} style={{ ...st.ghostBtn, opacity: pending ? 0.55 : 1 }}>{editing ? "Close" : `Policies · ${member.policyIds.length}`}</button>
          <button onClick={getInstall} disabled={pending} style={{ ...st.primaryBtn, opacity: pending ? 0.55 : 1 }}>{pending ? <><Spinner /> …</> : hasSecret ? "Show setup" : "Get setup"}</button>
          <button onClick={remove} disabled={pending} style={{ ...st.dangerBtn, opacity: pending ? 0.55 : 1 }}>Remove</button>
        </div>
      </div>

      {editing && (
        <div style={st.policyEditor}>
          {POLICIES.map((p) => {
            const on = selected.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => setSelected((prev) => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
                style={{ ...st.policyChip, borderColor: on ? C.accent : C.borderSoft, color: on ? C.text : C.muted }}
              >
                {on ? "✓ " : ""}{p.label}
              </button>
            );
          })}
          <button onClick={savePolicies} disabled={pending} style={{ ...st.saveBtn, opacity: pending ? 0.55 : 1 }}>{pending ? <><Spinner /> Saving…</> : "Save policies"}</button>
        </div>
      )}
    </div>
  );
}

function Onboarding({
  origin,
  token,
  policyIds,
  name,
  onClose,
}: {
  origin: string;
  token: string;
  policyIds: string[];
  name: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"cmd" | "json" | null>(null);
  const command = `curl -fsSL ${origin}/api/install/${token} | sh`;
  const json = useMemo(
    () =>
      JSON.stringify(
        buildSettings({ endpoint: origin, auth: { kind: "token", token }, policies: resolvePolicies(POLICIES, policyIds) }),
        null,
        2
      ),
    [origin, token, policyIds]
  );

  async function copy(text: string, which: "cmd" | "json") {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied((c) => (c === which ? null : c)), 1500);
  }

  return (
    <div style={st.overlay} onClick={onClose}>
      <div style={st.modal} onClick={(e) => e.stopPropagation()}>
        <div style={st.modalHead}>
          <div>
            <div style={st.modalTitle}>Onboard {name}</div>
            <div style={st.modalSub}>Send them this one line. Shown once — the token can't be retrieved later.</div>
          </div>
          <button onClick={onClose} style={st.close}>✕</button>
        </div>

        <div style={st.label}>1 · One-line install</div>
        <div style={st.cmdRow}>
          <code style={st.cmd}>{command}</code>
          <button onClick={() => copy(command, "cmd")} style={st.copyBtn}>{copied === "cmd" ? "✓" : "Copy"}</button>
        </div>

        <div style={st.label}>2 · Or paste manually into ~/.claude/settings.json</div>
        <div style={st.jsonHead}>
          <span style={st.jsonHint}>hooks + this member's policies</span>
          <button onClick={() => copy(json, "json")} style={st.copyBtn}>{copied === "json" ? "✓ Copied" : "Copy JSON"}</button>
        </div>
        <pre style={st.json}>{json}</pre>
      </div>
    </div>
  );
}

const st: Record<string, CSSProperties> = {
  root: { background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "var(--ui)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: `linear-gradient(180deg, ${C.panel}, ${C.panel2})`, gap: 14, flexWrap: "wrap" },
  brandWrap: { display: "flex", alignItems: "center", gap: 14 },
  brand: { fontSize: 15, fontWeight: 700 },
  sub: { fontSize: 12, color: C.muted, marginTop: 3 },
  navLink: { color: C.muted, textDecoration: "none", fontSize: 13, fontWeight: 600 },
  banner: { margin: "14px 20px 0", background: "#2A2410", border: "1px solid #5C4E1E", color: "#FFD68A", borderRadius: 10, padding: "10px 14px", fontSize: 13 },
  body: { maxWidth: 920, margin: "0 auto", padding: "22px 20px 60px", display: "flex", flexDirection: "column", gap: 22 },

  addCard: { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" },
  cardHead: { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 13 },
  addForm: { display: "grid", gridTemplateColumns: "1.3fr 1.6fr 1fr auto", gap: 9, alignItems: "center" },
  hint: { marginTop: 10, fontSize: 12.5, color: C.faint },
  hintLink: { color: C.accent, textDecoration: "none", fontWeight: 600 },
  input: { background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 11px", fontSize: 13, fontFamily: "var(--ui)", outline: "none", minWidth: 0 },
  addBtn: { background: C.accent, color: C.accentInk, border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "var(--ui)" },
  err: { marginTop: 10, fontSize: 12.5, color: "#FF8088" },

  list: { display: "flex", flexDirection: "column", gap: 10 },
  empty: { color: C.faint, fontSize: 13, padding: "8px 2px" },
  row: { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 15px" },
  rowMain: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  name: { fontSize: 14, fontWeight: 600 },
  meta: { fontSize: 12, color: C.muted, marginTop: 2 },
  roleSel: { background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 9px", fontSize: 12.5, fontFamily: "var(--ui)" },
  tokenChip: { fontSize: 11, color: C.faint, fontFamily: "var(--mono)", border: `1px solid ${C.borderSoft}`, borderRadius: 20, padding: "3px 9px", whiteSpace: "nowrap" },
  rowBtns: { display: "flex", gap: 7 },
  ghostBtn: { background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 7, padding: "6px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--ui)" },
  primaryBtn: { background: C.accent, color: C.accentInk, border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--ui)" },
  dangerBtn: { background: "transparent", color: "#FF8088", border: "1px solid #5C2A30", borderRadius: 7, padding: "6px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--ui)" },

  policyEditor: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 13, paddingTop: 13, borderTop: `1px solid ${C.borderSoft}` },
  policyChip: { background: "transparent", border: "1px solid", borderRadius: 20, padding: "5px 11px", fontSize: 12, cursor: "pointer", fontFamily: "var(--ui)" },
  saveBtn: { background: C.raised, color: C.text, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--ui)" },

  overlay: { position: "fixed", inset: 0, background: "rgba(4,8,12,0.7)", display: "grid", placeItems: "center", padding: 20, zIndex: 50 },
  modal: { width: "100%", maxWidth: 620, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", maxHeight: "85vh", overflowY: "auto" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: 700 },
  modalSub: { fontSize: 12.5, color: C.muted, marginTop: 4, maxWidth: 420, lineHeight: 1.5 },
  close: { background: "transparent", color: C.muted, border: "none", fontSize: 16, cursor: "pointer" },
  label: { fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 8, marginBottom: 8 },
  cmdRow: { display: "flex", gap: 9, alignItems: "stretch" },
  cmd: { flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "11px 13px", fontSize: 12.5, fontFamily: "var(--mono)", color: C.accent, overflowX: "auto", whiteSpace: "nowrap" },
  copyBtn: { background: C.accent, color: C.accentInk, border: "none", borderRadius: 8, padding: "0 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "var(--ui)" },
  jsonHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  jsonHint: { fontSize: 11.5, color: C.faint },
  json: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 11.5, fontFamily: "var(--mono)", color: "#C7D2DD", overflowX: "auto", margin: 0, maxHeight: 300, lineHeight: 1.5 },
};
