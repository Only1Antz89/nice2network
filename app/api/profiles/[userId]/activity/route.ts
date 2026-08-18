import { and, eq, isNotNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { follows, privacySettings, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { getProfileActivity } from "@/lib/profile-activity";

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const viewer = await requireMember();
    const { userId } = await params;
    const db = getDb();
    const [profile] = await db.select({ visibility: privacySettings.profileVisibility })
      .from(users)
      .leftJoin(privacySettings, eq(privacySettings.userId, users.id))
      .where(and(eq(users.id, userId), eq(users.status, "active"), isNotNull(users.emailVerified)))
      .limit(1);
    if (!profile) throw new ApiError(404, "Profile not found");

    if (viewer.id !== userId && (profile.visibility === "private" || profile.visibility === "connections")) {
      const directions = await db.select({ followerId: follows.followerId, followingId: follows.followingId }).from(follows).where(or(
        and(eq(follows.followerId, viewer.id), eq(follows.followingId, userId)),
        and(eq(follows.followerId, userId), eq(follows.followingId, viewer.id)),
      ));
      const viewerFollows = directions.some(item => item.followerId === viewer.id);
      const mutual = viewerFollows && directions.some(item => item.followerId === userId);
      if (profile.visibility === "private" && !viewerFollows) throw new ApiError(403, "This profile is private");
      if (profile.visibility === "connections" && !mutual) throw new ApiError(403, "This profile is visible to mutual connections");
    }

    return NextResponse.json(await getProfileActivity(userId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
