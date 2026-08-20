import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { adminAssignments, users } from "@/db/schema";
import { canManageAdminRole, requirePermission } from "@/lib/admin";
import { scheduleAdminAccountDeletion } from "@/lib/admin-account-lifecycle";
import { ApiError, apiError } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema = z.object({
  reason: z.string().trim().min(10).max(1000),
  policyCode: z.string().trim().min(2).max(80).default("community_standards"),
  confirmation: z.literal("DELETE"),
});

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requirePermission("members.delete");
    const { userId } = await params;
    const input = schema.parse(await request.json());
    if (userId === admin.user.id) throw new ApiError(403, "Administrators cannot delete their own account from the admin console");
    const db = getDb();
    const [target] = await db.select({ status: users.status, name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    if (!target) throw new ApiError(404, "Member not found");
    const [assignment] = await db.select().from(adminAssignments).where(eq(adminAssignments.userId, userId)).limit(1);
    if (assignment && !canManageAdminRole(admin.role, assignment.role)) throw new ApiError(403, "Only the Master Admin can manage this administrator's account");
    if (assignment?.status === "active" && target.status === "active" && ["master_admin", "super_admin"].includes(assignment.role)) {
      const [active] = await db.select({ value: count() }).from(adminAssignments).innerJoin(users, eq(users.id, adminAssignments.userId)).where(and(
        eq(adminAssignments.role, assignment.role),
        eq(adminAssignments.status, "active"),
        eq(users.status, "active"),
      ));
      if (active.value <= 1) throw new ApiError(409, `The final active ${assignment.role.replaceAll("_", " ")} cannot be deleted`);
    }
    const hold = await scheduleAdminAccountDeletion({ userId, requestedBy: admin.user.id, policyCode: input.policyCode, reason: input.reason });
    await audit(admin.user.id, "admin.member_deletion_scheduled", "user", userId, { policyCode: input.policyCode }, { permission: "members.delete", reason: input.reason, severity: "high", before: target, after: { status: "pending_admin_deletion", scheduledAt: hold.scheduledAt.toISOString() } });
    return NextResponse.json({ success: true, scheduledAt: hold.scheduledAt.toISOString() });
  } catch (error) { return apiError(error); }
}
