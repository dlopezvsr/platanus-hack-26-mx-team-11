import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PoC: the dashboard is the admin's own machine, scoped to the demo org.
// Swap for authenticated, org-derived access when auth lands.
const DEMO_ORG = "org_demo";

/** Live feed the admin console polls. */
export async function GET() {
  return NextResponse.json({ sessions: store.listSessions(DEMO_ORG) });
}
