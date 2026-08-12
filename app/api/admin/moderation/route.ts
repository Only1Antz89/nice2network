import { desc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { reports, users } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function GET(request: Request) { try { const admin = await requirePermission("reports.manage"); const status = new URL(request.url).searchParams.get("status"); const rows = await getDb().select({ id: reports.id, targetType: reports.targetType, targetId: reports.targetId, reason: reports.reason, details: reports.details, priority: reports.priority, responseDueAt: reports.responseDueAt, status: reports.status, reporterName: users.name, assignedTo: reports.assignedTo, createdAt: reports.createdAt }).from(reports).innerJoin(users, eq(users.id, reports.reporterId)).where(status ? eq(reports.status, status) : inArray(reports.status, ["open", "investigating"])).orderBy(sql`case ${reports.priority} when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4 end`, desc(reports.createdAt)).limit(100); await audit(admin.user.id, "admin.moderation_queue_viewed", "report", undefined, { count: rows.length }, { permission: "reports.manage" }); return NextResponse.json({ reports: rows }); } catch (error) { return apiError(error); } }
