"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/db/supabase/server";
import { getViewer } from "@/lib/auth/session";
import { generateToken, hashToken, tokenPrefix } from "@/lib/auth/tokens";

export interface NewMember {
  memberId: string;
  name: string;
  roleId: string;
  policyIds: string[];
  token: string; // plaintext — shown once
}

export interface TeamActionState {
  error?: string;
  created?: NewMember;
}

/** Add a tracked member, assign them to a group, and mint their first token. */
export async function addMember(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Not signed in." };

  const groupId = String(form.get("group_id") || "").trim();
  const supabase = await createServerSupabase();

  // Resolve the chosen group's name + effective policies (org-wide ∪ group).
  let team = "";
  let policyIds: string[] = [];
  if (groupId) {
    const [{ data: group }, { data: assignments }] = await Promise.all([
      supabase.from("groups").select("name").eq("id", groupId).eq("org_id", viewer.orgId).single(),
      supabase
        .from("policy_assignments")
        .select("policy_id")
        .eq("org_id", viewer.orgId)
        .eq("enabled", true)
        .or(`scope.eq.org,group_id.eq.${groupId}`),
    ]);
    if (!group) return { error: "Selected group no longer exists." };
    team = group.name;
    policyIds = [...new Set((assignments ?? []).map((a: { policy_id: string }) => a.policy_id))];
  }

  const { data: member, error } = await supabase
    .from("members")
    .insert({
      org_id: viewer.orgId,
      full_name: String(form.get("full_name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      team,
      role_id: "engineering",
      policy_ids: policyIds,
    })
    .select("id, full_name")
    .single();
  if (error || !member) return { error: error?.message ?? "Could not add member." };

  if (groupId) {
    await supabase.from("group_members").insert({ org_id: viewer.orgId, group_id: groupId, member_id: member.id });
  }

  const token = await mintToken(member.id, viewer.orgId);
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/groups");
  return { created: { memberId: member.id, name: member.full_name, roleId: "engineering", policyIds, token } };
}

/** Change a member's role and/or policy selection. */
export async function setMember(memberId: string, roleId: string, policyIds: string[]): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  const supabase = await createServerSupabase();
  await supabase.from("members").update({ role_id: roleId, policy_ids: policyIds }).eq("id", memberId);
  revalidatePath("/dashboard/team");
}

export async function removeMember(memberId: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  const supabase = await createServerSupabase();
  await supabase.from("members").delete().eq("id", memberId);
  revalidatePath("/dashboard/team");
}

/** Revoke existing tokens and issue a fresh one (returned plaintext, once). */
export async function regenerateToken(memberId: string): Promise<{ token?: string; error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Not signed in." };
  const supabase = await createServerSupabase();
  await supabase
    .from("member_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("member_id", memberId)
    .is("revoked_at", null);
  const token = await mintToken(memberId, viewer.orgId);
  revalidatePath("/dashboard/team");
  return { token };
}

async function mintToken(memberId: string, orgId: string): Promise<string> {
  const token = generateToken();
  const supabase = await createServerSupabase();
  await supabase.from("member_tokens").insert({
    member_id: memberId,
    org_id: orgId,
    token_hash: hashToken(token),
    token_prefix: tokenPrefix(token),
  });
  return token;
}
