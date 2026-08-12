import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { conversationMembers, conversations, projectMembers, safetyRisks, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";

const schema = z.object({ recipientId: z.uuid(), projectId: z.uuid().optional() });

export async function POST(request: Request) {
  try {
    const member = await requireMember();
    const input = schema.parse(await request.json());
    if (input.recipientId === member.id) throw new ApiError(400, "Choose another member");
    const db = getDb();
    const [sender] = await db.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, member.id)).limit(1);
    const [recipient] = await db.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, input.recipientId)).limit(1);
    if (!recipient) throw new ApiError(404, "Member not found");
    const mixedAge = sender?.ageBand !== recipient.ageBand && [sender?.ageBand, recipient.ageBand].includes("teen_16_17");
    if (mixedAge) {
      const teenId = sender?.ageBand === "teen_16_17" ? member.id : input.recipientId;
      if (sender?.ageBand !== "teen_16_17" || !input.projectId) {
        await db.insert(safetyRisks).values({ subjectUserId: teenId, type: "adult_teen_contact_blocked", severity: "high", details: { attemptedBy: member.id, projectId: input.projectId ?? null } });
        throw new ApiError(403, "Adult and teen contact must be initiated by the teen within a shared project");
      }
      const memberships = await db.select({ userId: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, input.projectId), eq(projectMembers.userId, member.id)));
      const [recipientMembership] = await db.select({ userId: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, input.projectId), eq(projectMembers.userId, input.recipientId))).limit(1);
      if (!memberships.length || !recipientMembership) throw new ApiError(403, "A shared project is required for adult and teen contact");
    }
    const result = await db.transaction(async tx => {
      const [conversation] = await tx.insert(conversations).values({ initiatedBy: member.id, projectId: input.projectId }).returning();
      await tx.insert(conversationMembers).values([{ conversationId: conversation.id, userId: member.id }, { conversationId: conversation.id, userId: input.recipientId }]);
      return conversation;
    });
    await trackProductEvent({ actorId: member.id, ageBand: sender?.ageBand, event: "conversation_started", entityType: "conversation", entityId: result.id });
    return NextResponse.json(result, { status: 201 });
  } catch (error) { return apiError(error); }
}
