import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { blocks } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function POST(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const member = await requireMember();
    const { userId } = await params;
    if (userId === member.id) throw new ApiError(400, "You cannot block yourself");
    await getDb().insert(blocks).values({ blockerId: member.id, blockedId: userId }).onConflictDoNothing();
    await audit(member.id, "user.blocked", "user", userId);
    return NextResponse.json({ blocked: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const member = await requireMember();
    const { userId } = await params;
    await getDb().delete(blocks).where(and(eq(blocks.blockerId, member.id), eq(blocks.blockedId, userId)));
    await audit(member.id, "user.unblocked", "user", userId);
    return NextResponse.json({ blocked: false });
  } catch (error) { return apiError(error); }
}
