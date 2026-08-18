import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projectFollows, projects } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { requireProjectView } from "@/lib/content-access";
import { createNotification } from "@/lib/notifications";

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params, db = getDb();
    await requireProjectView(member.id, projectId);
    const [project] = await db.select({ ownerId: projects.ownerId, title: projects.title, status: projects.status }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project || project.status !== "active") throw new ApiError(404, "Project not found");
    if (project.ownerId === member.id) throw new ApiError(409, "Project owners cannot follow their own project");
    await db.insert(projectFollows).values({ projectId, userId: member.id }).onConflictDoNothing();
    if (project.ownerId !== member.id) await createNotification({ userId: project.ownerId, actorId: member.id, type: "project", title: "Someone followed your project", body: project.title, entityType: "project", entityId: projectId, href: `/?project=${projectId}` });
    return NextResponse.json({ following: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params;
    const [project] = await getDb().select({ ownerId: projects.ownerId, status: projects.status }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project || project.status === "deleted") throw new ApiError(404, "Project not found");
    if (project.ownerId === member.id) throw new ApiError(409, "Project owners cannot follow their own project");
    await getDb().delete(projectFollows).where(and(eq(projectFollows.projectId, projectId), eq(projectFollows.userId, member.id)));
    return NextResponse.json({ following: false });
  } catch (error) { return apiError(error); }
}
