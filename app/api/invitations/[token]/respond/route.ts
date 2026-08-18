import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { invitations, projectMembers, projectRoles, projects, projectUpdates } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { createNotifications } from "@/lib/notifications";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const member = await requireMember(), { token } = await params, { decision } = z.object({ decision: z.enum(["accepted", "declined"]) }).parse(await request.json()), db = getDb(), tokenHash = createHash("sha256").update(token).digest("hex");
    const [invite] = await db.select().from(invitations).where(eq(invitations.tokenHash, tokenHash)).limit(1);
    if (!invite || invite.status !== "pending" || invite.expiresAt.getTime() < Date.now()) throw new ApiError(410, "This invitation is invalid or expired");
    if (invite.inviteeId && invite.inviteeId !== member.id) throw new ApiError(403, "This invitation belongs to another member");
    const [projectState] = await db.select({ status: projects.status }).from(projects).where(eq(projects.id, invite.projectId)).limit(1);
    if (!projectState || projectState.status === "deleted") throw new ApiError(404, "Project not found");
    if (projectState.status === "pending_deletion") throw new ApiError(409, "This project is pending deletion and is read-only");
    let roleTitle = invite.membershipRole === "co_owner" ? "Co-owner" : "Project member";
    await db.transaction(async (tx) => {
      await tx.execute(sql`select id from projects where id = ${invite.projectId}::uuid for update`);
      const updated = await tx.update(invitations).set({ status: decision, inviteeId: member.id, respondedAt: new Date() }).where(and(eq(invitations.id, invite.id), eq(invitations.status, "pending"))).returning({ id: invitations.id });
      if (!updated.length) throw new ApiError(409, "This invitation has already been answered");
      if (decision === "accepted") {
        let department: string | undefined;
        let roleId = invite.roleId;
        if (invite.membershipRole === "co_owner") {
          roleId = null;
          department = "Leadership";
        } else if (invite.roleId) {
          const [role] = await tx.select().from(projectRoles).where(eq(projectRoles.id, invite.roleId)).limit(1);
          department = role?.department;
          roleTitle = role?.title ?? roleTitle;
        }
        const [existingMember] = await tx.select({ userId: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, invite.projectId), eq(projectMembers.userId, member.id))).limit(1);
        if (existingMember) throw new ApiError(409, "You are already a member of this project");
        await tx.insert(projectMembers).values({ projectId: invite.projectId, userId: member.id, roleId, membershipRole: invite.membershipRole, department });
        await tx.insert(projectUpdates).values({ projectId: invite.projectId, authorId: member.id, type: "member_joined", body: `${member.name ?? "A new member"} joined as ${roleTitle}.` });
      }
    });
    if (decision === "accepted") {
      const [[project], recipients] = await Promise.all([
        db.select({ title: projects.title }).from(projects).where(eq(projects.id, invite.projectId)).limit(1),
        db.select({ userId: projectMembers.userId }).from(projectMembers).where(eq(projectMembers.projectId, invite.projectId)),
      ]);
      await createNotifications(recipients.filter(({ userId }) => userId !== member.id).map(({ userId }) => ({ userId, actorId: member.id, type: "project" as const, title: `${member.name ?? "A new member"} joined ${project?.title ?? "your project"}`, body: invite.membershipRole === "co_owner" ? `${member.name ?? "A new member"} accepted a co-owner invitation.` : `${roleTitle} joined your project team.`, entityType: "project", entityId: invite.projectId, href: `/?view=projects&project=${invite.projectId}` })));
    }
    await audit(member.id, `invitation.${decision}`, "invitation", invite.id);
    return NextResponse.json({ status: decision, projectId: invite.projectId });
  } catch (error) {
    return apiError(error);
  }
}
