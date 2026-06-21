import { store } from "@/lib/store";

export function bearerFrom(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const [kind, token] = authHeader.trim().split(/\s+/, 2);
  return kind?.toLowerCase() === "bearer" && token ? token : null;
}

export function lookupUserByApiKey(token: string | null) {
  return store.lookupUserByToken(token)?.user ?? null;
}

