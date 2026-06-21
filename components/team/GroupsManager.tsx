"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type CSSProperties } from "react";
import { C } from "@/components/dashboard/theme";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PolicyLibrary, severityColor } from "@/components/policy/PolicyLibrary";
import { policyById } from "@/lib/policy/catalog";
import type { GroupView } from "@/lib/repo/groups";
import type { MemberView } from "@/lib/repo/members";
import {
  createGroupAction,
  deleteGroupAction,
  renameGroupAction,
  setGroupMembersAction,
  setGroupPoliciesAction,
  setOrgPoliciesAction,
} from "@/app/dashboard/groups/actions";

type LibraryTarget = { scope: "org" } | { scope: "group"; groupId: string } | null;

export function GroupsManager({
  groups,
  orgPolicyIds,
  members,
  configured,
}: {
  groups: GroupView[];
  orgPolicyIds: string[];
  members: MemberView[];
  configured: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [library, setLibrary] = useState<LibraryTarget>(null);

  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });

  // ── Policy library: per-id mutation tracking ──────────────────────────────────
  // Only the policy currently being added/removed is disabled — others stay live.
  // `optimistic` mirrors the open target's selection so the modal updates instantly;
  // writes are serialized through `chain` so rapid clicks each send the full
  // cumulative set instead of racing on a stale props snapshot.
  const [acting, setActing] = useState<Set<string>>(new Set());
  const [optimistic, setOptimistic] = useState<string[] | null>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  function openLibrary(target: Exclude<LibraryTarget, null>) {
    setOptimistic(null);
    setLibrary(target);
  }
  function closeLibrary() {
    setLibrary(null);
    setOptimistic(null);
  }

  // Selected ids for whichever scope the library is open on (optimistic, else props).
  const propSelected =
    library?.scope === "org"
      ? orgPolicyIds
      : library?.scope === "group"
        ? groups.find((g) => g.id === library.groupId)?.policyIds ?? []
        : [];
  const libSelected = optimistic ?? propSelected;

  function commit(id: string, next: string[]) {
    if (!library) return;
    setOptimistic(next);
    setActing((prev) => new Set(prev).add(id));
    const write = library.scope === "org"
      ? () => setOrgPoliciesAction(next)
      : () => setGroupPoliciesAction(library.groupId, next);
    chain.current = chain.current
      .catch(() => {})
      .then(write)
      .then(() => router.refresh())
      .finally(() => setActing((prev) => { const n = new Set(prev); n.delete(id); return n; }));
  }

  function pickPolicy(id: string) {
    if (acting.has(id) || libSelected.includes(id)) return;
    commit(id, [...libSelected, id]);
  }
  function removePolicy(id: string) {
    if (acting.has(id)) return;
    commit(id, libSelected.filter((x) => x !== id));
  }

  return (
    <div style={st.root}>
      <DashboardNav
        title="Groups"
        subtitle="Create your own groups and attach policies from the library."
        right={pending ? <span style={st.saving}><Spinner /> Saving…</span> : undefined}
      />

      <div style={st.banner}>
        {configured
          ? "Members inherit all organization policies plus the policies of every group they belong to."
          : "Demo mode — groups and policies are stored in memory and reset on restart. Editing the Marketing group changes what the cs_dev_local key is governed by, live."}
      </div>

      <div style={st.body}>
        {/* Organization policies */}
        <section style={st.card}>
          <div style={st.cardHead}>
            <span>Organization policies</span>
            <button onClick={() => openLibrary({ scope: "org" })} disabled={pending} style={{ ...st.primaryBtn, opacity: pending ? 0.55 : 1 }}>Edit org policies</button>
          </div>
          <div style={st.cardHint}>Applied to everyone — current and future members.</div>
          <div style={st.chips}>
            {orgPolicyIds.length === 0 && <span style={st.empty}>No org-wide policies yet.</span>}
            {orgPolicyIds.map((id) => <PolicyChip key={id} id={id} />)}
          </div>
        </section>

        {/* Create group */}
        <CreateGroup busy={pending} onCreate={(name, desc, policyIds) => run(() => createGroupAction(name, desc, policyIds))} />

        {/* Groups */}
        <section style={st.list}>
          <div style={st.listHead}>{groups.length} group{groups.length === 1 ? "" : "s"}</div>
          {groups.length === 0 && <div style={st.empty}>No groups yet. Create your first above.</div>}
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              orgPolicyIds={orgPolicyIds}
              members={members}
              busy={pending}
              onAddPolicy={() => openLibrary({ scope: "group", groupId: g.id })}
              onRemovePolicy={(id) => run(() => setGroupPoliciesAction(g.id, g.policyIds.filter((x) => x !== id)))}
              onToggleMember={(memberId) => {
                const next = g.memberIds.includes(memberId)
                  ? g.memberIds.filter((x) => x !== memberId)
                  : [...g.memberIds, memberId];
                run(() => setGroupMembersAction(g.id, next));
              }}
              onRename={(name, desc) => run(() => renameGroupAction(g.id, name, desc))}
              onDelete={() => run(() => deleteGroupAction(g.id))}
            />
          ))}
        </section>
      </div>

      {library && (
        <PolicyLibrary
          title={library.scope === "org" ? "Organization policies" : `Group policies · ${groups.find((g) => g.id === library.groupId)?.name ?? ""}`}
          selectedIds={libSelected}
          actingIds={[...acting]}
          onPick={pickPolicy}
          onRemove={removePolicy}
          onClose={closeLibrary}
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

function PolicyChip({ id, onRemove }: { id: string; onRemove?: () => void }) {
  const p = policyById(id);
  if (!p) return null;
  const col = severityColor(p.severity);
  return (
    <span style={{ ...cst.chip, borderColor: `${col}88` }}>
      <span style={{ ...cst.dot, background: col }} />
      {p.label}
      {onRemove && <button onClick={onRemove} style={cst.x} aria-label="remove">✕</button>}
    </span>
  );
}

function CreateGroup({ busy, onCreate }: { busy: boolean; onCreate: (name: string, desc: string, policyIds: string[]) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  function submit() {
    if (!name.trim()) return;
    onCreate(name, desc, []);
    setName("");
    setDesc("");
  }

  const disabled = !name.trim() || busy;

  return (
    <section style={st.card}>
      <div style={st.cardHead}><span>Create a group</span></div>
      <div style={st.createForm}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name (e.g. Sales Ops)" disabled={busy} style={st.input} />
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" disabled={busy} style={st.input} />
        <button onClick={submit} disabled={disabled} style={{ ...st.addBtn, opacity: disabled ? 0.5 : 1 }}>
          {busy ? <><Spinner /> Creating…</> : "Create group"}
        </button>
      </div>
      <div style={st.cardHint}>Attach policies from the library after creating the group.</div>
    </section>
  );
}

function GroupCard({
  group,
  orgPolicyIds,
  members,
  busy,
  onAddPolicy,
  onRemovePolicy,
  onToggleMember,
  onRename,
  onDelete,
}: {
  group: GroupView;
  orgPolicyIds: string[];
  members: MemberView[];
  busy: boolean;
  onAddPolicy: () => void;
  onRemovePolicy: (id: string) => void;
  onToggleMember: (memberId: string) => void;
  onRename: (name: string, desc: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [desc, setDesc] = useState(group.description);
  const inGroup = new Set(group.memberIds);

  return (
    <div style={st.group}>
      <div style={st.groupTop}>
        {editing ? (
          <div style={{ flex: 1, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={name} onChange={(e) => setName(e.target.value)} style={st.input} />
            <input value={desc} onChange={(e) => setDesc(e.target.value)} style={st.input} />
            <button onClick={() => { onRename(name, desc); setEditing(false); }} disabled={busy} style={{ ...st.saveBtn, opacity: busy ? 0.55 : 1 }}>Save</button>
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={st.groupName}>{group.name}</div>
            {group.description && <div style={st.groupDesc}>{group.description}</div>}
          </div>
        )}
        <span style={st.countChip}>{group.memberIds.length} member{group.memberIds.length === 1 ? "" : "s"}</span>
        <div style={st.groupBtns}>
          <button onClick={() => setEditing((v) => !v)} style={st.ghostBtn}>{editing ? "Close" : "Rename"}</button>
          <button onClick={onDelete} disabled={busy} style={{ ...st.dangerBtn, opacity: busy ? 0.55 : 1 }}>Delete</button>
        </div>
      </div>

      <div style={st.subHead}>Inherited from Organization</div>
      <div style={st.chips}>
        {orgPolicyIds.length === 0 && <span style={st.empty}>—</span>}
        {orgPolicyIds.map((id) => <PolicyChip key={id} id={id} />)}
      </div>

      <div style={st.subHead}>Group policies</div>
      <div style={st.chips}>
        {group.policyIds.length === 0 && <span style={st.empty}>No group policies yet.</span>}
        {group.policyIds.map((id) => <PolicyChip key={id} id={id} onRemove={() => onRemovePolicy(id)} />)}
        <button onClick={onAddPolicy} disabled={busy} style={{ ...st.addPolicyBtn, opacity: busy ? 0.55 : 1 }}>+ Add from library</button>
      </div>

      <div style={st.subHead}>Members</div>
      <div style={st.chips}>
        {members.length === 0 && <span style={st.empty}>No members to assign.</span>}
        {members.map((m) => {
          const on = inGroup.has(m.id);
          return (
            <button
              key={m.id}
              onClick={() => onToggleMember(m.id)}
              disabled={busy}
              style={{ ...st.memberChip, borderColor: on ? C.accent : C.borderSoft, color: on ? C.text : C.muted, opacity: busy ? 0.6 : 1 }}
            >
              {on ? "✓ " : ""}{m.fullName}{m.team ? ` · ${m.team}` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const cst: Record<string, CSSProperties> = {
  chip: { display: "inline-flex", alignItems: "center", gap: 7, background: C.panel2, border: "1px solid", borderRadius: 20, padding: "4px 11px", fontSize: 12, color: C.text },
  dot: { width: 8, height: 8, borderRadius: "50%" },
  x: { background: "transparent", border: "none", color: C.faint, cursor: "pointer", fontSize: 11, padding: 0, marginLeft: 2 },
};

const st: Record<string, CSSProperties> = {
  root: { background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "var(--ui)" },
  saving: { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: C.muted, fontWeight: 600 },
  banner: { margin: "14px 20px 0", background: C.panel2, border: `1px solid ${C.borderSoft}`, color: C.muted, borderRadius: 10, padding: "10px 14px", fontSize: 12.5, lineHeight: 1.5 },
  body: { maxWidth: 960, margin: "0 auto", padding: "18px 20px 60px", display: "flex", flexDirection: "column", gap: 18 },

  card: { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700, marginBottom: 6 },
  cardHint: { fontSize: 12, color: C.faint, marginBottom: 12 },
  chips: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  empty: { color: C.faint, fontSize: 12.5 },

  createForm: { display: "grid", gridTemplateColumns: "1.3fr 1.6fr auto", gap: 9, alignItems: "center", marginTop: 4, marginBottom: 8 },
  input: { background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 11px", fontSize: 13, fontFamily: "var(--ui)", outline: "none", minWidth: 0 },
  addBtn: { background: C.accent, color: C.accentInk, border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "var(--ui)" },
  primaryBtn: { background: C.accent, color: C.accentInk, border: "none", borderRadius: 8, padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--ui)" },

  list: { display: "flex", flexDirection: "column", gap: 12 },
  listHead: { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" },
  group: { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: "15px 17px" },
  groupTop: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 },
  groupName: { fontSize: 15, fontWeight: 700 },
  groupDesc: { fontSize: 12, color: C.muted, marginTop: 2 },
  countChip: { fontSize: 11, color: C.faint, border: `1px solid ${C.borderSoft}`, borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap" },
  groupBtns: { display: "flex", gap: 7 },
  ghostBtn: { background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 7, padding: "6px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--ui)" },
  dangerBtn: { background: "transparent", color: "#FF8088", border: "1px solid #5C2A30", borderRadius: 7, padding: "6px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--ui)" },
  saveBtn: { background: C.raised, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--ui)" },
  subHead: { fontSize: 10.5, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.05em", margin: "14px 0 8px" },
  addPolicyBtn: { background: "transparent", color: C.accent, border: `1px dashed ${C.accent}88`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--ui)" },
  memberChip: { background: "transparent", border: "1px solid", borderRadius: 20, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "var(--ui)" },
};
