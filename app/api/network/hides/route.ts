import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { networkMapHides, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";

const schema = z.object({ targetId: z.uuid() });

export async function GET() {
  try {
    const member = await requireMember();
    const items = await getDb().select({ id: users.id, name: users.name, image: users.image, profession: users.profession, hiddenAt: networkMapHides.createdAt })
      .from(networkMapHides).innerJoin(users, eq(users.id, networkMapHides.hiddenUserId)).where(eq(networkMapHides.viewerId, member.id));
    return NextResponse.json({ items });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(), { targetId } = schema.parse(await request.json());
    if (targetId === member.id) throw new ApiError(400, "You cannot hide yourself");
    await getDb().insert(networkMapHides).values({ viewerId: member.id, hiddenUserId: targetId }).onConflictDoNothing();
    await trackProductEvent({ actorId: member.id, event: "network_connection_hidden", entityType: "user", entityId: targetId });
    return NextResponse.json({ hidden: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const member = await requireMember(), targetId = new URL(request.url).searchParams.get("targetId");
    if (!targetId || !z.uuid().safeParse(targetId).success) throw new ApiError(400, "Choose a hidden member");
    await getDb().delete(networkMapHides).where(and(eq(networkMapHides.viewerId, member.id), eq(networkMapHides.hiddenUserId, targetId)));
    return NextResponse.json({ hidden: false });
  } catch (error) { return apiError(error); }
}
