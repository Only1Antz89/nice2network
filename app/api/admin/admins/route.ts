import { and, count, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { adminAssignments, users } from "@/db/schema";
import { adminRoles, canAssignAdminRole, canManageAdminRole, requirePermission } from "@/lib/admin";
import { ApiError, apiError } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema = z.object({ userId: z.uuid(), role: z.enum(adminRoles), status: z.enum(["active", "suspended", "revoked"]), reason: z.string().trim().min(10).max(1000) });

export async function GET() {
  try {
    const admin = await requirePermission("admins.manage");
    const rows = await getDb().select({ id: adminAssignments.id, userId: adminAssignments.userId, name: users.name, email: users.email, image: users.image, role: adminAssignments.role, status: adminAssignments.status, expiresAt: adminAssignments.expiresAt, updatedAt: adminAssignments.updatedAt }).from(adminAssignments).innerJoin(users, eq(users.id, adminAssignments.userId)).orderBy(desc(adminAssignments.updatedAt));
    await audit(admin.user.id, "admin.assignments_viewed", "admin_assignment", undefined, { count: rows.length }, { permission: "admins.manage", severity: "high" });
    return NextResponse.json({ administrators: rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePermission("admins.manage");
    const input = schema.parse(await request.json());
    if (input.userId === admin.user.id) throw new ApiError(403, "Administrators cannot change their own access");

    const existing = await getDb().transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('n2-admin-assignments'))`);
      const [member] = await tx.select({ status: users.status }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!member) throw new ApiError(404, "Member not found");
      if (input.status === "active" && member.status !== "active") throw new ApiError(409, "Only an active member can receive administrator access");
      const [current] = await tx.select().from(adminAssignments).where(eq(adminAssignments.userId, input.userId)).limit(1);
      if (current && !canManageAdminRole(admin.role, current.role)) throw new ApiError(403, "Only the Master Admin can change this administrator");
      if (!canAssignAdminRole(admin.role, input.role)) throw new ApiError(403, "Only the Master Admin can grant this role");
      if (current?.role === "master_admin" && current.status === "active" && (input.role !== "master_admin" || input.status !== "active")) {
        const [total] = await tx.select({ value: count() }).from(adminAssignments).where(and(eq(adminAssignments.role, "master_admin"), eq(adminAssignments.status, "active")));
        if (total.value <= 1) throw new ApiError(409, "The final Master Admin cannot be removed");
      }
      if (current?.role === "super_admin" && current.status === "active" && (input.role !== "super_admin" || input.status !== "active")) {
        const [total] = await tx.select({ value: count() }).from(adminAssignments).where(and(eq(adminAssignments.role, "super_admin"), eq(adminAssignments.status, "active")));
        if (total.value <= 1) throw new ApiError(409, "The final super administrator cannot be removed");
      }
      await tx.insert(adminAssignments).values({ userId: input.userId, role: input.role, status: input.status, grantedBy: admin.user.id }).onConflictDoUpdate({ target: adminAssignments.userId, set: { role: input.role, status: input.status, grantedBy: admin.user.id, updatedAt: new Date() } });
      return current;
    });

    await audit(admin.user.id, "admin.assignment_changed", "user", input.userId, {}, { permission: input.role === "master_admin" ? "admins.master" : "admins.manage", reason: input.reason, severity: "high", before: existing ?? {}, after: { role: input.role, status: input.status } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
