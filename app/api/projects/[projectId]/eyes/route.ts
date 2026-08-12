import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projectEyes, projects } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { trackProductEvent } from "@/lib/analytics";

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params, db = getDb();
    const [project] = await db.select({ ownerId: projects.ownerId, title: projects.title }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new ApiError(404, "Project not found");
    const [existing] = await db.select().from(projectEyes).where(and(eq(projectEyes.projectId, projectId), eq(projectEyes.userId, member.id))).limit(1);
    if (existing) await db.delete(projectEyes).where(and(eq(projectEyes.projectId, projectId), eq(projectEyes.userId, member.id)));
    else {
      await db.insert(projectEyes).values({ projectId, userId: member.id });
      await createNotification({ userId: project.ownerId, actorId: member.id, type: "project", title: "Someone placed eyes on your project", body: project.title, entityType: "project", entityId: projectId, href: `/?project=${projectId}` });
      await trackProductEvent({ actorId: member.id, event: "project_eye_added", entityType: "project", entityId: projectId });
    }
    const [total] = await db.select({ value: count() }).from(projectEyes).where(eq(projectEyes.projectId, projectId));
    return NextResponse.json({ watching: !existing, count: total.value });
  } catch (error) { return apiError(error); }
}
