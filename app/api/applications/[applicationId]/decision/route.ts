import { and, desc, eq, sql } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { applications, projectMembers, projectRecommendations, projectRoles, projects, projectUpdates, recommendationEvents, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { createNotification, createNotifications } from "@/lib/notifications";
import { recomputeProjectRecommendations } from "@/lib/recommendations/service";

const schema = z.object({ decision: z.enum(["accepted", "declined"]) });
export async function POST(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    const member = await requireMember(), { applicationId } = await params, { decision } = schema.parse(await request.json()), db = getDb();
    const [row] = await db.select({ application: applications, ownerId: projects.ownerId, projectStatus: projects.status, projectTitle: projects.title, department: projectRoles.department, roleTitle: projectRoles.title, applicantName: users.name }).from(applications).innerJoin(projects, eq(applications.projectId, projects.id)).innerJoin(projectRoles, eq(applications.roleId, projectRoles.id)).innerJoin(users, eq(applications.applicantId, users.id)).where(eq(applications.id, applicationId)).limit(1);
    const [ownerMembership] = row ? await db.select({ role: projectMembers.membershipRole }).from(projectMembers).where(and(eq(projectMembers.projectId, row.application.projectId), eq(projectMembers.userId, member.id))).limit(1) : [];
    if (!row || (row.ownerId !== member.id && ownerMembership?.role !== "co_owner")) throw new ApiError(403, "Only a project owner can decide applications");
    if (row.projectStatus === "deleted") throw new ApiError(404, "Project not found");
    if (row.projectStatus === "pending_deletion") throw new ApiError(409, "This project is pending deletion and is read-only");
    if (row.application.status !== "pending") throw new ApiError(409, "This application has already been decided");
    await db.transaction(async tx => {
      await tx.update(applications).set({ status: decision, decidedBy: member.id, decidedAt: new Date() }).where(eq(applications.id, applicationId));
      if (decision === "accepted") {
        await tx.insert(projectMembers).values({ projectId: row.application.projectId, userId: row.application.applicantId, roleId: row.application.roleId, department: row.department }).onConflictDoNothing();
        await tx.insert(projectUpdates).values({ projectId: row.application.projectId, authorId: row.application.applicantId, type: "member_joined", body: `${row.applicantName ?? "A new member"} joined as ${row.roleTitle}.` });
        await tx.update(projectRoles).set({ filled: sql`least(${projectRoles.capacity}, ${projectRoles.filled} + 1)` }).where(and(eq(projectRoles.id, row.application.roleId), eq(projectRoles.status, "open")));
        const [recommendation] = await tx.select({ id: projectRecommendations.id }).from(projectRecommendations).where(and(eq(projectRecommendations.userId, row.application.applicantId), eq(projectRecommendations.roleId, row.application.roleId))).orderBy(desc(projectRecommendations.score)).limit(1);
        if (recommendation) {
          await tx.update(projectRecommendations).set({ status: "converted" }).where(eq(projectRecommendations.id, recommendation.id));
          await tx.insert(recommendationEvents).values({ recommendationId: recommendation.id, userId: row.application.applicantId, event: "accepted_role", signalWeight: 60, metadata: { source: "application" } });
        }
      }
    });
    after(() => recomputeProjectRecommendations(row.application.projectId));
    await createNotification({ userId: row.application.applicantId, actorId: member.id, type: "application", title: `Application ${decision}`, body: `${row.roleTitle} · ${row.projectTitle}`, entityType: "project", entityId: row.application.projectId, href: `/?project=${row.application.projectId}` });
    if (decision === "accepted") {
      const recipients = await db.select({ userId: projectMembers.userId }).from(projectMembers).where(eq(projectMembers.projectId, row.application.projectId));
      await createNotifications(recipients.filter(({ userId }) => userId !== row.application.applicantId).map(({ userId }) => ({ userId, actorId: row.application.applicantId, type: "project" as const, title: `${row.applicantName ?? "A new member"} joined ${row.projectTitle}`, body: `${row.roleTitle} joined your project team.`, entityType: "project", entityId: row.application.projectId, href: `/?view=projects&project=${row.application.projectId}` })));
    }
    await audit(member.id, `application.${decision}`, "application", applicationId);
    return NextResponse.json({ status: decision });
  } catch (error) { return apiError(error); }
}
