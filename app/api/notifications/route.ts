import { and, count, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { notificationPreferences, notifications, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { sendDueMeetingReminders } from "@/lib/meet-reminders";

export async function GET() {
  try {
    const member = await requireMember(), db = getDb();
    // Vercel Hobby runs scheduled jobs daily. Checking due reminders when an
    // active member opens notifications keeps short reminders timely.
    await sendDueMeetingReminders().catch(() => undefined);
    const [items, [unread], [preferences]] = await Promise.all([
      db.select({ id: notifications.id, type: notifications.type, title: notifications.title, body: notifications.body, href: notifications.href, readAt: notifications.readAt, createdAt: notifications.createdAt, actorName: users.name, actorImage: users.image })
        .from(notifications).leftJoin(users, eq(users.id, notifications.actorId)).where(eq(notifications.userId, member.id)).orderBy(desc(notifications.createdAt)).limit(40),
      db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, member.id), isNull(notifications.readAt))),
      db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, member.id)).limit(1),
    ]);
    return NextResponse.json({ notifications: items, unread: unread.value, preferences: preferences ?? { messages: true, projects: true, matches: true, meets: true, officialNotices: true, emailDigest: "weekly" } });
  } catch (error) { return apiError(error); }
}

const patchSchema = z.union([
  z.object({ action: z.literal("read"), notificationId: z.uuid() }),
  z.object({ action: z.literal("read_all") }),
  z.object({ action: z.literal("preferences"), messages: z.boolean(), projects: z.boolean(), matches: z.boolean(), meets: z.boolean(), officialNotices: z.boolean().default(true), emailDigest: z.enum(["daily", "weekly", "never"]) }),
]);
export async function PATCH(request: Request) {
  try {
    const member = await requireMember(), input = patchSchema.parse(await request.json()), db = getDb();
    if (input.action === "read") await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, member.id)));
    if (input.action === "read_all") await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, member.id), isNull(notifications.readAt)));
    if (input.action === "preferences") await db.insert(notificationPreferences).values({ userId: member.id, messages: input.messages, projects: input.projects, matches: input.matches, meets: input.meets, officialNotices: input.officialNotices, emailDigest: input.emailDigest }).onConflictDoUpdate({ target: notificationPreferences.userId, set: { messages: input.messages, projects: input.projects, matches: input.matches, meets: input.meets, officialNotices: input.officialNotices, emailDigest: input.emailDigest, updatedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
