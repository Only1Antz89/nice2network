import "server-only";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { adminAssignments, users } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { verifyAdminCookie } from "@/lib/admin-mfa";

export const adminRoles = ["super_admin", "safety_admin", "support_admin", "analyst"] as const;
export type AdminRole = typeof adminRoles[number];
export type AdminPermission = "admin.view" | "members.read" | "members.manage" | "projects.manage" | "reports.manage" | "sanctions.manage" | "appeals.manage" | "safety.manage" | "analytics.view" | "audit.view" | "admins.manage" | "system.view" | "system.manage" | "notices.manage";

const permissions: Record<AdminRole, AdminPermission[]> = {
  super_admin: ["admin.view", "members.read", "members.manage", "projects.manage", "reports.manage", "sanctions.manage", "appeals.manage", "safety.manage", "analytics.view", "audit.view", "admins.manage", "system.view", "system.manage", "notices.manage"],
  safety_admin: ["admin.view", "members.read", "projects.manage", "reports.manage", "sanctions.manage", "appeals.manage", "safety.manage", "audit.view", "notices.manage"],
  support_admin: ["admin.view", "members.read", "members.manage", "system.view"],
  analyst: ["admin.view", "analytics.view"],
};

export function roleAllows(role: string, permission: AdminPermission) {
  return adminRoles.includes(role as AdminRole) && permissions[role as AdminRole].includes(permission);
}

export async function getAdminIdentity() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const now = new Date();
  const [row] = await getDb().select({ assignment: adminAssignments, status: users.status, forcePasswordChange: users.forcePasswordChange, mfaEnrolledAt: users.mfaEnrolledAt }).from(adminAssignments).innerJoin(users, eq(users.id, adminAssignments.userId)).where(and(eq(adminAssignments.userId, session.user.id), eq(adminAssignments.status, "active"), or(isNull(adminAssignments.expiresAt), gt(adminAssignments.expiresAt, now)))).limit(1);
  if (!row || row.status !== "active") return null;
  const token = (await cookies()).get("n2_admin_verified")?.value;
  return { user: session.user, role: row.assignment.role as AdminRole, forcePasswordChange: row.forcePasswordChange, mfaEnrolled: Boolean(row.mfaEnrolledAt), recentlyVerified: Boolean(token && verifyAdminCookie(token, session.user.id)) };
}

export async function requirePermission(permission: AdminPermission, options: { requireMfa?: boolean } = {}) {
  const identity = await getAdminIdentity();
  if (!identity || !roleAllows(identity.role, permission)) throw new ApiError(403, "Administrator access required");
  if (identity.forcePasswordChange) throw new ApiError(428, "Change your temporary password before continuing");
  if (options.requireMfa !== false) {
    if (!identity.recentlyVerified) throw new ApiError(428, "Administrator verification required");
  }
  return identity;
}

export async function isN2Admin(userId: string) {
  const now = new Date();
  const [assignment] = await getDb().select({ id: adminAssignments.id }).from(adminAssignments).where(and(eq(adminAssignments.userId, userId), eq(adminAssignments.status, "active"), or(isNull(adminAssignments.expiresAt), gt(adminAssignments.expiresAt, now)))).limit(1);
  return Boolean(assignment);
}
