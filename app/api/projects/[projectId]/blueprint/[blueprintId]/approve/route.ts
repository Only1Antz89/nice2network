import { after, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { blueprintRoleSchema } from "@/lib/recommendations/blueprint-schema";
import { approveProjectBlueprint } from "@/lib/recommendations/service";
import { ensureProjectEmbedding } from "@/lib/recommendations/project-similarity";
import { coOwnerIdsSchema } from "@/lib/project-co-owners";
import { createNotifications } from "@/lib/notifications";

const milestoneSchema=z.object({title:z.string().trim().min(3).max(160),description:z.string().trim().max(800).optional(),phase:z.enum(["now","next","later"]).default("now"),ownerId:z.uuid().nullable().optional(),dueAt:z.iso.datetime().nullable().optional()});
const schema = z.object({ roles: z.array(blueprintRoleSchema).min(1).max(18), milestones:z.array(milestoneSchema).min(1).max(15), visibility: z.enum(["network", "connections", "private"]).default("network"), allowRemoteFallback: z.boolean().default(false), coOwnerIds: coOwnerIdsSchema, draftId: z.uuid().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; blueprintId: string }> }) {
  try {
    const member = await requireMember(), { projectId, blueprintId } = await params, input = schema.parse(await request.json());
    const result = await approveProjectBlueprint({ projectId, blueprintId, userId: member.id, roles: input.roles, milestones:input.milestones, visibility: input.visibility, allowRemoteFallback: input.allowRemoteFallback, coOwnerIds: input.coOwnerIds, draftId: input.draftId });
    after(() => ensureProjectEmbedding(projectId).catch(() => undefined));
    after(() => createNotifications(result.coOwnerInvitations.map(invitation => ({ userId: invitation.inviteeId, actorId: member.id, type: "invitation", title: `${member.name ?? "An n2 member"} invited you to co-own a project`, body: "Accept the invitation to receive co-owner permissions.", entityType: "invitation", entityId: invitation.invitationId, href: `/invite/${invitation.token}` }))).catch(() => undefined));
    await audit(member.id, "project.blueprint_approved", "project", projectId, { blueprintId, roleCount: input.roles.length });
    return NextResponse.json({ success: true, projectId, coOwnerInvitationCount: result.coOwnerInvitations.length });
  } catch (error) { return apiError(error); }
}
