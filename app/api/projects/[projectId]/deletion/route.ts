import { NextResponse } from "next/server";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { calculateProjectDeletion } from "@/lib/project-deletion";
import { requireProjectOwner } from "@/lib/project-access";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params;
    const project = await requireProjectOwner(member.id, projectId);
    if (project.status === "deleted") throw new ApiError(404, "Project not found");
    if (project.status === "pending_deletion") return NextResponse.json({ pending: true, deadline: project.deletionScheduledAt, requestedAt: project.deletionRequestedAt, canCancel: project.ownerId === member.id });
    const plan = await calculateProjectDeletion(projectId);
    if (!plan) throw new ApiError(404, "Project not found");
    return NextResponse.json({ pending: false, ...plan, deadline: plan.deadline.toISOString(), canCancel: false });
  } catch (error) { return apiError(error); }
}
