import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { blocks, follows, invitations, projectMembers, projects, sanctions, users } from "@/db/schema";
import { ApiError } from "@/lib/api";

export const MAX_CO_OWNERS = 2;

export const coOwnerIdsSchema = z.array(z.uuid()).max(MAX_CO_OWNERS, "Choose no more than two co-owners").default([]).superRefine((ids, context) => {
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", message: "Choose each co-owner only once" });
});

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export type CoOwnerInvitationDelivery = {
  invitationId: string;
  inviteeId: string;
  inviteeName: string;
  token: string;
};

function credential() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: createHash("sha256").update(token).digest("hex") };
}

export async function createCoOwnerInvitations(tx: Transaction, input: {
  projectId: string;
  ownerId: string;
  coOwnerIds: string[];
}): Promise<CoOwnerInvitationDelivery[]> {
  const ids = coOwnerIdsSchema.parse(input.coOwnerIds);
  if (!ids.length) return [];
  if (ids.includes(input.ownerId)) throw new ApiError(400, "The primary owner cannot also be selected as a co-owner");

  await tx.execute(sql`select id from projects where id = ${input.projectId}::uuid for update`);
  const [project] = await tx.select({ ownerId: projects.ownerId, status: projects.status }).from(projects).where(eq(projects.id, input.projectId)).limit(1);
  if (!project || project.ownerId !== input.ownerId) throw new ApiError(403, "Only the primary owner can appoint co-owners");
  if (!["draft", "active"].includes(project.status)) throw new ApiError(409, "Co-owners cannot be invited while this project is read-only");

  const [owner] = await tx.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, input.ownerId)).limit(1);
  const candidates = await tx.select({ id: users.id, name: users.name, username: users.username, status: users.status, ageBand: users.ageBand, emailVerified: users.emailVerified, onboardingCompletedAt: users.onboardingCompletedAt }).from(users).where(inArray(users.id, ids));
  const candidatesById = new Map(candidates.map(candidate => [candidate.id, candidate]));

  const [connections, blocked, restricted, existingMembers, existingInvites, capacity] = await Promise.all([
    tx.select({ followerId: follows.followerId, followingId: follows.followingId }).from(follows).where(or(
      and(eq(follows.followerId, input.ownerId), inArray(follows.followingId, ids)),
      and(eq(follows.followingId, input.ownerId), inArray(follows.followerId, ids)),
    )),
    tx.select({ blockerId: blocks.blockerId, blockedId: blocks.blockedId }).from(blocks).where(or(
      and(eq(blocks.blockerId, input.ownerId), inArray(blocks.blockedId, ids)),
      and(eq(blocks.blockedId, input.ownerId), inArray(blocks.blockerId, ids)),
    )),
    tx.select({ userId: sanctions.userId }).from(sanctions).where(and(inArray(sanctions.userId, ids), eq(sanctions.status, "active"), or(isNull(sanctions.expiresAt), gt(sanctions.expiresAt, new Date())))),
    tx.select({ userId: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, input.projectId), inArray(projectMembers.userId, ids))),
    tx.select({ inviteeId: invitations.inviteeId }).from(invitations).where(and(eq(invitations.projectId, input.projectId), eq(invitations.membershipRole, "co_owner"), eq(invitations.status, "pending"), gt(invitations.expiresAt, new Date()), inArray(invitations.inviteeId, ids))),
    tx.execute(sql`select
      (select count(*)::int from project_members where project_id = ${input.projectId}::uuid and membership_role = 'co_owner') as active,
      (select count(*)::int from invitations where project_id = ${input.projectId}::uuid and membership_role = 'co_owner' and status = 'pending' and expires_at > now()) as reserved`),
  ]);

  const outbound = new Set(connections.filter(row => row.followerId === input.ownerId).map(row => row.followingId));
  const inbound = new Set(connections.filter(row => row.followingId === input.ownerId).map(row => row.followerId));
  const blockedIds = new Set(blocked.map(row => row.blockerId === input.ownerId ? row.blockedId : row.blockerId));
  const restrictedIds = new Set(restricted.map(row => row.userId));
  const memberIds = new Set(existingMembers.map(row => row.userId));
  const alreadyInvited = new Set(existingInvites.flatMap(row => row.inviteeId ? [row.inviteeId] : []));
  const capacityRow = (capacity as unknown as Array<{ active: number; reserved: number }>)[0];
  if (Number(capacityRow?.active ?? 0) + Number(capacityRow?.reserved ?? 0) + ids.length > MAX_CO_OWNERS) {
    throw new ApiError(409, "This project already has two active or invited co-owners");
  }

  for (const id of ids) {
    const candidate = candidatesById.get(id);
    const label = candidate?.name || (candidate?.username ? `@${candidate.username}` : "This person");
    if (!candidate) throw new ApiError(400, `The selected co-owner (${id}) no longer exists`);
    if (candidate.status !== "active" || !candidate.emailVerified || !candidate.onboardingCompletedAt) throw new ApiError(409, `${label} is not currently eligible to become a co-owner`);
    if (!outbound.has(id) || !inbound.has(id)) throw new ApiError(409, `${label} is no longer a mutual connection`);
    if (blockedIds.has(id)) throw new ApiError(409, `${label} cannot be invited because this connection is restricted`);
    if (restrictedIds.has(id)) throw new ApiError(409, `${label} is not currently eligible to become a co-owner`);
    const mixedAge = owner?.ageBand !== candidate.ageBand && [owner?.ageBand, candidate.ageBand].includes("teen_16_17");
    if (mixedAge) throw new ApiError(403, `${label} cannot be appointed under the current member safety rules`);
    if (memberIds.has(id)) throw new ApiError(409, `${label} is already a member of this project`);
    if (alreadyInvited.has(id)) throw new ApiError(409, `${label} already has a pending co-owner invitation`);
  }

  const expiresAt = new Date(Date.now() + 7 * 86_400_000);
  const deliveries: CoOwnerInvitationDelivery[] = [];
  for (const id of ids) {
    const { token, tokenHash } = credential();
    const [invitation] = await tx.insert(invitations).values({ projectId: input.projectId, invitedBy: input.ownerId, inviteeId: id, membershipRole: "co_owner", tokenHash, expiresAt }).returning({ id: invitations.id });
    deliveries.push({ invitationId: invitation.id, inviteeId: id, inviteeName: candidatesById.get(id)?.name || "n2 member", token });
  }
  return deliveries;
}
