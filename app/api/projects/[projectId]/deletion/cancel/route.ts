import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notifyProjectDeletion, projectDeletionAudience } from "@/lib/project-deletion";

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params, db = getDb();
    const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, member.id))).limit(1);
    if (!project) throw new ApiError(403, "Only the primary project owner can cancel deletion");
    if (project.status === "deleted") throw new ApiError(409, "A finalized deletion cannot be cancelled");
    if (project.status !== "pending_deletion") return NextResponse.json({ success: true, cancelled: false, status: project.status });
    const audience = await projectDeletionAudience(projectId), restoredStatus = project.deletionPreviousStatus || "active", now = new Date();
    const changed = await db.transaction(async tx => {
      const [result] = await tx.update(projects).set({ status: restoredStatus, deletionPreviousStatus: null, deletionRequestedAt: null, deletionScheduledAt: null, deletionRequestedBy: null, updatedAt: now }).where(and(eq(projects.id, projectId), eq(projects.status, "pending_deletion"))).returning({ id: projects.id });
      return result;
    });
    if (!changed) throw new ApiError(409, "Deletion has already been finalized");
    await notifyProjectDeletion({ projectId, projectTitle: project.title, actorId: member.id, actorName: member.name, audience, event: "cancelled" });
    await audit(member.id, "project.deletion_cancelled", "project", projectId);
    return NextResponse.json({ success: true, cancelled: true, status: restoredStatus });
  } catch (error) { return apiError(error); }
}
