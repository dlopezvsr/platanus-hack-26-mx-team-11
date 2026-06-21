/**
 * Resolve a member's **effective** policy set: all Organization policies plus the
 * policies of every group they belong to (a union — memberships accumulate). In
 * demo / static-key mode this falls back to the identity's directly-attached
 * policy ids (defaulted from their role).
 *
 * Conflict resolution (most-restrictive-wins) is applied at decision time in
 * evaluateRequest.ts; here we only compute the set.
 *
 * Results are cached per-member with a 60s TTL. This eliminates repeated DB/store
 * queries across the UserPromptSubmit and PreToolUse hooks that fire in quick
 * succession within a single agent turn. Admin changes propagate within one TTL
 * window — acceptable for a cooperative audience.
 */
import type { Identity } from "@/lib/auth/identity";
import type { Policy } from "@/lib/policy/catalog";
import { POLICIES } from "@/lib/policy/catalog";
import { resolvePolicies } from "@/lib/policy/generate";
import { isSupabaseConfigured } from "@/lib/db/env";
import { adminSupabase } from "@/lib/db/supabase/admin";
import { demoGroupIdsForMember, demoGroupPolicyIds, demoOrgPolicyIds } from "@/lib/repo/groups";

const TTL_MS = 60_000;

interface CacheEntry {
  policies: Policy[];
  expiresAt: number;
}

// Anchored on globalThis so the cache survives Next.js HMR module re-evaluation.
const g = globalThis as unknown as { __csPolicyCache?: Map<string, CacheEntry> };
const policyCache: Map<string, CacheEntry> = (g.__csPolicyCache ??= new Map());

function cacheKey(identity: Identity): string {
  return `${identity.orgId}:${identity.memberId}`;
}

/** Drop all cached entries for an org. Call this after an admin changes group/policy assignments. */
export function invalidatePolicyCache(orgId: string): void {
  const prefix = `${orgId}:`;
  for (const key of policyCache.keys()) {
    if (key.startsWith(prefix)) policyCache.delete(key);
  }
}

export async function effectivePolicyIds(identity: Identity): Promise<string[]> {
  const ids = new Set<string>(identity.policyIds);

  if (!isSupabaseConfigured) {
    // Demo: union org-wide policies + the policies of every group the member is
    // in, read straight from the in-memory store — so editing groups in the UI
    // changes enforcement live.
    for (const id of demoOrgPolicyIds(identity.orgId)) ids.add(id);
    const groupIds = identity.groupIds.length ? identity.groupIds : demoGroupIdsForMember(identity.memberId);
    for (const gid of groupIds) for (const id of demoGroupPolicyIds(gid)) ids.add(id);
    return [...ids];
  }

  if (isSupabaseConfigured) {
    const db = adminSupabase();
    if (db) {
      const { data } = await db
        .from("policy_assignments")
        .select("policy_id, scope, group_id, enabled")
        .eq("org_id", identity.orgId)
        .eq("enabled", true);
      for (const row of data ?? []) {
        const r = row as { policy_id: string; scope: string; group_id: string | null };
        if (r.scope === "org") ids.add(r.policy_id);
        else if (r.scope === "group" && r.group_id && identity.groupIds.includes(r.group_id)) {
          ids.add(r.policy_id);
        }
      }
    }
  }

  return [...ids];
}

export async function effectivePolicies(identity: Identity): Promise<Policy[]> {
  const key = cacheKey(identity);
  const now = Date.now();
  const cached = policyCache.get(key);
  if (cached && cached.expiresAt > now) return cached.policies;

  const policies = resolvePolicies(POLICIES, await effectivePolicyIds(identity));
  policyCache.set(key, { policies, expiresAt: now + TTL_MS });
  return policies;
}
