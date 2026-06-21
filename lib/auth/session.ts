import { store } from "@/lib/store";

export function getCurrentUser() {
  return store.getDemoAdmin() ?? null;
}

export function requireAdmin() {
  const user = getCurrentUser();
  if (!user || user.kind !== "cto_admin") return null;
  return user;
}

