import { and, count, desc, eq, gt, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projectEyes, projectRecommendations, projects, recommendationEvents, sanctions, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { trackProductEvent } from "@/lib/analytics";
import { requireProjectView } from "@/lib/content-access";

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params, db = getDb();
    await requireProjectView(member.id, projectId);
    const [project] = await db.select({ ownerId: projects.ownerId, title: projects.title, status: projects.status }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new ApiError(404, "Project not found");
    if (project.ownerId === member.id) throw new ApiError(400, "Project owners cannot add a view to their own project");
    const [eligible] = await db.select({ status: users.status, verified: users.emailVerified }).from(users).where(eq(users.id, member.id)).limit(1);
    const [sanction] = await db.select({ id: sanctions.id }).from(sanctions).where(and(eq(sanctions.userId, member.id), eq(sanctions.status, "active"), or(isNull(sanctions.expiresAt), gt(sanctions.expiresAt, new Date())))).limit(1);
    if (!eligible?.verified || eligible.status !== "active" || sanction) throw new ApiError(403, "This account cannot influence project popularity");
    const [existing] = await db.select().from(projectEyes).where(and(eq(projectEyes.projectId, projectId), eq(projectEyes.userId, member.id))).limit(1);
    if (existing) await db.delete(projectEyes).where(and(eq(projectEyes.projectId, projectId), eq(projectEyes.userId, member.id)));
    else {
      await db.insert(projectEyes).values({ projectId, userId: member.id });
      await createNotification({ userId: project.ownerId, actorId: member.id, type: "project", title: "Someone viewed your project", body: project.title, entityType: "project", entityId: projectId, href: `/?project=${projectId}` });
      await trackProductEvent({ actorId: member.id, event: "project_eye_added", entityType: "project", entityId: projectId });
    }
    const [recommendation] = await db.select({ id: projectRecommendations.id }).from(projectRecommendations).where(and(eq(projectRecommendations.userId, member.id), eq(projectRecommendations.projectId, projectId))).orderBy(desc(projectRecommendations.score)).limit(1);
    if (recommendation) await db.insert(recommendationEvents).values({ recommendationId: recommendation.id, userId: member.id, event: existing ? "eye_removed" : "eye", signalWeight: existing ? -10 : 10, metadata: { source: "project_card" } });
    const [total] = await db.select({ value: count() }).from(projectEyes).where(eq(projectEyes.projectId, projectId));
    return NextResponse.json({ watching: !existing, count: total.value, total: total.value });
  } catch (error) { return apiError(error); }
}
