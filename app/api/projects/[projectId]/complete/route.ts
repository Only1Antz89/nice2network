import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projectMembers, projectRecommendations, projects, projectUpdates, recommendationEvents } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { trackProductEvent } from "@/lib/analytics";

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params, { summary } = z.object({ summary: z.string().trim().min(20).max(3000) }).parse(await request.json()), db = getDb();
    const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, member.id))).limit(1);
    if (!project) throw new ApiError(403, "Only the project owner can complete it");
    await db.transaction(async tx => {
      await tx.update(projects).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() }).where(eq(projects.id, projectId));
      await tx.insert(projectUpdates).values({ projectId, authorId: member.id, type: "completion", body: summary });
      const contributors = await tx.select({ userId: projectMembers.userId }).from(projectMembers).where(eq(projectMembers.projectId, projectId));
      const contributorIds = contributors.filter(item => item.userId !== member.id).map(item => item.userId);
      if (contributorIds.length) {
        const recommendations = await tx.select({ id: projectRecommendations.id, userId: projectRecommendations.userId }).from(projectRecommendations).where(and(eq(projectRecommendations.projectId, projectId), inArray(projectRecommendations.userId, contributorIds)));
        if (recommendations.length) await tx.insert(recommendationEvents).values(recommendations.map(item => ({ recommendationId: item.id, userId: item.userId, event: "completed", signalWeight: 80, metadata: { source: "project_completion" } })));
      }
    });
    await trackProductEvent({ actorId: member.id, event: "project_completed", entityType: "project", entityId: projectId, properties: { industry: project.industry } });
    await audit(member.id, "project.completed", "project", projectId);
    return NextResponse.json({ status: "completed" });
  } catch (error) { return apiError(error); }
}
