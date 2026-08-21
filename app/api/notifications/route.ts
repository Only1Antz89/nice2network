import { and, count, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { applications, birthdayEvents, notificationPreferences, notifications, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { sendDueMeetingReminders } from "@/lib/meet-reminders";
import { BIRTHDAY_ARTWORK_URL } from "@/lib/birthday-notifications";
import { PROJECT_JOIN_ARTWORK_URL } from "@/lib/project-join-notifications";

const visibleNotification = or(
  ne(notifications.type, "message"),
  ilike(notifications.title, "%tagged you%"),
  ilike(notifications.title, "%mentioned you%"),
);

function visibleToMember(userId: string) {
  return and(
    or(ne(notifications.type, "birthday"), sql<boolean>`exists (
      select 1
      from birthday_events be
      inner join users subject on subject.id = be.subject_user_id
      left join privacy_settings bps on bps.user_id = subject.id
      where be.id::text = ${notifications.entityId}
        and be.subject_user_id = ${notifications.actorId}
        and subject.status = 'active'
        and coalesce(bps.birthday_celebrations_enabled, subject.age_band <> 'teen_16_17')
        and exists(select 1 from follows f where f.follower_id = ${userId}::uuid and f.following_id = subject.id)
        and exists(select 1 from follows f where f.follower_id = subject.id and f.following_id = ${userId}::uuid)
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${userId}::uuid and b.blocked_id = subject.id)
             or (b.blocker_id = subject.id and b.blocked_id = ${userId}::uuid)
        )
    )`),
    or(isNull(notifications.entityType), ne(notifications.entityType, "project_join"), sql<boolean>`exists (
      select 1
      from projects p
      inner join project_members pm on pm.project_id = p.id and pm.user_id = ${notifications.actorId}
      inner join users joiner on joiner.id = pm.user_id
      where p.id::text = ${notifications.entityId}
        and p.status = 'active'
        and p.visibility = 'network'
        and joiner.status = 'active'
        and exists(select 1 from follows f where f.follower_id = ${userId}::uuid and f.following_id = joiner.id)
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${userId}::uuid and b.blocked_id = joiner.id)
             or (b.blocker_id = joiner.id and b.blocked_id = ${userId}::uuid)
        )
    )`),
  );
}

export async function GET() {
  try {
    const member = await requireMember(), db = getDb();
    // Vercel Hobby runs scheduled jobs daily. Checking due reminders when an
    // active member opens notifications keeps short reminders timely.
    await sendDueMeetingReminders().catch(() => undefined);
    const [items, [unread], [unreadMessages], [preferences]] = await Promise.all([
      db.select({ id: notifications.id, type: notifications.type, title: notifications.title, body: notifications.body, entityType: notifications.entityType, entityId: notifications.entityId, href: notifications.href, readAt: notifications.readAt, createdAt: notifications.createdAt, actorName: users.name, actorImage: users.image, applicationProjectId: applications.projectId, birthdayEventId: birthdayEvents.id, birthdaySubjectId: birthdayEvents.subjectUserId })
        .from(notifications)
        .leftJoin(users, eq(users.id, notifications.actorId))
        .leftJoin(applications, and(eq(notifications.entityType, "application"), sql`${applications.id}::text = ${notifications.entityId}`))
        .leftJoin(birthdayEvents, and(eq(notifications.entityType, "birthday"), sql`${birthdayEvents.id}::text = ${notifications.entityId}`))
        .where(and(eq(notifications.userId, member.id), visibleToMember(member.id))).orderBy(desc(notifications.createdAt)).limit(40),
      db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, member.id), visibleNotification, visibleToMember(member.id), isNull(notifications.readAt))),
      db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, member.id), eq(notifications.type, "message"), isNull(notifications.readAt))),
      db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, member.id)).limit(1),
    ]);
    const linkedItems = items.map(({ applicationProjectId, birthdayEventId, birthdaySubjectId, ...item }) => ({
      ...item,
      href: applicationProjectId
        ? `/?view=projects&project=${applicationProjectId}`
        : item.href ?? (item.entityType === "project" && item.entityId ? `/?view=projects&project=${item.entityId}` : null),
      birthday: birthdayEventId && birthdaySubjectId ? {
        eventId: birthdayEventId,
        subjectUserId: birthdaySubjectId,
        artworkUrl: BIRTHDAY_ARTWORK_URL,
      } : null,
      projectJoin: item.entityType === "project_join" && item.entityId ? {
        projectId: item.entityId,
        artworkUrl: PROJECT_JOIN_ARTWORK_URL,
      } : null,
    }));
    return NextResponse.json({ notifications: linkedItems, unread: unread.value, unreadMessages: unreadMessages.value, preferences: preferences ?? { messages: true, projects: true, matches: true, meets: true, officialNotices: true, followedUpdates: true, emailDigest: "weekly" } });
  } catch (error) { return apiError(error); }
}

export async function DELETE() {
  try {
    const member = await requireMember(), db = getDb();
    await db.delete(notifications).where(eq(notifications.userId, member.id));
    return NextResponse.json({ success: true, unread: 0, unreadMessages: 0 });
  } catch (error) { return apiError(error); }
}

const patchSchema = z.union([
  z.object({ action: z.literal("read"), notificationId: z.uuid() }),
  z.object({ action: z.literal("read_all") }),
  z.object({ action: z.literal("read_conversation"), conversationId: z.uuid() }),
  z.object({ action: z.literal("preferences"), messages: z.boolean(), projects: z.boolean(), matches: z.boolean(), meets: z.boolean(), officialNotices: z.boolean().default(true), followedUpdates: z.boolean().default(true), emailDigest: z.enum(["daily", "weekly", "never"]) }),
]);
export async function PATCH(request: Request) {
  try {
    const member = await requireMember(), input = patchSchema.parse(await request.json()), db = getDb();
    if (input.action === "read") await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, member.id), visibleToMember(member.id)));
    if (input.action === "read_all") await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, member.id), isNull(notifications.readAt)));
    if (input.action === "read_conversation") await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, member.id), eq(notifications.type, "message"), eq(notifications.entityType, "conversation"), eq(notifications.entityId, input.conversationId), isNull(notifications.readAt)));
    if (input.action === "preferences") await db.insert(notificationPreferences).values({ userId: member.id, messages: input.messages, projects: input.projects, matches: input.matches, meets: input.meets, officialNotices: input.officialNotices, followedUpdates: input.followedUpdates, emailDigest: input.emailDigest }).onConflictDoUpdate({ target: notificationPreferences.userId, set: { messages: input.messages, projects: input.projects, matches: input.matches, meets: input.meets, officialNotices: input.officialNotices, followedUpdates: input.followedUpdates, emailDigest: input.emailDigest, updatedAt: new Date() } });
    const [[unread], [unreadMessages]] = await Promise.all([
      db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, member.id), visibleNotification, visibleToMember(member.id), isNull(notifications.readAt))),
      db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, member.id), eq(notifications.type, "message"), isNull(notifications.readAt))),
    ]);
    return NextResponse.json({ success: true, unread: unread.value, unreadMessages: unreadMessages.value });
  } catch (error) { return apiError(error); }
}
