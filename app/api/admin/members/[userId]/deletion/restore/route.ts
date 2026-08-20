import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { adminAssignments, users } from "@/db/schema";
import { canManageAdminRole, requirePermission } from "@/lib/admin";
import { restoreAdminAccountDeletion } from "@/lib/admin-account-lifecycle";
import { ApiError, apiError } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema = z.object({ reason: z.string().trim().min(10).max(1000) });

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requirePermission("members.delete");
    const { userId } = await params;
    const input = schema.parse(await request.json());
    if (userId === admin.user.id) throw new ApiError(403, "Administrators cannot restore their own account from this control");
    const db = getDb();
    const [target] = await db.select({ status: users.status, name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    if (!target) throw new ApiError(404, "Member not found");
    const [assignment] = await db.select().from(adminAssignments).where(eq(adminAssignments.userId, userId)).limit(1);
    if (assignment && !canManageAdminRole(admin.role, assignment.role)) throw new ApiError(403, "Only the Master Admin can manage this administrator's account");
    const restored = await restoreAdminAccountDeletion({ userId, restoredBy: admin.user.id });
    await audit(admin.user.id, "admin.member_deletion_restored", "user", userId, {}, { permission: "members.delete", reason: input.reason, severity: "high", before: target, after: { status: restored.restoredStatus } });
    return NextResponse.json({ success: true, status: restored.restoredStatus });
  } catch (error) { return apiError(error); }
}
