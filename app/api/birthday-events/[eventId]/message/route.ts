import { and, eq, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { birthdayEvents, blocks, conversationMembers, conversations, follows, privacySettings, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { hasActiveSanction } from "@/lib/admin-sanctions";
import { getMessageEligibility } from "@/lib/messaging-permissions";

export async function POST(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const member = await requireMember();
    if (await hasActiveSanction(member.id, ["messaging_restriction"])) throw new ApiError(403, "Messaging is restricted on this account");
    const eventId = z.uuid().parse((await params).eventId);
    const db = getDb();
    const [event] = await db.select({
      subjectUserId: birthdayEvents.subjectUserId,
      status: users.status,
      messagePermission: privacySettings.messagePermission,
      birthdayEnabled: privacySettings.birthdayCelebrationsEnabled,
      ageBand: users.ageBand,
    }).from(birthdayEvents)
      .innerJoin(users, eq(users.id, birthdayEvents.subjectUserId))
      .leftJoin(privacySettings, eq(privacySettings.userId, users.id))
      .where(eq(birthdayEvents.id, eventId)).limit(1);
    if (!event || event.status !== "active" || event.birthdayEnabled === false || (event.birthdayEnabled == null && event.ageBand === "teen_16_17")) throw new ApiError(404, "Birthday celebration unavailable");

    const [directions, blocked] = await Promise.all([
      db.select({ followerId: follows.followerId }).from(follows).where(or(
        and(eq(follows.followerId, member.id), eq(follows.followingId, event.subjectUserId)),
        and(eq(follows.followerId, event.subjectUserId), eq(follows.followingId, member.id)),
      )),
      db.select({ id: blocks.blockerId }).from(blocks).where(or(
        and(eq(blocks.blockerId, member.id), eq(blocks.blockedId, event.subjectUserId)),
        and(eq(blocks.blockerId, event.subjectUserId), eq(blocks.blockedId, member.id)),
      )).limit(1),
    ]);
    const mutual = directions.some(row => row.followerId === member.id) && directions.some(row => row.followerId === event.subjectUserId);
    if (!mutual || blocked.length) throw new ApiError(403, "This birthday celebration is only available to current connections");
    const eligibility = getMessageEligibility({ permission: event.messagePermission, sharedProject: false, mutual: true, senderIsAdmin: false, recipientIsAdmin: false });
    if (!eligibility.canMessage) throw new ApiError(403, eligibility.reason);

    const conversationId = await db.transaction(async tx => {
      const pairKey = [member.id, event.subjectUserId].sort().join(":");
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${pairKey}))`);
      const existing = await tx.execute<{ id: string }>(sql`
        select c.id
        from conversations c
        where c.project_id is null and c.status <> 'deleted'
          and exists(select 1 from conversation_members cm where cm.conversation_id = c.id and cm.user_id = ${member.id}::uuid)
          and exists(select 1 from conversation_members cm where cm.conversation_id = c.id and cm.user_id = ${event.subjectUserId}::uuid)
          and (select count(*) from conversation_members cm where cm.conversation_id = c.id) = 2
        order by c.updated_at desc
        limit 1
      `);
      if (existing[0]) {
        await tx.update(conversationMembers).set({ archivedAt: null, snoozedUntil: null }).where(and(eq(conversationMembers.conversationId, existing[0].id), eq(conversationMembers.userId, member.id)));
        return existing[0].id;
      }
      const [conversation] = await tx.insert(conversations).values({ initiatedBy: member.id }).returning({ id: conversations.id });
      await tx.insert(conversationMembers).values([
        { conversationId: conversation.id, userId: member.id },
        { conversationId: conversation.id, userId: event.subjectUserId },
      ]);
      return conversation.id;
    });
    return NextResponse.json({ conversationId }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
