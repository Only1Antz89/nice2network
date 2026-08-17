export const RESERVED_USERNAMES = new Set([
  "about", "admin", "api", "change-password", "community", "forgot-password",
  "meet", "onboarding", "privacy", "reset-password", "share", "signin", "terms",
]);

export function usernameBase(value: string) {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 24);
  const base = normalized.length >= 3 ? normalized : `member-${normalized || "n2"}`;
  return RESERVED_USERNAMES.has(base) ? `${base}-n2` : base;
}

export function isAvailableUsernameFormat(value: string) {
  return /^[a-z0-9][a-z0-9_-]{2,29}$/.test(value) && !RESERVED_USERNAMES.has(value);
}
