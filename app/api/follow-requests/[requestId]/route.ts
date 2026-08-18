import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { blocks, followRequests, follows, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { createNotification } from "@/lib/notifications";

async function requestDetails(requestId: string) {
  const requester = users;
  const [row] = await getDb().select({
    id: followRequests.id,
    requesterId: followRequests.requesterId,
    targetId: followRequests.targetId,
    status: followRequests.status,
    createdAt: followRequests.createdAt,
    requesterName: requester.name,
    requesterUsername: requester.username,
    requesterImage: requester.image,
    requesterProfession: requester.profession,
    requesterAgeBand: requester.ageBand,
  }).from(followRequests).innerJoin(requester, eq(requester.id, followRequests.requesterId)).where(eq(followRequests.id, requestId)).limit(1);
  return row;
}

export async function GET(_: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const member = await requireMember();
    const { requestId } = await params;
    const request = await requestDetails(requestId);
    if (!request || (request.targetId !== member.id && request.requesterId !== member.id)) throw new ApiError(404, "Follow request not found");
    return NextResponse.json({ request, canRespond: request.targetId === member.id }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const member = await requireMember();
    const { requestId } = await params;
    const { decision } = z.object({ decision: z.enum(["accepted", "declined"]) }).parse(await request.json());
    const db = getDb();
    const followRequest = await requestDetails(requestId);
    if (!followRequest || followRequest.targetId !== member.id) throw new ApiError(404, "Follow request not found");
    if (followRequest.status !== "pending") throw new ApiError(409, "This follow request has already been answered");
    const [[target], [blocked]] = await Promise.all([
      db.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, member.id)).limit(1),
      db.select({ id: blocks.blockerId }).from(blocks).where(or(and(eq(blocks.blockerId, member.id), eq(blocks.blockedId, followRequest.requesterId)), and(eq(blocks.blockerId, followRequest.requesterId), eq(blocks.blockedId, member.id)))).limit(1),
    ]);
    if (decision === "accepted" && (blocked || target?.ageBand !== followRequest.requesterAgeBand)) throw new ApiError(403, "This connection is no longer available");
    const now = new Date();
    await db.transaction(async (tx) => {
      const [updated] = await tx.update(followRequests).set({ status: decision, respondedAt: now, updatedAt: now }).where(and(eq(followRequests.id, requestId), eq(followRequests.targetId, member.id), eq(followRequests.status, "pending"))).returning({ id: followRequests.id });
      if (!updated) throw new ApiError(409, "This follow request has already been answered");
      if (decision === "accepted") await tx.insert(follows).values({ followerId: followRequest.requesterId, followingId: member.id }).onConflictDoNothing();
    });
    await createNotification({
      userId: followRequest.requesterId,
      actorId: member.id,
      type: "match",
      title: decision === "accepted" ? `${member.name ?? "An n2 member"} accepted your follow request` : "Follow request declined",
      body: decision === "accepted" ? "You can now view this member’s profile." : "This member chose to keep their profile private.",
      entityType: "user",
      entityId: member.id,
      href: decision === "accepted" ? `/?profile=${member.id}` : "/?view=notifications",
      required: true,
    });
    return NextResponse.json({ status: decision });
  } catch (error) {
    return apiError(error);
  }
}
