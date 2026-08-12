import { and, eq, isNull, or, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { conversationMembers, messages, sanctions } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";

const schema = z.object({ body: z.string().trim().min(1).max(5000) });

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const member = await requireMember();
    const { conversationId } = await params;
    const input = schema.parse(await request.json());
    const db = getDb();
    const [membership] = await db.select().from(conversationMembers).where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, member.id))).limit(1);
    if (!membership) throw new ApiError(403, "Conversation access required");
    const [restriction] = await db.select({ id: sanctions.id }).from(sanctions).where(and(eq(sanctions.userId, member.id), eq(sanctions.status, "active"), eq(sanctions.type, "messaging_restriction"), or(isNull(sanctions.expiresAt), gt(sanctions.expiresAt, new Date())))).limit(1);
    if (restriction) throw new ApiError(403, "Messaging is restricted on this account");
    const [message] = await db.insert(messages).values({ conversationId, senderId: member.id, body: input.body }).returning({ id: messages.id, createdAt: messages.createdAt });
    await trackProductEvent({ actorId: member.id, event: "message_sent", entityType: "conversation", entityId: conversationId });
    return NextResponse.json(message, { status: 201 });
  } catch (error) { return apiError(error); }
}
