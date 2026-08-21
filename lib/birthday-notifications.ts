import "server-only";
import { and, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { birthdayEvents, notifications, privacySettings, timelinePosts, users } from "@/db/schema";
import { birthdayMatches, getUkDateParts } from "@/lib/birthday-dates";

export const BIRTHDAY_ARTWORK_URL = "/brand/n2-birthday-project.png";

function firstName(member: { firstName: string | null; name: string | null }) {
  return member.firstName?.trim() || member.name?.trim().split(/\s+/)[0] || "Your connection";
}

export async function sendBirthdayNotifications(now = new Date()) {
  const db = getDb();
  const today = getUkDateParts(now);
  const celebrationDate = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
  const candidates = await db.select({
    id: users.id,
    firstName: users.firstName,
    name: users.name,
    dateOfBirth: users.dateOfBirth,
    ageBand: users.ageBand,
    birthdayCelebrationsEnabled: privacySettings.birthdayCelebrationsEnabled,
    birthdayFeedPostsEnabled: privacySettings.birthdayFeedPostsEnabled,
  }).from(users)
    .leftJoin(privacySettings, eq(privacySettings.userId, users.id))
    .where(and(
      eq(users.status, "active"),
      isNotNull(users.emailVerified),
      isNotNull(users.onboardingCompletedAt),
      isNotNull(users.dateOfBirth),
      or(
        eq(privacySettings.birthdayCelebrationsEnabled, true),
        eq(privacySettings.birthdayFeedPostsEnabled, true),
        and(isNull(privacySettings.userId), ne(users.ageBand, "teen_16_17")),
      ),
    ));

  let events = 0;
  let delivered = 0;
  let posts = 0;
  for (const member of candidates) {
    if (!member.dateOfBirth || !birthdayMatches(member.dateOfBirth, today.year, today.month, today.day)) continue;
    const result = await db.transaction(async tx => {
      const [event] = await tx.insert(birthdayEvents).values({
        subjectUserId: member.id,
        celebrationYear: today.year,
        celebrationDate,
      }).onConflictDoNothing().returning({ id: birthdayEvents.id });
      if (!event) return { created: false, delivered: 0, posted: false };

      const notificationEnabled = member.birthdayCelebrationsEnabled ?? member.ageBand !== "teen_16_17";
      const recipients = notificationEnabled ? await tx.execute<{ user_id: string }>(sql`
        select recipient.id as user_id
        from users recipient
        inner join follows outbound on outbound.follower_id = recipient.id and outbound.following_id = ${member.id}::uuid
        inner join follows inbound on inbound.follower_id = ${member.id}::uuid and inbound.following_id = recipient.id
        left join notification_preferences np on np.user_id = recipient.id
        where recipient.status = 'active'
          and recipient.email_verified is not null
          and recipient.onboarding_completed_at is not null
          and coalesce(np.followed_updates, true)
          and not exists (
            select 1 from blocks b
            where (b.blocker_id = recipient.id and b.blocked_id = ${member.id}::uuid)
               or (b.blocker_id = ${member.id}::uuid and b.blocked_id = recipient.id)
          )
      `) : [];
      const values = recipients.map(recipient => ({
        userId: recipient.user_id,
        actorId: member.id,
        type: "birthday",
        title: `It’s ${firstName(member)}’s birthday 🎉`,
        body: "Celebrate your connection and wish them a happy birthday.",
        entityType: "birthday",
        entityId: event.id,
        href: "/?view=notifications",
      }));
      if (values.length) await tx.insert(notifications).values(values);
      let postId: string | null = null;
      if (member.birthdayFeedPostsEnabled) {
        const [post] = await tx.insert(timelinePosts).values({
          authorId: member.id,
          kind: "birthday",
          body: "It’s my birthday 🎉 I’m celebrating another year of connection, creativity and possibility with n2.",
          attachmentType: "image",
          attachmentUrl: BIRTHDAY_ARTWORK_URL,
          visibility: "connections",
        }).returning({ id: timelinePosts.id });
        postId = post.id;
        await tx.update(birthdayEvents).set({ postId }).where(eq(birthdayEvents.id, event.id));
      }
      return { created: true, delivered: values.length, posted: Boolean(postId) };
    });
    if (result.created) events += 1;
    delivered += result.delivered;
    if (result.posted) posts += 1;
  }
  return { date: celebrationDate, events, notifications: delivered, posts };
}
