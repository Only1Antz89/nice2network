export const temporarilyUnavailableStatuses = ["suspended", "pending_admin_deletion"] as const;

export function isTemporarilyUnavailable(status: string) {
  return temporarilyUnavailableStatuses.includes(status as typeof temporarilyUnavailableStatuses[number]);
}

export function unavailableIdentity(status: string, identity: { name: string | null; image: string | null; profession?: string | null; isAdmin?: boolean }) {
  return isTemporarilyUnavailable(status)
    ? { ...identity, name: "Unavailable member", image: null, profession: null, isAdmin: false }
    : identity;
}
