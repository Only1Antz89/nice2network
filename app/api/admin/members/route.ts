import { and, asc, count, desc, eq, ilike, notInArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { accountDeletionHolds, adminAssignments, users } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";

const views = ["all", "suspended", "deleted"] as const;

export async function GET(request: Request) {
  try {
    const admin = await requirePermission("members.read");
    const params = new URL(request.url).searchParams;
    const query = params.get("q")?.trim();
    const requestedView = params.get("view") ?? "all";
    const view = views.includes(requestedView as typeof views[number]) ? requestedView as typeof views[number] : "all";
    const db = getDb();
    const deletionRequester = alias(users, "deletion_requester");
    const stateFilter = view === "suspended"
      ? eq(users.status, "suspended")
      : view === "deleted"
        ? and(eq(users.status, "pending_admin_deletion"), eq(accountDeletionHolds.status, "pending"))
        : notInArray(users.status, ["pending_admin_deletion", "deleted"]);
    const searchFilter = query ? or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`), ilike(users.profession, `%${query}%`)) : undefined;
    const rows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      onboardingCompletedAt: users.onboardingCompletedAt,
      image: users.image,
      profession: users.profession,
      status: users.status,
      suspendedUntil: users.suspendedUntil,
      ageBand: users.ageBand,
      createdAt: users.createdAt,
      adminRole: adminAssignments.role,
      adminStatus: adminAssignments.status,
      deletionRequestedAt: accountDeletionHolds.requestedAt,
      deletionScheduledAt: accountDeletionHolds.scheduledAt,
      deletionReason: accountDeletionHolds.reason,
      deletionPolicyCode: accountDeletionHolds.policyCode,
      deletionRequestedByName: deletionRequester.name,
    }).from(users)
      .leftJoin(adminAssignments, eq(adminAssignments.userId, users.id))
      .leftJoin(accountDeletionHolds, and(eq(accountDeletionHolds.userId, users.id), eq(accountDeletionHolds.status, "pending")))
      .leftJoin(deletionRequester, eq(deletionRequester.id, accountDeletionHolds.requestedBy))
      .where(searchFilter ? and(stateFilter, searchFilter) : stateFilter)
      .orderBy(view === "deleted" ? asc(accountDeletionHolds.scheduledAt) : desc(users.createdAt))
      .limit(100);
    const [[allCount], [suspendedCount], [deletedCount]] = await Promise.all([
      db.select({ value: count() }).from(users).where(notInArray(users.status, ["pending_admin_deletion", "deleted"])),
      db.select({ value: count() }).from(users).where(eq(users.status, "suspended")),
      db.select({ value: count() }).from(accountDeletionHolds).innerJoin(users, eq(users.id, accountDeletionHolds.userId)).where(and(eq(accountDeletionHolds.status, "pending"), eq(users.status, "pending_admin_deletion"))),
    ]);
    await audit(admin.user.id, "admin.members_viewed", "user", undefined, { queryUsed: Boolean(query), view }, { permission: "members.read" });
    return NextResponse.json({ members: rows, view, counts: { all: allCount.value, suspended: suspendedCount.value, deleted: deletedCount.value } });
  } catch (error) { return apiError(error); }
}
