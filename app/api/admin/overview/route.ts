import { and, count, eq, gt, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { applications, appeals, integrationAccounts, meetings, productEvents, projectRoles, projects, reports, safetyRisks, sanctions, supportRequests, users } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    const admin = await requirePermission("admin.view");
    const db = getDb();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const [memberCount, pendingCount, activeProjectCount, openRoleCount, openReportCount, openSupportCount, urgentRiskCount, upcomingMeetingCount, applicationCount, appealCount, sanctionCount, eventCount, integrations] = await Promise.all([
      db.select({ value: count() }).from(users).where(eq(users.status, "active")),
      db.select({ value: count() }).from(users).where(inArray(users.status, ["pending_verification", "onboarding"])),
      db.select({ value: count() }).from(projects).where(eq(projects.status, "active")),
      db.select({ value: count() }).from(projectRoles).where(eq(projectRoles.status, "open")),
      db.select({ value: count() }).from(reports).where(inArray(reports.status, ["open", "investigating"])),
      db.select({ value: count() }).from(supportRequests).where(inArray(supportRequests.status, ["open", "in_progress"])),
      db.select({ value: count() }).from(safetyRisks).where(and(eq(safetyRisks.status, "open"), inArray(safetyRisks.severity, ["urgent", "high"]))),
      db.select({ value: count() }).from(meetings).where(gt(meetings.startsAt, new Date())),
      db.select({ value: count() }).from(applications).where(eq(applications.status, "pending")),
      db.select({ value: count() }).from(appeals).where(eq(appeals.status, "open")),
      db.select({ value: count() }).from(sanctions).where(eq(sanctions.status, "active")),
      db.select({ value: count() }).from(productEvents).where(gt(productEvents.occurredAt, thirtyDaysAgo)),
      db.select({ provider: integrationAccounts.provider, value: count() }).from(integrationAccounts).groupBy(integrationAccounts.provider),
    ]);
    await audit(admin.user.id, "admin.overview_viewed", "admin", undefined, {}, { permission: "admin.view" });
    return NextResponse.json({ metrics: { activeMembers: memberCount[0].value, pendingMembers: pendingCount[0].value, activeProjects: activeProjectCount[0].value, openRoles: openRoleCount[0].value, openReports: openReportCount[0].value, openSupport: openSupportCount[0].value, urgentRisks: urgentRiskCount[0].value, upcomingMeets: upcomingMeetingCount[0].value, pendingApplications: applicationCount[0].value, openAppeals: appealCount[0].value, activeSanctions: sanctionCount[0].value, productEvents30d: eventCount[0].value }, integrations, generatedAt: new Date() });
  } catch (error) { return apiError(error); }
}
