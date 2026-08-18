export const adminRoles = ["master_admin", "super_admin", "safety_admin", "support_admin", "analyst"] as const;
export type AdminRole = typeof adminRoles[number];
export type AdminPermission = "admin.view" | "members.read" | "members.support" | "members.credentials.reset" | "members.sessions.expire" | "projects.manage" | "reports.manage" | "sanctions.warn" | "sanctions.restrict" | "sanctions.suspend" | "sanctions.ban" | "appeals.manage" | "safety.manage" | "analytics.view" | "audit.view" | "admins.manage" | "admins.master" | "system.view" | "system.manage" | "notices.manage";

const permissions: Record<AdminRole, AdminPermission[]> = {
  master_admin: ["admin.view", "members.read", "members.support", "members.credentials.reset", "members.sessions.expire", "projects.manage", "reports.manage", "sanctions.warn", "sanctions.restrict", "sanctions.suspend", "sanctions.ban", "appeals.manage", "safety.manage", "analytics.view", "audit.view", "admins.manage", "admins.master", "system.view", "system.manage", "notices.manage"],
  super_admin: ["admin.view", "members.read", "members.support", "members.credentials.reset", "members.sessions.expire", "projects.manage", "reports.manage", "sanctions.warn", "sanctions.restrict", "sanctions.suspend", "sanctions.ban", "appeals.manage", "safety.manage", "analytics.view", "audit.view", "admins.manage", "system.view", "system.manage", "notices.manage"],
  safety_admin: ["admin.view", "members.read", "projects.manage", "reports.manage", "sanctions.warn", "sanctions.restrict", "sanctions.suspend", "appeals.manage", "safety.manage", "audit.view", "notices.manage"],
  support_admin: ["admin.view", "members.read", "members.support", "members.sessions.expire", "system.view"],
  analyst: ["admin.view", "analytics.view"],
};

const roleRank: Record<AdminRole, number> = { master_admin: 5, super_admin: 4, safety_admin: 3, support_admin: 2, analyst: 1 };

export function roleAllows(role: string, permission: AdminPermission) {
  return adminRoles.includes(role as AdminRole) && permissions[role as AdminRole].includes(permission);
}

export function permissionsForRole(role: string): AdminPermission[] {
  return adminRoles.includes(role as AdminRole) ? [...permissions[role as AdminRole]] : [];
}

export function canManageAdminRole(actorRole: string, targetRole: string) {
  if (!adminRoles.includes(actorRole as AdminRole) || !adminRoles.includes(targetRole as AdminRole)) return false;
  return actorRole === "master_admin" || roleRank[actorRole as AdminRole] > roleRank[targetRole as AdminRole];
}

export function canAssignAdminRole(actorRole: string, nextRole: string) {
  if (!adminRoles.includes(actorRole as AdminRole) || !adminRoles.includes(nextRole as AdminRole)) return false;
  return actorRole === "master_admin" || roleRank[actorRole as AdminRole] > roleRank[nextRole as AdminRole];
}
