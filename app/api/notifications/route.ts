import { and, count, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { applications, notificationPreferences, notifications, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { sendDueMeetingReminders } from "@/lib/meet-reminders";

export async function GET() {
  try {
    const member = await requireMember(), db = getDb();
    // Vercel Hobby runs scheduled jobs daily. Checking due reminders when an
    // active member opens notifications keeps short reminders timely.
    await sendDueMeetingReminders().catch(() => undefined);
    const [items, [unread], [unreadMessages], [preferences]] = await Promise.all([
      db.select({ id: notifications.id, type: notifications.type, title: notifications.title, body: notifications.body, entityType: notifications.entityType, entityId: notifications.entityId, href: notifications.href, readAt: notifications.readAt, createdAt: notifications.createdAt, actorName: users.name, actorImage: users.image, applicationProjectId: applications.projectId })
        .from(notifications)
        .leftJoin(users, eq(users.id, notifications.actorId))
        .leftJoin(applications, and(eq(notifications.entityType, "application"), sql`${applications.id}::text = ${notifications.entityId}`))
        .where(eq(notifications.userId, member.id)).orderBy(desc(notifications.createdAt)).limit(40),
      db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, member.id), ne(notifications.type, "message"), isNull(notifications.readAt))),
      db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, member.id), eq(notifications.type, "message"), isNull(notifications.readAt))),
      db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, member.id)).limit(1),
    ]);
    const linkedItems = items.map(({ applicationProjectId, ...item }) => ({
      ...item,
      href: applicationProjectId
        ? `/?view=projects&project=${applicationProjectId}`
        : item.href ?? (item.entityType === "project" && item.entityId ? `/?view=projects&project=${item.entityId}` : null),
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
    if (input.action === "read") await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, member.id)));
    if (input.action === "read_all") await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, member.id), isNull(notifications.readAt)));
    if (input.action === "read_conversation") await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, member.id), eq(notifications.type, "message"), eq(notifications.entityType, "conversation"), eq(notifications.entityId, input.conversationId), isNull(notifications.readAt)));
    if (input.action === "preferences") await db.insert(notificationPreferences).values({ userId: member.id, messages: input.messages, projects: input.projects, matches: input.matches, meets: input.meets, officialNotices: input.officialNotices, followedUpdates: input.followedUpdates, emailDigest: input.emailDigest }).onConflictDoUpdate({ target: notificationPreferences.userId, set: { messages: input.messages, projects: input.projects, matches: input.matches, meets: input.meets, officialNotices: input.officialNotices, followedUpdates: input.followedUpdates, emailDigest: input.emailDigest, updatedAt: new Date() } });
    const [[unread], [unreadMessages]] = await Promise.all([
      db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, member.id), ne(notifications.type, "message"), isNull(notifications.readAt))),
      db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, member.id), eq(notifications.type, "message"), isNull(notifications.readAt))),
    ]);
    return NextResponse.json({ success: true, unread: unread.value, unreadMessages: unreadMessages.value });
  } catch (error) { return apiError(error); }
}
