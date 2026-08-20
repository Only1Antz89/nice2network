import "server-only";
import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { meetingParticipants, meetings } from "@/db/schema";
import { createNotifications } from "@/lib/notifications";

export async function sendDueMeetingReminders() {
  const db = getDb();
  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const pending = await db.select().from(meetings).where(and(
    isNull(meetings.reminderSentAt),
    isNull(meetings.cancelledAt),
    gt(meetings.startsAt, now),
    lte(meetings.startsAt, horizon),
  )).limit(100);

  let sent = 0;
  for (const meeting of pending) {
    const dueAt = meeting.startsAt.getTime() - meeting.reminderMinutes * 60_000;
    if (now.getTime() < dueAt) continue;

    // Claim the reminder before delivery so simultaneous app requests cannot
    // create duplicates. A failed delivery releases the claim for a retry.
    const [claimed] = await db.update(meetings)
      .set({ reminderSentAt: now })
      .where(and(eq(meetings.id, meeting.id), isNull(meetings.reminderSentAt), isNull(meetings.cancelledAt)))
      .returning({ id: meetings.id });
    if (!claimed) continue;

    try {
      const participantIds = (await db.select({ userId: meetingParticipants.userId })
        .from(meetingParticipants)
        .where(eq(meetingParticipants.meetingId, meeting.id)))
        .map(row => row.userId);
      const recipients = [...new Set([meeting.createdBy, ...participantIds])];
      await createNotifications(recipients.map(userId => ({
        userId,
        type: "meet" as const,
        title: `${meeting.title} starts soon`,
        body: meeting.mode === "in_person"
          ? `${meeting.location} · ${meeting.startsAt.toLocaleString("en-GB")}`
          : `Open n2 to join · ${meeting.startsAt.toLocaleString("en-GB")}`,
        entityType: "meeting",
        entityId: meeting.id,
        href: meeting.mode === "in_person" ? "/?view=meet" : `/meet/${meeting.id}`,
      })));
      sent += recipients.length;
    } catch (error) {
      await db.update(meetings).set({ reminderSentAt: null }).where(eq(meetings.id, meeting.id));
      throw error;
    }
  }

  return { meetings: pending.length, notifications: sent };
}
