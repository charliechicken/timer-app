const OWNER_STORAGE_KEY = "week-timer-owner-id";

export function getConfiguredOwnerId(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_OWNER_ID?.trim();
  return fromEnv || null;
}

export function getOwnerId(): string {
  const configured = getConfiguredOwnerId();
  if (configured) return configured;

  if (typeof window === "undefined") return "local";

  const existing = window.localStorage.getItem(OWNER_STORAGE_KEY);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(OWNER_STORAGE_KEY, created);
  return created;
}
