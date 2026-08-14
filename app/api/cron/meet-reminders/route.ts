import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { meetingParticipants, meetings } from "@/db/schema";
import { createNotifications } from "@/lib/notifications";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const pending = await db.select().from(meetings).where(and(
    isNull(meetings.reminderSentAt),
    gt(meetings.startsAt, now),
    lte(meetings.startsAt, horizon),
  )).limit(100);
  let sent = 0;
  for (const meeting of pending) {
    const dueAt = meeting.startsAt.getTime() - meeting.reminderMinutes * 60_000;
    if (now.getTime() < dueAt) continue;
    const participantIds = (await db.select({ userId: meetingParticipants.userId })
      .from(meetingParticipants)
      .where(eq(meetingParticipants.meetingId, meeting.id)))
      .map(row => row.userId);
    const recipients = [...new Set([meeting.createdBy, ...participantIds])];
    await createNotifications(recipients.map(userId => ({
      userId,
      type: "meet" as const,
      title: `${meeting.title} starts soon`,
      body: meeting.mode === "in_person" ? `${meeting.location} · ${meeting.startsAt.toLocaleString("en-GB")}` : `Open n2 to join · ${meeting.startsAt.toLocaleString("en-GB")}`,
      entityType: "meeting",
      entityId: meeting.id,
      href: meeting.mode === "in_person" ? "/?view=meet" : `/meet/${meeting.id}`,
    })));
    await db.update(meetings).set({ reminderSentAt: now }).where(and(eq(meetings.id, meeting.id), isNull(meetings.reminderSentAt)));
    sent += recipients.length;
  }
  return NextResponse.json({ meetings: pending.length, notifications: sent });
}
