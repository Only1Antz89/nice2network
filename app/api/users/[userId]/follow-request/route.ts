import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { blocks, followRequests, follows, privacySettings, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { createNotification } from "@/lib/notifications";

export async function POST(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const member = await requireMember();
    const { userId } = await params;
    if (member.id === userId) throw new ApiError(400, "You cannot request to follow yourself");
    const db = getDb();
    const [[requester], [target], [existingFollow], [blocked], [existingRequest]] = await Promise.all([
      db.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, member.id)).limit(1),
      db.select({ id: users.id, name: users.name, status: users.status, verified: users.emailVerified, onboarded: users.onboardingCompletedAt, ageBand: users.ageBand, visibility: privacySettings.profileVisibility })
        .from(users).leftJoin(privacySettings, eq(privacySettings.userId, users.id)).where(eq(users.id, userId)).limit(1),
      db.select({ id: follows.followerId }).from(follows).where(and(eq(follows.followerId, member.id), eq(follows.followingId, userId))).limit(1),
      db.select({ id: blocks.blockerId }).from(blocks).where(or(and(eq(blocks.blockerId, userId), eq(blocks.blockedId, member.id)), and(eq(blocks.blockerId, member.id), eq(blocks.blockedId, userId)))).limit(1),
      db.select({ id: followRequests.id, status: followRequests.status }).from(followRequests).where(and(eq(followRequests.requesterId, member.id), eq(followRequests.targetId, userId))).limit(1),
    ]);
    if (!target || target.status !== "active" || !target.verified || !target.onboarded) throw new ApiError(404, "Profile not found");
    if (target.visibility === "public") throw new ApiError(409, "This profile can be followed directly");
    if (requester?.ageBand !== target.ageBand) throw new ApiError(403, "This connection is unavailable");
    if (blocked) throw new ApiError(403, "This member is unavailable");
    if (existingFollow) return NextResponse.json({ status: "accepted", following: true });
    if (existingRequest?.status === "pending") return NextResponse.json({ status: "pending", requestId: existingRequest.id });

    const now = new Date();
    const [request] = existingRequest
      ? await db.update(followRequests).set({ status: "pending", respondedAt: null, updatedAt: now }).where(eq(followRequests.id, existingRequest.id)).returning({ id: followRequests.id })
      : await db.insert(followRequests).values({ requesterId: member.id, targetId: userId }).returning({ id: followRequests.id });
    await createNotification({
      userId,
      actorId: member.id,
      type: "match",
      title: `${member.name ?? "An n2 member"} requested to follow you`,
      body: "Review this request before sharing your private profile.",
      entityType: "follow_request",
      entityId: request.id,
      href: `/follow-request/${request.id}`,
      required: true,
    });
    return NextResponse.json({ status: "pending", requestId: request.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
