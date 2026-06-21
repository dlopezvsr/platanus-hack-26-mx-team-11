import { GroupsManager } from "@/components/team/GroupsManager";
import { requireViewer } from "@/lib/auth/session";
import { listGroups, listOrgPolicyIds } from "@/lib/repo/groups";
import { listMembers } from "@/lib/repo/members";
import { isSupabaseConfigured } from "@/lib/db/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Groups — Sentinel" };

export default async function GroupsPage() {
  await requireViewer();
  const [groups, orgPolicyIds, members] = await Promise.all([
    listGroups(),
    listOrgPolicyIds(),
    listMembers(),
  ]);
  return (
    <GroupsManager
      groups={groups}
      orgPolicyIds={orgPolicyIds}
      members={members}
      configured={isSupabaseConfigured}
    />
  );
}
