import "server-only";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { adminAssignments, users } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { verifyAdminCookie } from "@/lib/admin-mfa";
import { roleAllows } from "@/lib/admin-roles";
import type { AdminPermission, AdminRole } from "@/lib/admin-roles";
export { adminRoles, canAssignAdminRole, canManageAdminRole, permissionsForRole, roleAllows } from "@/lib/admin-roles";
export type { AdminPermission, AdminRole } from "@/lib/admin-roles";

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
