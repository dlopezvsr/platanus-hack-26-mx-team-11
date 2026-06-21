import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live feed the admin console polls. */
export async function GET() {
  const admin = requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    employees: store.listEmployees(admin.orgId),
    sessions: store.listSessions(admin.orgId),
  });
}
