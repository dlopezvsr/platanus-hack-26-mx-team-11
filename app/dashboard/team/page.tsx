import { headers } from "next/headers";
import { TeamManager } from "@/components/team/TeamManager";
import { requireViewer } from "@/lib/auth/session";
import { listMembers } from "@/lib/repo/members";
import { listGroups } from "@/lib/repo/groups";
import { isSupabaseConfigured } from "@/lib/db/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team — Sentinel" };

export default async function TeamPage() {
  await requireViewer();
  const [members, groups] = await Promise.all([listMembers(), listGroups()]);

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return <TeamManager members={members} groups={groups} origin={`${proto}://${host}`} configured={isSupabaseConfigured} />;
}
