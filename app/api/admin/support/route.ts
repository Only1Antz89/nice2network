import { desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { supportRequests, users } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";

const statuses = ["open", "in_progress", "resolved", "dismissed"] as const;

export async function GET(request: Request) {
  try {
    const admin = await requirePermission("members.support");
    const status = new URL(request.url).searchParams.get("status");
    const where = status && statuses.includes(status as typeof statuses[number])
      ? eq(supportRequests.status, status as typeof statuses[number])
      : inArray(supportRequests.status, ["open", "in_progress"]);
    const rows = await getDb().select({
      id: supportRequests.id,
      email: supportRequests.email,
      category: supportRequests.category,
      subject: supportRequests.subject,
      details: supportRequests.details,
      status: supportRequests.status,
      requesterName: users.name,
      assignedTo: supportRequests.assignedTo,
      resolution: supportRequests.resolution,
      resolvedAt: supportRequests.resolvedAt,
      createdAt: supportRequests.createdAt,
    }).from(supportRequests).leftJoin(users, eq(users.id, supportRequests.requesterId)).where(where).orderBy(desc(supportRequests.createdAt)).limit(100);
    await audit(admin.user.id, "admin.support_inbox_viewed", "support_request", undefined, { status: status ?? "active", count: rows.length }, { permission: "members.support" });
    return NextResponse.json({ requests: rows });
  } catch (error) {
    return apiError(error);
  }
}
