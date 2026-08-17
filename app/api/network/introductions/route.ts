import { and, count, eq, gt, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { introductionRequests } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";
import { createNotification } from "@/lib/notifications";
import { validateIntroductionPath } from "@/lib/network-introductions";

const schema = z.object({ connectorId: z.uuid(), targetId: z.uuid(), context: z.string().trim().min(20).max(500) });

export async function POST(request: Request) {
  try {
    const member = await requireMember(), input = schema.parse(await request.json()), db = getDb();
    await db.update(introductionRequests).set({ status: "expired", respondedAt: new Date() }).where(and(eq(introductionRequests.status, "pending"), lt(introductionRequests.expiresAt, new Date())));
    const [{ value }] = await db.select({ value: count() }).from(introductionRequests).where(and(eq(introductionRequests.requesterId, member.id), gt(introductionRequests.createdAt, new Date(Date.now() - 86_400_000))));
    if (value >= 10) throw new ApiError(429, "You have requested several introductions today. Try again tomorrow.");
    const parties = await validateIntroductionPath(db, member.id, input.connectorId, input.targetId);
    let created;
    try {
      [created] = await db.insert(introductionRequests).values({ requesterId: member.id, connectorId: input.connectorId, targetId: input.targetId, context: input.context, expiresAt: new Date(Date.now() + 14 * 86_400_000) }).returning();
    } catch (error) {
      if (error instanceof Error && /unique/i.test(error.message)) throw new ApiError(409, "An introduction request is already pending");
      throw error;
    }
    await createNotification({ userId: input.connectorId, actorId: member.id, type: "match", title: `${parties.requester.name ?? "A member"} asked for an introduction`, body: `Could you introduce them to ${parties.target.name ?? "a member"}?`, entityType: "introduction", entityId: created.id, href: `/?view=network&introduction=${created.id}` });
    await trackProductEvent({ actorId: member.id, event: "introduction_requested", entityType: "introduction", entityId: created.id });
    return NextResponse.json(created, { status: 201 });
  } catch (error) { return apiError(error); }
}
