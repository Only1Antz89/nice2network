import { and, desc, eq, sql } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { applications, projectMembers, projectRecommendations, projectRoles, projects, recommendationEvents } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { recomputeProjectRecommendations } from "@/lib/recommendations/service";

const schema = z.object({ decision: z.enum(["accepted", "declined"]) });
export async function POST(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    const member = await requireMember(), { applicationId } = await params, { decision } = schema.parse(await request.json()), db = getDb();
    const [row] = await db.select({ application: applications, ownerId: projects.ownerId, projectTitle: projects.title, department: projectRoles.department, roleTitle: projectRoles.title }).from(applications).innerJoin(projects, eq(applications.projectId, projects.id)).innerJoin(projectRoles, eq(applications.roleId, projectRoles.id)).where(eq(applications.id, applicationId)).limit(1);
    if (!row || row.ownerId !== member.id) throw new ApiError(403, "Only the project owner can decide applications");
    if (row.application.status !== "pending") throw new ApiError(409, "This application has already been decided");
    await db.transaction(async tx => {
      await tx.update(applications).set({ status: decision, decidedBy: member.id, decidedAt: new Date() }).where(eq(applications.id, applicationId));
      if (decision === "accepted") {
        await tx.insert(projectMembers).values({ projectId: row.application.projectId, userId: row.application.applicantId, roleId: row.application.roleId, department: row.department }).onConflictDoNothing();
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
    await audit(member.id, `application.${decision}`, "application", applicationId);
    return NextResponse.json({ status: decision });
  } catch (error) { return apiError(error); }
}
