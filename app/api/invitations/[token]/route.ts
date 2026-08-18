import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { invitations, projectRoles, projects, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const member = await requireMember();
    const { token } = await params;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const db = getDb();
    const [invitation] = await db
      .select({
        id: invitations.id,
        inviteeId: invitations.inviteeId,
        membershipRole: invitations.membershipRole,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        projectId: projects.id,
        projectTitle: projects.title,
        projectSummary: projects.summary,
        projectStatus: projects.status,
        roleTitle: projectRoles.title,
        inviterName: users.name,
        inviterUsername: users.username,
      })
      .from(invitations)
      .innerJoin(projects, eq(projects.id, invitations.projectId))
      .innerJoin(users, eq(users.id, invitations.invitedBy))
      .leftJoin(projectRoles, eq(projectRoles.id, invitations.roleId))
      .where(eq(invitations.tokenHash, tokenHash))
      .limit(1);

    if (!invitation || invitation.projectStatus === "deleted") throw new ApiError(404, "Invitation not found");
    if (invitation.inviteeId && invitation.inviteeId !== member.id) throw new ApiError(403, "This invitation belongs to another member");

    const status = invitation.status === "pending" && invitation.expiresAt.getTime() < Date.now()
      ? "expired"
      : invitation.status;

    return NextResponse.json({
      id: invitation.id,
      projectId: invitation.projectId,
      projectTitle: invitation.projectTitle,
      projectSummary: invitation.projectSummary,
      inviterName: invitation.inviterName ?? `@${invitation.inviterUsername}`,
      membershipRole: invitation.membershipRole,
      roleTitle: invitation.membershipRole === "co_owner" ? "Co-owner" : invitation.roleTitle ?? "Project member",
      status,
      expiresAt: invitation.expiresAt,
      projectPendingDeletion: invitation.projectStatus === "pending_deletion",
    });
  } catch (error) {
    return apiError(error);
  }
}
