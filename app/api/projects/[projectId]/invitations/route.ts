import { createHash, randomBytes } from "node:crypto";
import { after, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { invitations, projects, safetyRisks, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { trackProductEvent } from "@/lib/analytics";
import { createNotification } from "@/lib/notifications";
import { createCoOwnerInvitations } from "@/lib/project-co-owners";
import { hasActiveSanction } from "@/lib/admin-sanctions";

const schema = z.object({ email: z.email().optional(), inviteeId: z.uuid().optional(), roleId: z.uuid().optional(), membershipRole: z.enum(["contributor", "co_owner"]).default("contributor") })
  .refine(value => value.email || value.inviteeId, "Choose a member or provide an email");

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember();
    if (await hasActiveSanction(member.id, ["invitation_restriction"])) throw new ApiError(403, "Project invitations are restricted on this account");
    const { projectId } = await params;
    const input = schema.parse(await request.json());
    const db = getDb();
    const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, member.id))).limit(1);
    if (!project) throw new ApiError(403, "Only a project owner can invite people");
    if (project.status === "pending_deletion") throw new ApiError(409, "This project is pending deletion and is read-only");
    if (project.status === "deleted") throw new ApiError(404, "Project not found");

    if (input.membershipRole === "co_owner") {
      if (!input.inviteeId) throw new ApiError(400, "Choose a mutual connection to invite as co-owner");
      if (input.email) throw new ApiError(400, "Co-owner invitations must be sent to an existing mutual connection");
      if (input.roleId) throw new ApiError(400, "Co-owners are appointed to Leadership rather than a recruitment role");
      const [delivery] = await db.transaction(tx => createCoOwnerInvitations(tx, { projectId, ownerId: member.id, coOwnerIds: [input.inviteeId!] }));
      after(() => createNotification({ userId: delivery.inviteeId, actorId: member.id, type: "invitation", title: `${member.name ?? "An n2 member"} invited you to co-own a project`, body: project.title, entityType: "invitation", entityId: delivery.invitationId, href: `/invite/${delivery.token}` }).catch(() => undefined));
      await audit(member.id, "project.co_owner_invited", "project", projectId, { invitationId: delivery.invitationId, inviteeId: delivery.inviteeId });
      return NextResponse.json({ id: delivery.invitationId, inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${delivery.token}` }, { status: 201 });
    }

    if (input.inviteeId) {
      const [inviter] = await db.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, member.id)).limit(1);
      const [invitee] = await db.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, input.inviteeId)).limit(1);
      const mixedAge = inviter?.ageBand !== invitee?.ageBand && [inviter?.ageBand, invitee?.ageBand].includes("teen_16_17");
      if (mixedAge && inviter?.ageBand !== "teen_16_17") {
        await db.insert(safetyRisks).values({ subjectUserId: input.inviteeId, type: "adult_teen_invitation_blocked", severity: "high", details: { projectId } });
        throw new ApiError(403, "Adults cannot send unsolicited project invitations to 16–17-year-old members");
      }
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [invitation] = await db.insert(invitations).values({ ...input, membershipRole: "contributor", projectId, invitedBy: member.id, tokenHash, expiresAt: new Date(Date.now() + 7 * 86_400_000) }).returning();
    if(input.inviteeId)await createNotification({userId:input.inviteeId,actorId:member.id,type:"invitation",title:`${member.name??"An n2 member"} invited you to a project`,body:project.title,entityType:"invitation",entityId:invitation.id,href:`/invite/${token}`});
    await audit(member.id, "project.invited", "project", projectId, { invitationId: invitation.id });
    await trackProductEvent({ actorId: member.id, event: "project_invitation_created", entityType: "project", entityId: projectId });
    return NextResponse.json({ id: invitation.id, inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`, expiresAt: invitation.expiresAt }, { status: 201 });
  } catch (error) { return apiError(error); }
}
