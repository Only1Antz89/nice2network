import { asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { safetyRisks, users } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { ApiError, apiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    const admin = await requirePermission("safety.manage");
    const rows = await getDb().select({ id: safetyRisks.id, type: safetyRisks.type, severity: safetyRisks.severity, status: safetyRisks.status, details: safetyRisks.details, assignedTo: safetyRisks.assignedTo, memberName: users.name, ageBand: users.ageBand, createdAt: safetyRisks.createdAt })
      .from(safetyRisks).leftJoin(users, eq(users.id, safetyRisks.subjectUserId)).orderBy(asc(safetyRisks.severity), desc(safetyRisks.createdAt)).limit(100);
    await audit(admin.user.id, "admin.safety_queue_viewed", "safety_risk", undefined, { count: rows.length }, { permission: "safety.manage", severity: "high" });
    return NextResponse.json({ risks: rows });
  } catch (error) { return apiError(error); }
}

const actionSchema = z.object({ riskId: z.uuid(), action: z.enum(["assign", "escalate", "resolve"]), reason: z.string().trim().min(10).max(2000) });

export async function POST(request: Request) {
  try {
    const admin = await requirePermission("safety.manage");
    const input = actionSchema.parse(await request.json());
    const db = getDb();
    const [risk] = await db.select().from(safetyRisks).where(eq(safetyRisks.id, input.riskId)).limit(1);
    if (!risk) throw new ApiError(404, "Safety case not found");
    if (risk.status === "resolved") throw new ApiError(409, "This safety case has already been resolved");
    const nextStatus = input.action === "resolve" ? "resolved" : input.action === "escalate" ? "escalated" : "investigating";
    await db.update(safetyRisks).set({ assignedTo: admin.user.id, status: nextStatus, resolvedAt: input.action === "resolve" ? new Date() : null, details: { ...(risk.details ?? {}), lastAdminNote: input.reason, lastAdminAction: input.action } }).where(eq(safetyRisks.id, input.riskId));
    await audit(admin.user.id, `admin.safety_${input.action}`, "safety_risk", input.riskId, {}, { permission: "safety.manage", reason: input.reason, severity: risk.severity, before: { status: risk.status }, after: { status: nextStatus } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
