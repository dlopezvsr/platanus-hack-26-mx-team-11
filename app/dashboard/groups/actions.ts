"use server";

import { revalidatePath } from "next/cache";
import {
  createGroup,
  deleteGroup,
  renameGroup,
  setGroupMembers,
  setGroupPolicies,
  setOrgPolicies,
} from "@/lib/repo/groups";

/** Create a new, admin-named group (optionally pre-seeded with policies). */
export async function createGroupAction(
  name: string,
  description: string,
  policyIds: string[]
): Promise<{ id?: string; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };
  const id = await createGroup(trimmed, description.trim(), policyIds);
  revalidatePath("/dashboard/groups");
  return id ? { id } : { error: "Could not create the group." };
}

export async function renameGroupAction(id: string, name: string, description: string): Promise<void> {
  await renameGroup(id, name.trim(), description.trim());
  revalidatePath("/dashboard/groups");
}

export async function deleteGroupAction(id: string): Promise<void> {
  await deleteGroup(id);
  revalidatePath("/dashboard/groups");
}

export async function setGroupPoliciesAction(id: string, policyIds: string[]): Promise<void> {
  await setGroupPolicies(id, policyIds);
  revalidatePath("/dashboard/groups");
}

export async function setOrgPoliciesAction(policyIds: string[]): Promise<void> {
  await setOrgPolicies(policyIds);
  revalidatePath("/dashboard/groups");
}

export async function setGroupMembersAction(id: string, memberIds: string[]): Promise<void> {
  await setGroupMembers(id, memberIds);
  revalidatePath("/dashboard/groups");
}
