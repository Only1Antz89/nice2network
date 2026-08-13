import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projectBookmarks, projects } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params, input = z.object({ action: z.enum(["pin", "star"]) }).parse(await request.json()), db = getDb();
    const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new ApiError(404, "Project not found");
    const [current] = await db.select().from(projectBookmarks).where(and(eq(projectBookmarks.projectId, projectId), eq(projectBookmarks.userId, member.id))).limit(1);
    const next = input.action === "pin" ? { pinned: !current?.pinned, starred: current?.starred ?? false } : { pinned: current?.pinned ?? false, starred: !current?.starred };
    await db.insert(projectBookmarks).values({ projectId, userId: member.id, ...next }).onConflictDoUpdate({ target: [projectBookmarks.projectId, projectBookmarks.userId], set: { ...next, updatedAt: new Date() } });
    return NextResponse.json(next);
  } catch (error) { return apiError(error); }
}
