import { and, eq, gt, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { conversationMembers, conversationTyping, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";

async function requireConversationMember(conversationId: string, userId: string) {
  const [membership] = await getDb().select({ userId: conversationMembers.userId }).from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId))).limit(1);
  if (!membership) throw new ApiError(403, "Conversation access required");
}

export async function GET(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const member = await requireMember(), { conversationId } = await params, db = getDb();
    await requireConversationMember(conversationId, member.id);
    const people = await db.select({ id: users.id, name: users.name }).from(conversationTyping)
      .innerJoin(users, eq(users.id, conversationTyping.userId))
      .where(and(eq(conversationTyping.conversationId, conversationId), ne(conversationTyping.userId, member.id), gt(conversationTyping.updatedAt, new Date(Date.now() - 5000))));
    return NextResponse.json({ people });
  } catch (error) { return apiError(error); }
}

export async function POST(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const member = await requireMember(), { conversationId } = await params, db = getDb();
    await requireConversationMember(conversationId, member.id);
    await db.insert(conversationTyping).values({ conversationId, userId: member.id, updatedAt: new Date() })
      .onConflictDoUpdate({ target: [conversationTyping.conversationId, conversationTyping.userId], set: { updatedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
