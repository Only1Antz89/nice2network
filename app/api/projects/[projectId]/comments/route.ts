import { and, asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { adminAssignments, projectComments, projectMembers, projects, savedItems, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";
import { createNotification } from "@/lib/notifications";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session=await auth(),member=session?.user; const { projectId } = await params, db = getDb();
    const [project] = await db.select({ id: projects.id, ownerId: projects.ownerId, visibility: projects.visibility }).from(projects).where(eq(projects.id, projectId)).limit(1);
    const [membership] = project?.visibility === "private"&&member?.id ? await db.select({ userId: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, member.id))).limit(1) : [];
    if (!project || (project.visibility === "private" && (!member?.id||(project.ownerId !== member.id && !membership)))) throw new ApiError(404, "Project not found");
    const memberId=member?.id??"00000000-0000-0000-0000-000000000000";
    const comments = await db.select({ id: projectComments.id, body: projectComments.body, createdAt: projectComments.createdAt, updatedAt: projectComments.updatedAt, authorId: users.id, authorName: users.name, authorImage: users.image, authorIsAdmin: adminAssignments.id, isPinned:sql<boolean>`coalesce(${savedItems.pinned},false)`,isBookmarked:sql<boolean>`coalesce(${savedItems.bookmarked},false)` }).from(projectComments).innerJoin(users, eq(users.id, projectComments.authorId)).leftJoin(adminAssignments, and(eq(adminAssignments.userId, users.id), eq(adminAssignments.status, "active"))).leftJoin(savedItems,and(eq(savedItems.entityType,"comment"),eq(savedItems.entityId,projectComments.id),eq(savedItems.userId,memberId))).where(and(eq(projectComments.projectId, projectId), eq(projectComments.status, "visible"))).orderBy(asc(projectComments.createdAt)).limit(200);
    return NextResponse.json({ comments: comments.map(item => ({ ...item, authorIsAdmin: Boolean(item.authorIsAdmin) })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params, { body } = z.object({ body: z.string().trim().min(1).max(2000) }).parse(await request.json()), db = getDb();
    const [project] = await db.select({ id: projects.id, ownerId: projects.ownerId, title: projects.title, visibility: projects.visibility }).from(projects).where(and(eq(projects.id, projectId), eq(projects.status, "active"))).limit(1);
    const [membership] = project?.visibility === "private" ? await db.select({ userId: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, member.id))).limit(1) : [];
    if (!project || (project.visibility === "private" && project.ownerId !== member.id && !membership)) throw new ApiError(404, "Project not found");
    const [comment] = await db.insert(projectComments).values({ projectId, authorId: member.id, body }).returning();
    if (project.ownerId !== member.id) await createNotification({ userId: project.ownerId, actorId: member.id, type: "project", title: `${member.name ?? "A member"} commented on your project`, body: project.title, entityType: "project", entityId: projectId, href: `/?project=${projectId}&comments=1` });
    await trackProductEvent({ actorId: member.id, event: "project_comment_created", entityType: "project", entityId: projectId });
    return NextResponse.json({ comment: { ...comment, authorName: member.name, authorImage: member.image, authorIsAdmin: member.isN2Admin } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
