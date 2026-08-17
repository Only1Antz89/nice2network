import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { conversationMembers, conversations, introductionRequests, messages } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";
import { createNotifications } from "@/lib/notifications";
import { validateIntroductionPath } from "@/lib/network-introductions";

const schema = z.object({ action: z.enum(["accept", "decline"]) });

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireMember(), { id } = await params;
    const [record] = (await getDb().execute(sql`
      select ir.id,ir.context,ir.status,ir.expires_at,
        requester.name as requester_name,requester.image as requester_image,requester.profession as requester_profession,
        target.name as target_name,target.image as target_image,target.profession as target_profession
      from introduction_requests ir
      join users requester on requester.id=ir.requester_id
      join users target on target.id=ir.target_id
      where ir.id=${id}::uuid and ir.connector_id=${member.id}
      limit 1
    `)) as unknown as Array<Record<string, unknown>>;
    if (!record) throw new ApiError(404, "Introduction request not found");
    return NextResponse.json(record);
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireMember(), { id } = await params, { action } = schema.parse(await request.json()), db = getDb();
    const [record] = await db.select().from(introductionRequests).where(and(eq(introductionRequests.id, id), eq(introductionRequests.connectorId, member.id))).limit(1);
    if (!record) throw new ApiError(404, "Introduction request not found");
    if (record.status !== "pending") throw new ApiError(409, "This introduction request has already been answered");
    if (record.expiresAt <= new Date()) {
      await db.update(introductionRequests).set({ status: "expired", respondedAt: new Date() }).where(eq(introductionRequests.id, id));
      throw new ApiError(410, "This introduction request has expired");
    }
    if (action === "decline") {
      await db.update(introductionRequests).set({ status: "declined", respondedAt: new Date() }).where(and(eq(introductionRequests.id, id), eq(introductionRequests.status, "pending")));
      await trackProductEvent({ actorId: member.id, event: "introduction_declined", entityType: "introduction", entityId: id });
      return NextResponse.json({ status: "declined" });
    }
    const parties = await validateIntroductionPath(db, record.requesterId, record.connectorId, record.targetId);
    const conversation = await db.transaction(async (tx) => {
      const [claimed] = await tx.update(introductionRequests).set({ status: "accepted", respondedAt: new Date() }).where(and(eq(introductionRequests.id, id), eq(introductionRequests.status, "pending"))).returning();
      if (!claimed) throw new ApiError(409, "This introduction request has already been answered");
      const [created] = await tx.insert(conversations).values({ initiatedBy: record.requesterId, name: `Introduction · ${parties.requester.name ?? "Member"} & ${parties.target.name ?? "Member"}` }).returning();
      await tx.insert(conversationMembers).values([record.requesterId, record.connectorId, record.targetId].map((userId) => ({ conversationId: created.id, userId })));
      await tx.insert(messages).values({ conversationId: created.id, senderId: record.requesterId, body: `Introduction via ${parties.connector.name ?? "a mutual connection"}: ${record.context}` });
      await tx.update(introductionRequests).set({ conversationId: created.id }).where(eq(introductionRequests.id, id));
      return created;
    });
    await createNotifications([
      { userId: record.requesterId, actorId: member.id, type: "message", title: `${parties.connector.name ?? "Your connection"} made the introduction`, body: `A conversation with ${parties.target.name ?? "the member"} is ready.`, entityType: "conversation", entityId: conversation.id, href: "/?view=messages" },
      { userId: record.targetId, actorId: member.id, type: "message", title: `${parties.connector.name ?? "A connection"} introduced you`, body: `${parties.requester.name ?? "A member"} shared some context in a new conversation.`, entityType: "conversation", entityId: conversation.id, href: "/?view=messages" },
    ]);
    await trackProductEvent({ actorId: member.id, event: "introduction_accepted", entityType: "conversation", entityId: conversation.id });
    return NextResponse.json({ status: "accepted", conversationId: conversation.id });
  } catch (error) { return apiError(error); }
}
