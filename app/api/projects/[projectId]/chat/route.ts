import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { conversationMembers, conversations, projectMembers, projects } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params, db = getDb();
    const [[project], [membership]] = await Promise.all([
      db.select({ id: projects.id, title: projects.title, status: projects.status }).from(projects).where(eq(projects.id, projectId)).limit(1),
      db.select({ userId: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, member.id))).limit(1),
    ]);
    if (!project || project.status === "deleted") throw new ApiError(404, "Project not found");
    if (project.status === "pending_deletion") throw new ApiError(409, "This project is pending deletion and is read-only");
    if (!membership) throw new ApiError(403, "Join this project before entering its chat");

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`project-chat:${projectId}`}))`);
      const [existing] = await tx.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.projectId, projectId), eq(conversations.status, "active"))).limit(1);
      if (existing) {
        await tx.insert(conversationMembers).values({ conversationId: existing.id, userId: member.id }).onConflictDoNothing();
        return { conversationId: existing.id, created: false };
      }
      const [conversation] = await tx.insert(conversations).values({ projectId, initiatedBy: member.id, name: `${project.title} · Project chat` }).returning({ id: conversations.id });
      const members = await tx.select({ userId: projectMembers.userId }).from(projectMembers).where(eq(projectMembers.projectId, projectId));
      await tx.insert(conversationMembers).values(members.map(({ userId }) => ({ conversationId: conversation.id, userId }))).onConflictDoNothing();
      return { conversationId: conversation.id, created: true };
    });
    await trackProductEvent({ actorId: member.id, event: result.created ? "project_chat_created" : "project_chat_joined", entityType: "conversation", entityId: result.conversationId, properties: { projectId } });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
