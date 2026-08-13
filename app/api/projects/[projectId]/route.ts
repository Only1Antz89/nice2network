import { and, eq, or } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projectMembers, projects } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { recomputeProjectRecommendations } from "@/lib/recommendations/service";

async function requireOwner(userId: string, projectId: string) {
  const [row] = await getDb().select({ project: projects }).from(projects).leftJoin(projectMembers, and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, userId))).where(and(eq(projects.id, projectId), or(eq(projects.ownerId, userId), eq(projectMembers.membershipRole, "co_owner")))).limit(1);
  if (!row) throw new ApiError(403, "Only a project owner can do that");
  return row.project;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params, input = z.object({ title: z.string().trim().min(4).max(120).optional(), summary: z.string().trim().min(20).max(300).optional(), visibility: z.enum(["network", "connections", "private"]).optional() }).refine(value => Object.keys(value).length > 0).parse(await request.json());
    const before = await requireOwner(member.id, projectId);
    const [project] = await getDb().update(projects).set({ ...input, updatedAt: new Date() }).where(eq(projects.id, projectId)).returning();
    after(() => recomputeProjectRecommendations(projectId));
    await audit(member.id, "project.updated", "project", projectId, {}, { before: { title: before.title, summary: before.summary, visibility: before.visibility }, after: input });
    return NextResponse.json({ project });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params;
    await requireOwner(member.id, projectId);
    await getDb().update(projects).set({ status: "deleted", updatedAt: new Date() }).where(eq(projects.id, projectId));
    await audit(member.id, "project.deleted", "project", projectId);
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
